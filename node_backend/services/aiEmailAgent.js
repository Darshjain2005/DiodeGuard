import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import OpenAI from 'openai';
import pool from '../db.js';

// ─── Module-level state ───────────────────────────────────────────────────────
let isRunning = false;
let globalClient = null;
let pollInterval = null;

export const getAgentStatus = () => isRunning;

export const setAgentStatus = async (activate) => {
  if (activate === isRunning) return { success: true, isRunning };
  if (activate) {
    await _startAgent();
  } else {
    await _stopAgent();
  }
  return { success: true, isRunning };
};

// ─── Stop ─────────────────────────────────────────────────────────────────────
async function _stopAgent() {
  isRunning = false;

  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }

  const client = globalClient;
  globalClient = null;

  if (client) {
    try {
      // destroy() is safe even if already disconnected; logout() is not.
      client.destroy();
    } catch (_) { /* ignore */ }
  }

  console.log('[!] AI Email Agent stopped.');
}

// ─── Start ────────────────────────────────────────────────────────────────────
async function _startAgent() {
  const GMAIL_USER = process.env.GMAIL_EMAIL?.trim();
  const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD?.trim();
  const GROQ_KEY   = process.env.GROQ_API_KEY?.trim();

  if (!GMAIL_USER || !GMAIL_PASS || !GROQ_KEY) {
    console.warn('[!] AI Email Agent disabled. Missing GMAIL_EMAIL, GMAIL_APP_PASSWORD, or GROQ_API_KEY.');
    return;
  }

  isRunning = true;

  const openai = new OpenAI({
    apiKey: GROQ_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  const attemptConnect = async () => {
    if (!isRunning) return; // cancelled before we even try

    // Clean up any lingering client
    if (globalClient) {
      try { globalClient.destroy(); } catch (_) {}
      globalClient = null;
    }

    const client = new ImapFlow({
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      logger: false,
    });

    // ── Register error/close handlers BEFORE connect() ────────────────────────
    // If they were registered after, errors during connect would be unhandled.
    let reconnectScheduled = false;

    const scheduleReconnect = (reason) => {
      if (reconnectScheduled || !isRunning) return;
      reconnectScheduled = true;
      clearInterval(pollInterval);
      pollInterval = null;
      console.warn(`[!] AI Email Agent reconnecting in 30s (reason: ${reason})`);
      setTimeout(() => { if (isRunning) attemptConnect(); }, 30_000);
    };

    client.on('error', (err) => {
      const code = err.code ?? err.message ?? String(err);
      console.error('[!] AI Email Agent IMAP error:', code);
      scheduleReconnect(code);
    });

    client.on('close', () => {
      scheduleReconnect('connection closed');
    });

    try {
      await client.connect();

      if (!isRunning) {
        // Was stopped while connecting — close cleanly
        try { client.destroy(); } catch (_) {}
        return;
      }

      globalClient = client;
      console.log('[+] AI Email Agent connected to IMAP server.');

      // First check immediately, then poll every 60s
      await checkMails(client, openai);
      pollInterval = setInterval(() => checkMails(client, openai), 60_000);

    } catch (err) {
      const errMsg = err.response ?? err.message ?? String(err);
      const isAuth = typeof errMsg === 'string' && errMsg.includes('Invalid credentials');

      if (isAuth) {
        console.error(
          '[!] AI Email Agent: Gmail authentication FAILED.\n' +
          '    The App Password is invalid or has been revoked.\n' +
          '    Update GMAIL_APP_PASSWORD in backend/.env and restart.'
        );
        isRunning = false;
        return;
      }

      console.error('[!] AI Email Agent failed to connect:', errMsg);
      scheduleReconnect(errMsg);
    }
  };

  await attemptConnect();
}

// ─── Mail processing ──────────────────────────────────────────────────────────
async function checkMails(client, openai) {
  if (!isRunning) return;

  let lock;
  try {
    lock = await client.getMailboxLock('INBOX');
    console.log('Checking for unread emails...');

    const messages = client.fetch({ seen: false }, { uid: true, source: true });

    for await (const message of messages) {
      if (!isRunning) break;

      console.log(`Processing message UID: ${message.uid}`);

      const parsed  = await simpleParser(message.source);
      const subject = parsed.subject || 'No Subject';
      const sender  = parsed.from?.text || 'Unknown Sender';
      const body    = parsed.text || parsed.textAsHtml || '';

      const completion = await openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You are an email content classifier. Your job is to detect spam and phishing emails. ' +
              'IMPORTANT: Judge based on the MESSAGE CONTENT ONLY — subject line and body. ' +
              'Do NOT use the sender address to decide. ' +
              'Look for: urgent/threatening language, requests for money or credentials, suspicious links, ' +
              'lottery/prize scams, impersonation, misleading claims, unsolicited offers. ' +
              'Respond with ONLY one word: "Spam" or "Safe". No explanation.',
          },
          {
            role: 'user',
            content: `Subject: ${subject}\n\nBody:\n${body.substring(0, 2000)}`,
          },
        ],
      });

      const raw            = completion.choices[0].message.content.trim();
      const classification = raw.toLowerCase().includes('spam') ? 'Spam' : 'Safe';
      console.log(`Email from ${sender} | Subject: "${subject}" → ${classification}`);

      // Use the email's real sent date; fall back to now
      const receivedAt = parsed.date ? new Date(parsed.date) : new Date();

      // Use Message-ID header for deduplication — same email won't be stored twice
      // even if the \Seen flag doesn't persist between agent restarts.
      const messageId = parsed.messageId || null;

      const insertResult = await pool.query(
        `INSERT INTO email_logs (message_id, sender, subject, classification, confidence, received_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (message_id) DO NOTHING
         RETURNING id`,
        [messageId, sender, subject, classification, classification === 'Spam' ? 'High' : 'Low', receivedAt]
      );

      if (insertResult.rowCount === 0) {
        console.log(`Skipping duplicate email: "${subject}" (already in DB)`);
        // Still mark as seen so it won't be fetched again
        await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
        continue;
      }

      if (classification === 'Spam') {
        try {
          await client.messageMove(message.uid, '[Gmail]/Spam', { uid: true });
          console.log(`Moved UID ${message.uid} to Spam folder.`);
        } catch (moveErr) {
          console.error('Could not move to spam:', moveErr.message);
        }
      }

      await client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });
    }

  } catch (err) {
    console.error('Error during mail fetching/processing:', err.message);
  } finally {
    if (lock) lock.release();
  }
}
