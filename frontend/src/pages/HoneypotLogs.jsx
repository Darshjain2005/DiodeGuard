import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, RefreshCw } from 'lucide-react';

/* ── ALL ORIGINAL DATA (unchanged) ── */
const mockIPs = ['192.168.1.14', '45.33.22.1', '104.22.5.3', '8.8.8.8', '110.43.2.1'];
const mockActions = [
  { text: 'Incoming request blocked at edge firewall', color: 'text-yellow-400', raw: '#facc15', type: 'block' },
  { text: 'Decoy response sent mapping fake internal directory', color: 'text-cyber-neonCyan', raw: '#00f3ff', type: 'decoy' },
  { text: 'SQL Injection payload dropped', color: 'text-cyber-neonRed', raw: '#ff003c', type: 'inject' },
  { text: 'Port scan detected and tar-pitted', color: 'text-orange-500', raw: '#f97316', type: 'scan' },
  { text: 'Brute force credential harvested into false DB', color: 'text-cyber-neonGreen', raw: '#39ff14', type: 'cred' },
];

const generateRandomLog = () => ({
  ip: mockIPs[Math.floor(Math.random() * mockIPs.length)],
  ...mockActions[Math.floor(Math.random() * mockActions.length)],
  time: new Date().toISOString().split('T')[1].slice(0, 11),
  id: Math.random().toString(36).slice(2),
  port: [22, 80, 443, 3306, 8080, 6379][Math.floor(Math.random() * 6)],
  method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)],
  bytes: Math.floor(Math.random() * 4096) + 64,
});

/* ─────────────────────────────────────────
   BACKGROUND — world map attack lines + radar (unchanged)
───────────────────────────────────────── */
const HoneypotBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId, t = 0;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const origins = [
      { x: 0.12, y: 0.38 }, { x: 0.18, y: 0.28 }, { x: 0.22, y: 0.55 },
      { x: 0.55, y: 0.22 }, { x: 0.60, y: 0.35 }, { x: 0.65, y: 0.48 },
      { x: 0.72, y: 0.30 }, { x: 0.80, y: 0.42 }, { x: 0.85, y: 0.25 },
      { x: 0.35, y: 0.65 }, { x: 0.45, y: 0.72 }, { x: 0.90, y: 0.60 },
    ];

    const TARGET = { x: 0.5, y: 0.46 };

    class Packet {
      constructor() { this.reset(); }
      reset() {
        const o = origins[Math.floor(Math.random() * origins.length)];
        this.ox = o.x; this.oy = o.y;
        this.tx = TARGET.x; this.ty = TARGET.y;
        this.progress = 0;
        this.speed = 0.003 + Math.random() * 0.004;
        this.color = mockActions[Math.floor(Math.random() * mockActions.length)].raw;
        this.size = Math.random() * 2 + 1.2;
        this.cx = (o.x + TARGET.x) / 2 + (Math.random() - 0.5) * 0.25;
        this.cy = (o.y + TARGET.y) / 2 - 0.12 - Math.random() * 0.12;
      }
      bezier(t) {
        const mt = 1 - t;
        return {
          x: mt * mt * this.ox + 2 * mt * t * this.cx + t * t * this.tx,
          y: mt * mt * this.oy + 2 * mt * t * this.cy + t * t * this.ty,
        };
      }
      update() { this.progress += this.speed; if (this.progress >= 1) this.reset(); }
      draw(ctx, W, H) {
        const pos = this.bezier(this.progress);
        const prev = this.bezier(Math.max(0, this.progress - 0.06));
        ctx.beginPath();
        ctx.moveTo(prev.x * W, prev.y * H);
        ctx.lineTo(pos.x * W, pos.y * H);
        ctx.strokeStyle = this.color + '55';
        ctx.lineWidth = this.size * 0.6;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(pos.x * W, pos.y * H, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const packets = Array.from({ length: 22 }, () => {
      const p = new Packet();
      p.progress = Math.random();
      return p;
    });

    const routes = origins.map(o => ({
      ox: o.x, oy: o.y,
      cx: (o.x + TARGET.x) / 2 + (Math.random() - 0.5) * 0.2,
      cy: (o.y + TARGET.y) / 2 - 0.1 - Math.random() * 0.1,
    }));

    const orbs = [
      { x: 0.05, y: 0.1, hue: 0, size: 0.28 },
      { x: 0.92, y: 0.15, hue: 20, size: 0.22 },
      { x: 0.08, y: 0.85, hue: 130, size: 0.18 },
      { x: 0.88, y: 0.82, hue: 180, size: 0.16 },
    ];

    const nodes = Array.from({ length: 16 }, () => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0002,
      vy: (Math.random() - 0.5) * 0.0002,
      phase: Math.random() * Math.PI * 2,
    }));

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#03060f';
      ctx.fillRect(0, 0, W, H);

      orbs.forEach((o, i) => {
        const pulse = Math.sin(t * 0.006 + i * 1.6) * 0.3 + 0.7;
        const r = o.size * Math.min(W, H) * pulse;
        const gx = o.x * W, gy = o.y * H;
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
        g.addColorStop(0, `hsla(${o.hue},100%,55%,0.07)`);
        g.addColorStop(0.5, `hsla(${o.hue},100%,50%,0.025)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill();
      });

      for (let x = 0; x < W; x += 40) {
        for (let y = 0; y < H; y += 40) {
          const a = 0.025 + Math.sin(t * 0.012 + x * 0.008 + y * 0.008) * 0.012;
          ctx.beginPath(); ctx.arc(x, y, 0.8, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,60,0,${a})`; ctx.fill();
        }
      }

      routes.forEach(r => {
        ctx.beginPath();
        ctx.moveTo(r.ox * W, r.oy * H);
        ctx.quadraticCurveTo(r.cx * W, r.cy * H, TARGET.x * W, TARGET.y * H);
        ctx.strokeStyle = 'rgba(255,60,0,0.04)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      origins.forEach(o => {
        const pulse = Math.sin(t * 0.04 + o.x * 10) * 0.4 + 0.6;
        ctx.beginPath();
        ctx.arc(o.x * W, o.y * H, 2.5 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,60,0,${0.3 * pulse})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(o.x * W, o.y * H, 6 * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,60,0,${0.12 * pulse})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });

      const tpulse = Math.sin(t * 0.05) * 0.4 + 0.6;
      const tx = TARGET.x * W, ty = TARGET.y * H;
      for (let ring = 1; ring <= 3; ring++) {
        ctx.beginPath();
        ctx.arc(tx, ty, ring * 18 * tpulse, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,243,255,${0.08 / ring})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      const tg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 16);
      tg.addColorStop(0, 'rgba(0,243,255,0.35)');
      tg.addColorStop(0.5, 'rgba(0,243,255,0.1)');
      tg.addColorStop(1, 'rgba(0,243,255,0)');
      ctx.fillStyle = tg;
      ctx.beginPath(); ctx.arc(tx, ty, 16, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#00f3ff'; ctx.shadowColor = '#00f3ff'; ctx.shadowBlur = 12; ctx.fill();
      ctx.shadowBlur = 0;

      packets.forEach(p => { p.update(); p.draw(ctx, W, H); });

      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = (nodes[i].x - nodes[j].x) * W;
          const dy = (nodes[i].y - nodes[j].y) * H;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255,60,0,${(1 - dist / 120) * 0.04})`;
            ctx.lineWidth = 0.4;
            ctx.moveTo(nodes[i].x * W, nodes[i].y * H);
            ctx.lineTo(nodes[j].x * W, nodes[j].y * H);
            ctx.stroke();
          }
        }
      }

      t++;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
    />
  );
};

/* ─────────────────────────────────────────
   STAT CHIP (unchanged)
───────────────────────────────────────── */
const StatChip = ({ label, value, color }) => (
  <div
    className="flex flex-col items-center px-4 py-1.5"
    style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
  >
    <span className="font-mono font-black" style={{ fontSize: 14, color, textShadow: `0 0 10px ${color}55` }}>
      {value}
    </span>
    <span className="font-mono uppercase tracking-widest" style={{ fontSize: 10, color: '#334155', marginTop: 1 }}>
      {label}
    </span>
  </div>
);

/* ─────────────────────────────────────────
   LOG ROW (unchanged)
───────────────────────────────────────── */
const LogRow = ({ log, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -12, backgroundColor: 'rgba(255,255,255,0.04)' }}
    animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(255,255,255,0)' }}
    transition={{ duration: 0.35, ease: 'easeOut' }}
    className="grid font-mono group hover:bg-white/[0.02] transition-colors duration-150 rounded-lg px-2"
    style={{
      gridTemplateColumns: '110px 120px 50px 60px 80px 1fr',
      gap: '0 12px',
      paddingTop: 6,
      paddingBottom: 6,
      fontSize: 12,
    }}
  >
    <span style={{ color: '#334155' }}>[{log.time}]</span>
    <span style={{ color: '#475569' }}>{log.ip}</span>
    <span style={{ color: '#334155' }}>:{log.port}</span>
    <span style={{ color: '#1e3a5f', fontWeight: 700 }}>{log.method}</span>
    <span style={{ color: '#1e293b' }}>{log.bytes}B</span>
    <span style={{ color: log.raw, fontWeight: 600 }}>{log.text}</span>
  </motion.div>
);

/* ─────────────────────────────────────────
   NEW: AI INSIGHT PANEL
───────────────────────────────────────── */
const AIInsightPanel = ({ logs, counts }) => {
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState(null);
  const [threatLevel, setThreatLevel] = useState(null);

  const analyze = useCallback(async () => {
    if (logs.length < 5 || loading) return;
    setLoading(true);

    const breakdown = logs.reduce((acc, l) => {
      acc[l.type] = (acc[l.type] || 0) + 1;
      return acc;
    }, {});

    const ipHits = logs.reduce((acc, l) => {
      acc[l.ip] = (acc[l.ip] || 0) + 1;
      return acc;
    }, {});

    const topIPs = Object.entries(ipHits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([ip, hits]) => `${ip} (${hits} hits)`)
      .join(', ');

    const summary = {
      total: counts.total,
      blocked: counts.blocked,
      injections: counts.injected,
      credsCaptured: counts.captured,
      attackBreakdown: breakdown,
      topAttackers: topIPs,
      recentSample: logs.slice(0, 8).map(l => `${l.ip} — ${l.text}`),
    };

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are a senior threat intelligence analyst reviewing honeypot logs. 
Respond ONLY with valid JSON — no markdown, no preamble:
{
  "threatLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "summary": "2-3 sentence overall assessment",
  "topThreat": "The single most dangerous pattern observed",
  "recommendation": "One specific, actionable mitigation step",
  "attackerProfile": "Brief characterization of the attacker(s)"
}`,
          messages: [{
            role: 'user',
            content: `Analyze this honeypot telemetry:\n${JSON.stringify(summary, null, 2)}`,
          }],
        }),
      });

      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setInsight(parsed);
        setThreatLevel(parsed.threatLevel);
      }
    } catch (e) {
      setInsight({ error: 'AI analysis failed. Check console.' });
    }

    setLastAnalyzed(new Date().toLocaleTimeString());
    setLoading(false);
  }, [logs, counts, loading]);

  /* auto-analyze every 30 seconds once we have enough data */
  useEffect(() => {
    if (logs.length >= 10) analyze();
    const interval = setInterval(() => {
      if (logs.length >= 10) analyze();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const levelConfig = {
    LOW: { color: '#39ff14', bg: 'rgba(57,255,20,0.06)', border: 'rgba(57,255,20,0.2)' },
    MEDIUM: { color: '#f97316', bg: 'rgba(249,115,22,0.06)', border: 'rgba(249,115,22,0.2)' },
    HIGH: { color: '#ff003c', bg: 'rgba(255,0,60,0.06)', border: 'rgba(255,0,60,0.2)' },
    CRITICAL: { color: '#ff003c', bg: 'rgba(255,0,60,0.1)', border: 'rgba(255,0,60,0.4)' },
  };
  const lc = levelConfig[threatLevel] || levelConfig.LOW;

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.25 }}
      className="flex flex-col gap-3"
    >
      {/* threat level badge */}
      {threatLevel && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-between px-4 py-3 rounded-2xl"
          style={{ background: lc.bg, border: `1px solid ${lc.border}` }}
        >
          <div>
            <p className="font-mono uppercase tracking-widest" style={{ fontSize: 10, color: lc.color, opacity: 0.7 }}>
              Threat Level
            </p>
            <p className="font-display font-black uppercase tracking-widest" style={{ fontSize: 18, color: lc.color, textShadow: `0 0 20px ${lc.color}55` }}>
              {threatLevel}
            </p>
          </div>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="rounded-full"
            style={{ width: 10, height: 10, background: lc.color, boxShadow: `0 0 10px ${lc.color}` }}
          />
        </motion.div>
      )}

      {/* AI insight card */}
      <div
        className="flex-1 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(5,9,18,0.88)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <BrainCircuit size={13} style={{ color: '#a855f7' }} />
            <span className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: '#475569' }}>
              AI Threat Intelligence
            </span>
          </div>
          <div className="flex items-center gap-2">
            {lastAnalyzed && (
              <span className="font-mono" style={{ fontSize: 10, color: '#334155' }}>
                {lastAnalyzed}
              </span>
            )}
            <button
              onClick={analyze}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-bold uppercase tracking-widest transition-all"
              style={{
                fontSize: 10,
                background: loading ? 'rgba(168,85,247,0.04)' : 'rgba(168,85,247,0.08)',
                border: '1px solid rgba(168,85,247,0.2)',
                color: loading ? '#475569' : '#a855f7',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              <RefreshCw size={9} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              {loading ? 'Analyzing' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-2"
              >
                {['Collecting telemetry...', 'Correlating attack vectors...', 'Generating threat assessment...'].map((msg, i) => (
                  <motion.div
                    key={msg}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.4 }}
                    className="flex items-center gap-2 font-mono"
                    style={{ fontSize: 12, color: '#475569' }}
                  >
                    <motion.span
                      style={{ width: 4, height: 4, borderRadius: '50%', background: '#a855f7', display: 'block', flexShrink: 0 }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                    {msg}
                  </motion.div>
                ))}
              </motion.div>
            ) : insight && !insight.error ? (
              <motion.div
                key="insight"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3"
              >
                {[
                  { label: 'Assessment', value: insight.summary, color: '#94a3b8' },
                  { label: 'Top threat', value: insight.topThreat, color: '#ff003c' },
                  { label: 'Attacker profile', value: insight.attackerProfile, color: '#f97316' },
                  { label: 'Recommendation', value: insight.recommendation, color: '#39ff14' },
                ].map(({ label, value, color }) => value && (
                  <div key={label}>
                    <p className="font-mono uppercase tracking-widest mb-1" style={{ fontSize: 10, color: '#334155' }}>
                      {label}
                    </p>
                    <p className="font-mono leading-relaxed" style={{ fontSize: 12, color }}>
                      {value}
                    </p>
                  </div>
                ))}
              </motion.div>
            ) : insight?.error ? (
              <motion.p
                key="error"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="font-mono"
                style={{ fontSize: 12, color: '#ff003c' }}
              >
                {insight.error}
              </motion.p>
            ) : (
              <motion.p
                key="waiting"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="font-mono"
                style={{ fontSize: 12, color: '#334155' }}
              >
                Waiting for enough log data to analyze...
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* attack breakdown bars */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'rgba(5,9,18,0.88)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <p className="font-mono uppercase tracking-widest mb-4" style={{ fontSize: 12, color: '#475569' }}>
          Attack Breakdown
        </p>
        {[
          { label: 'Edge Blocked', color: '#facc15', pct: 28 },
          { label: 'Decoy Served', color: '#00f3ff', pct: 35 },
          { label: 'SQLi Dropped', color: '#ff003c', pct: 18 },
          { label: 'Port Scan', color: '#f97316', pct: 12 },
          { label: 'Creds Captured', color: '#39ff14', pct: 7 },
        ].map(({ label, color, pct }) => (
          <div key={label} className="mb-3">
            <div className="flex justify-between mb-1">
              <span className="font-mono" style={{ fontSize: 11, color: '#475569' }}>{label}</span>
              <span className="font-mono font-bold" style={{ fontSize: 11, color }}>{pct}%</span>
            </div>
            <div className="rounded-full overflow-hidden" style={{ height: 3, background: 'rgba(255,255,255,0.04)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                style={{
                  height: '100%', borderRadius: 9999,
                  background: `linear-gradient(90deg, ${color}, ${color}55)`,
                  boxShadow: `0 0 6px ${color}55`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
const HoneypotLogs = () => {
  const [logs, setLogs] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    const initialLogs = Array(8).fill(null).map(() => generateRandomLog());
    setLogs(initialLogs);

    const interval = setInterval(() => {
      setLogs(prev => {
        const newLogs = [...prev, generateRandomLog()];
        if (newLogs.length > 50) return newLogs.slice(newLogs.length - 50);
        return newLogs;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const counts = {
    total: logs.length,
    blocked: logs.filter(l => l.raw === '#facc15').length,
    injected: logs.filter(l => l.raw === '#ff003c').length,
    captured: logs.filter(l => l.raw === '#39ff14').length,
  };

  return (
    <div
      className="relative w-full"
      style={{ background: '#03060f', height: '100%', minHeight: 0 }}
    >
      <HoneypotBackground />

      <div
        className="absolute inset-0 pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.65) 100%)' }}
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-col gap-3"
        style={{ height: '100%', padding: '16px 20px', minHeight: 0 }}
      >

        {/* ══ HEADER ══ */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-start justify-between"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div style={{ width: 28, height: 1, background: 'rgba(255,60,0,0.6)' }} />
              <span className="font-mono uppercase tracking-[0.22em]" style={{ fontSize: 10, color: 'rgba(255,60,0,0.6)' }}>
                Module 05 / Deception Network
              </span>
            </div>
            <h1
              className="font-display font-black tracking-tight"
              style={{ fontSize: 24, color: '#f1f5f9', letterSpacing: '-0.01em' }}
            >
              HONEYPOT
              <span style={{ color: '#ff003c', textShadow: '0 0 28px rgba(255,0,60,0.6)', marginLeft: 10 }}>
                MONITOR
              </span>
            </h1>
            <p className="font-mono mt-0.5" style={{ fontSize: 10, color: '#334155', letterSpacing: '0.1em' }}>
              LIVE DECEPTION TRAFFIC · TAR-PIT ENGINE · CREDENTIAL HARVESTING · AI THREAT INTELLIGENCE
            </p>
          </div>

          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: 'rgba(255,0,60,0.06)', border: '1px solid rgba(255,0,60,0.25)' }}
          >
            <motion.span
              className="rounded-full"
              style={{ width: 6, height: 6, background: '#ff003c', display: 'block', boxShadow: '0 0 8px #ff003c' }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <span className="font-mono font-bold uppercase tracking-widest" style={{ fontSize: 11, color: '#ff003c' }}>
              Live Feed
            </span>
          </div>
        </motion.div>

        {/* ══ STATS STRIP ══ */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex rounded-2xl overflow-hidden shrink-0"
          style={{
            background: 'rgba(5,9,18,0.85)',
            border: '1px solid rgba(255,255,255,0.06)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <StatChip label="Total Events" value={counts.total} color="#00f3ff" />
          <StatChip label="Blocked" value={counts.blocked} color="#facc15" />
          <StatChip label="Injections Stopped" value={counts.injected} color="#ff003c" />
          <StatChip label="Creds Captured" value={counts.captured} color="#39ff14" />
          <div className="flex-1 flex items-center justify-end px-5 gap-3">
            {[
              { label: 'Decoy Nodes', val: '12' },
              { label: 'Active Traps', val: '4' },
              { label: 'Refresh', val: '1.2s' },
            ].map(({ label, val }) => (
              <div key={label} className="text-right">
                <p className="font-mono font-bold" style={{ fontSize: 11, color: '#334155' }}>{val}</p>
                <p className="font-mono uppercase tracking-widest" style={{ fontSize: 10, color: '#475569' }}>{label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ══ MAIN GRID — now 3 columns: log | ai insight | sidebar ══ */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px_200px] gap-3 min-h-0 overflow-hidden">

          {/* ── TERMINAL LOG (unchanged) ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(3,5,12,0.92)',
              border: '1px solid rgba(255,255,255,0.06)',
              backdropFilter: 'blur(20px)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            <div
              className="flex items-center justify-between px-5 py-3 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  {['#ff003c', '#f59e0b', '#39ff14'].map((c, i) => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: 0.6 }} />
                  ))}
                </div>
                <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.06)' }} />
                <span className="font-mono uppercase tracking-widest" style={{ fontSize: 11, color: '#475569' }}>
                  honeypot@cybershield:~$
                </span>
              </div>
              <div className="flex items-center gap-3">
                {[
                  { label: 'Block', color: '#facc15' },
                  { label: 'Decoy', color: '#00f3ff' },
                  { label: 'Inject', color: '#ff003c' },
                  { label: 'Brute', color: '#39ff14' },
                ].map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-1">
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'block' }} />
                    <span className="font-mono" style={{ fontSize: 10, color: '#475569', letterSpacing: '0.1em' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="grid px-4 py-2 shrink-0"
              style={{
                gridTemplateColumns: '110px 120px 50px 60px 80px 1fr',
                gap: '0 12px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              {['TIMESTAMP', 'SOURCE IP', 'PORT', 'METHOD', 'SIZE', 'DECOY ACTION'].map(h => (
                <span key={h} className="font-mono uppercase tracking-widest" style={{ fontSize: 10, color: '#475569' }}>{h}</span>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-2 custom-scrollbar space-y-0.5">
              <AnimatePresence initial={false}>
                {logs.map((log, idx) => (
                  <LogRow key={log.id} log={log} index={idx} />
                ))}
              </AnimatePresence>
              <div ref={bottomRef} className="h-2" />
            </div>

            <div
              className="flex items-center gap-2 px-4 py-2 shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
            >
              <span className="font-mono font-bold" style={{ fontSize: 12, color: '#39ff14' }}>$</span>
              <span className="font-mono" style={{ fontSize: 11, color: '#334155' }}>
                tail -f /var/log/honeypot/decoy.log
              </span>
              <motion.span
                className="inline-block"
                style={{ width: 6, height: 12, background: '#39ff14', marginLeft: 2 }}
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            </div>
          </motion.div>

          {/* ── NEW: AI INSIGHT PANEL ── */}
          <AIInsightPanel logs={logs} counts={counts} />

          {/* ── RIGHT SIDEBAR ── */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-4"
          >
            {/* Top attacker IPs */}
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(5,9,18,0.88)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <p className="font-mono uppercase tracking-widest mb-3" style={{ fontSize: 12, color: '#475569' }}>
                Top Attacker IPs
              </p>
              {mockIPs.map((ip, i) => (
                <div
                  key={ip}
                  className="flex items-center justify-between py-2 font-mono"
                  style={{ borderBottom: i < mockIPs.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#ff003c', display: 'block', opacity: 0.7 }} />
                    <span style={{ fontSize: 12, color: '#475569' }}>{ip}</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#334155' }}>
                    {Math.floor(Math.random() * 80 + 10)} hits
                  </span>
                </div>
              ))}
            </div>

            {/* Decoy services */}
            <div
              className="flex-1 rounded-2xl p-4"
              style={{
                background: 'rgba(5,9,18,0.88)',
                border: '1px solid rgba(255,255,255,0.06)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <p className="font-mono uppercase tracking-widest mb-3" style={{ fontSize: 12, color: '#475569' }}>
                Active Decoy Services
              </p>
              {[
                { name: 'SSH Honeypot', port: ':22', status: 'ACTIVE' },
                { name: 'MySQL Decoy', port: ':3306', status: 'ACTIVE' },
                { name: 'Redis Trap', port: ':6379', status: 'ACTIVE' },
                { name: 'HTTP Tar-pit', port: ':8080', status: 'ACTIVE' },
              ].map(({ name, port, status }) => (
                <div
                  key={name}
                  className="flex items-center justify-between py-2.5 px-3 rounded-xl mb-2"
                  style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div>
                    <p className="font-mono font-bold" style={{ fontSize: 12, color: '#475569' }}>{name}</p>
                    <p className="font-mono" style={{ fontSize: 12, color: '#334155' }}>{port}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <motion.span
                      style={{ width: 5, height: 5, borderRadius: '50%', background: '#39ff14', display: 'block', boxShadow: '0 0 5px #39ff14' }}
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: Math.random() }}
                    />
                    <span className="font-mono font-bold" style={{ fontSize: 11, color: '#39ff14', letterSpacing: '0.1em' }}>{status}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ══ FOOTER ══ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between shrink-0"
          style={{ paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <span className="font-mono uppercase tracking-[0.2em]" style={{ fontSize: 10, color: '#334155' }}>
            CyberShield AI · Honeypot Deception Engine v2
          </span>
          <div className="flex items-center gap-4">
            {[
              { label: 'Tar-pit Active', active: true },
              { label: 'Decoy Serving', active: true },
              { label: 'AI Threat Intel', active: true },
            ].map(({ label, active }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: active ? '#39ff14' : '#ff003c', display: 'block' }} />
                <span className="font-mono" style={{ fontSize: 10, color: '#334155', letterSpacing: '0.12em' }}>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default HoneypotLogs;
