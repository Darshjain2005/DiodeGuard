import { GoogleGenerativeAI as GenAI } from '@google/generative-ai';

// ─────────────────────────────────────────────────────────────────────────────
// Gemini deepfake detection helpers
// Primary model: gemini-1.5-flash (good balance of speed + vision capability)
// ─────────────────────────────────────────────────────────────────────────────

const GEMINI_MODEL = 'gemini-2.5-flash';

const DEEPFAKE_IMAGE_PROMPT =
  'You are an elite digital forensics AI specialising in detecting AI-generated and AI-manipulated images of ALL types. ' +
  'First, identify the image type (e.g. photograph, technical diagram, illustration, artwork, infographic, screenshot). ' +
  'Then apply the FULL checklist relevant to that type:\n\n' +

  '── FOR PHOTOGRAPHS / REALISTIC IMAGES ──\n' +
  '• Unnatural skin/hair/eye rendering, waxy or overly smooth textures\n' +
  '• Distorted ears, teeth, hands, fingers (common GAN/diffusion failure points)\n' +
  '• Inconsistent lighting direction or impossible shadows on faces/objects\n' +
  '• Blurry or warped background / unnatural bokeh artifacts\n' +
  '• GAN grid-pattern noise, diffusion checkerboard artifacts in solid areas\n' +
  '• Asymmetric facial features, misaligned pupils, floating hairlines\n' +
  '• Background figures/objects with missing limbs, merged bodies, or text gibberish\n' +
  '• Overly perfect skin, unreal eyes, or surreal aesthetic matching Midjourney / DALL-E / Stable Diffusion\n\n' +

  '── FOR DIAGRAMS / INFOGRAPHICS / TECHNICAL ILLUSTRATIONS ──\n' +
  '• Computationally perfect gradients, spacing, and alignment with zero manual variation\n' +
  '• Icon or element styles that are slightly inconsistent with each other (mixed AI-generated assets)\n' +
  '• Text inside the image that is slightly garbled, misspelled, or uses hallucinated/nonsense words\n' +
  '• Labels, arrows, or connectors that do not logically align with the content they describe\n' +
  '• Aesthetic style precisely matching known AI image generation tools (e.g. Midjourney flat-design style, DALL-E illustration style)\n' +
  '• Overly "polished" look with no hand-drawn variation — perfectly uniform stroke weights, shadows, and colors throughout\n' +
  '• Elements that are semantically correct on the surface but logically nonsensical on close inspection\n\n' +

  '── FOR ARTWORK / ILLUSTRATIONS / DIGITAL ART ──\n' +
  '• Signature aesthetic of generative AI tools: Midjourney, DALL-E, Stable Diffusion, Firefly, Ideogram, Leonardo.ai\n' +
  '• Surreal or hyper-detailed compositions that are physically impossible\n' +
  '• Inconsistent art style within the same image (mixed brushstroke styles, lighting models)\n' +
  '• Background elements that dissolve into mush, repeated patterns, or mirrored artifacts\n' +
  '• Text rendered as decorative noise (AI struggles to render legible text accurately)\n\n' +

  'IMPORTANT RULES:\n' +
  '• Do NOT dismiss an image as authentic just because it lacks human faces.\n' +
  '• Diagrams, illustrations, and artwork CAN be AI-generated — apply the relevant checklist above.\n' +
  '• Set "isAIGenerated" to true if the image shows ANY signs of AI generation or manipulation.\n' +
  '• Set "isAIGenerated" to false ONLY if you are confident the image is fully human-created with zero AI indicators.\n\n' +

  'Respond ONLY with valid JSON (no markdown, no code block):\n' +
  '{"isAIGenerated": true/false, "confidence": 0-100, "imageType": "photograph/diagram/illustration/artwork/other", "explanation": "Detailed findings with specific visual evidence. Wrap key findings in <b>bold</b>."}';

const DEEPFAKE_VIDEO_PROMPT =
  'You are an elite digital forensics AI specialising in deepfake and AI-generated video detection. ' +
  'Carefully examine this video frame-by-frame for ALL of the following indicators:\n' +
  '• Face-swap artifacts — boundary flickering at the face edge / neck / hairline\n' +
  '• Temporal inconsistency — features that change unnaturally between frames\n' +
  '• Unnatural eye blinking patterns or gaze direction misalignment\n' +
  '• Lip-sync errors — mouth movement does not naturally match what is seen (e.g. a baby speaking adult words)\n' +
  '• Hair/ear/teeth rendering typical of generative AI (GAN/diffusion)\n' +
  '• Lighting that does not match scene or flickers without cause\n' +
  '• Any impossible or unnatural action that could only result from AI manipulation\n' +
  '• Known AI-video tool signatures: RunwayML, Sora, Synthesia, HeyGen, D-ID, Pika, Kling, Luma AI\n\n' +
  'IMPORTANT: Set "isDeepfake" to true if the video shows ANY signs of AI generation, deepfake manipulation, ' +
  'or synthetic audio/video — including lip-sync manipulation, voice cloning, or impossible actions created by AI. ' +
  'Set it to false ONLY if the video is completely authentic with zero AI manipulation indicators.\n\n' +
  'Respond ONLY with valid JSON (no markdown, no code block):\n' +
  '{"isDeepfake": true/false, "confidence": 0-100, "explanation": "Detailed findings with specific visual evidence. Wrap key findings in <b>bold</b>."}';

// ─── Helper: extract JSON safely from Gemini text response ─────────────────
const parseGeminiJSON = (text) => {
  // Strip markdown code fences if present
  const cleaned = text.replace(/```json|```/gi, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Gemini returned non-JSON: ${text.substring(0, 200)}`);
  
  const rawJson = match[0];
  try {
    return JSON.parse(rawJson);
  } catch (err) {
    console.warn(`[Gemini] Standard JSON parse failed (${err.message}), attempting fallback regex extraction...`);
    // Fallback: If Gemini produces unescaped quotes or newlines that break JSON.parse,
    // manually extract the fields using regex
    const isAI = /"(?:isAIGenerated|isDeepfake|isPhishing|isAI)"\s*:\s*true/i.test(rawJson);
    
    let confidence = 50;
    const confMatch = rawJson.match(/"confidence"\s*:\s*(\d+)/i);
    if (confMatch) confidence = parseInt(confMatch[1], 10);
    
    let explanation = "Explanation partially parsed due to invalid AI JSON formatting.";
    // Try to grab everything after the explanation key
    const expMatch = rawJson.match(/"explanation"\s*:\s*"([\s\S]*?)"?\s*\}/i);
    if (expMatch) explanation = expMatch[1].trim();

    return {
      isAIGenerated: isAI,
      isDeepfake: isAI,
      confidence,
      explanation
    };
  }
};

// ─── Semantic override: catches cases where the JSON flag contradicts the explanation ─
const NEGATION_WORDS = [
  'no ', 'not ', 'none ', 'never ', 'without ', 'absence ', 'absent ',
  'lack ', 'lacks ', 'cannot ', "isn't", "aren't", "doesn't", "don't",
  'fails to', 'unable to', 'zero ', 'undetected', 'no discernible',
  'no visible', 'no evidence', 'no sign', 'no indication',
];

const semanticOverride = (flagValue, confidence, explanation) => {
  if (flagValue) return true; // already true, no override needed
  if (confidence < 60) return false; // low-confidence results — trust the flag

  const lowerExp = explanation.toLowerCase();

  // ── Quick early-exit: if the explanation is clearly a "clean" verdict ──────
  const CLEAN_SIGNALS = [
    'no indicators of ai', 'no signs of ai', 'no evidence of ai',
    'no indicators of deepfake', 'no signs of deepfake', 'no evidence of deepfake',
    'no indicators of manipulation', 'no signs of manipulation', 'no evidence of manipulation',
    'no ai generation', 'completely authentic', 'fully authentic', 'entirely authentic',
    'no deepfake signatures', 'no manipulation detected', 'no ai signatures',
    'revealed no indicators', 'revealed no signs', 'revealed no evidence',
    'found no indicators', 'found no signs', 'found no evidence',
    'zero ai indicators', 'zero deepfake', 'zero manipulation',
    'natural and consistent', 'appear natural', 'appears natural',
    'consistent with natural', 'consistent with authentic',
  ];

  const hasCleanSignal = CLEAN_SIGNALS.some(phrase => lowerExp.includes(phrase));
  if (hasCleanSignal) {
    console.log(`[Gemini] Semantic override skipped: explanation contains clean verdict signal (conf=${confidence}%)`);
    return false;
  }

  // ── Only match AFFIRMATIVE indicators — phrases that assert presence of AI ─
  const AFFIRMATIVE_INDICATORS = [
    'is ai-generated', 'is ai generated', 'is manipulated', 'is synthetic', 'is a deepfake',
    'appears to be ai', 'appears to be manipulated', 'appears to be synthetic',
    'appears ai-generated', 'appears deepfaked', 'appears to be generated',
    'clear indicator', 'clear evidence of', 'definitive indicator', 'definitive evidence',
    'consistent with ai', 'consistent with deepfake', 'consistent with synthetic',
    'hallmark of ai', 'hallmark of deepfake', 'hallmark of generative',
    'created by ai', 'generated by ai', 'generated by a model',
    'likely ai-generated', 'likely generated', 'strongly suggests ai', 'strongly indicates',
    'significant indicator', 'significant evidence',
    'matches midjourney', 'matches dall-e', 'matches stable diffusion',
    'matches sora', 'matches synthesia', 'matches heyGen', 'matches d-id',
    'runwayml signature', 'sora signature', 'pika style',
    'lip-sync error detected', 'voice cloning detected', 'voice clone identified',
    'face-swap artifact detected', 'face swap artifact found',
    'talking baby', 'talking infant',
    'physically impossible', 'could not naturally occur',
    'diffusion artifact present', 'gan artifact present', 'checkerboard artifact',
    'garbled text present', 'hallucinated text', 'nonsense text found',
    'logically nonsensical', 'logically inconsistent',
    'computationally perfect', 'computationally generated',
  ];

  // Split into individual sentences / bullet clauses
  const sentences = lowerExp
    .split(/[.!?\n*•\-]+/)
    .map(s => s.trim())
    .filter(s => s.length > 15);

  let positiveHits = 0;
  for (const sentence of sentences) {
    const matchedIndicator = AFFIRMATIVE_INDICATORS.find(kw => sentence.includes(kw.toLowerCase()));
    if (!matchedIndicator) continue;

    // Discount the hit if any negation word appears in the same sentence
    const isNegated = NEGATION_WORDS.some(neg => sentence.includes(neg));
    if (!isNegated) {
      positiveHits++;
    }
  }

  if (positiveHits >= 2) {
    console.warn(`[Gemini] Semantic override triggered: flag=false but ${positiveHits} affirmative manipulation indicators found (conf=${confidence}%)`);
    return true;
  }
  return false;
};

// ─────────────────────────────────────────────────────────────────────────────
// analyzeImageWithGemini
// Sends the image as inline base64 data (<20 MB is fine for images)
// ─────────────────────────────────────────────────────────────────────────────
export const analyzeImageWithGemini = async (imageBuffer, mimetype = 'image/jpeg', filename = 'image', modelOverride = null) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');

  const genAI = new GenAI(apiKey);
  const activeModel = modelOverride || GEMINI_MODEL;
  const model = genAI.getGenerativeModel({ model: activeModel });

  console.log(`[Gemini] Analyzing image: ${filename} (${imageBuffer.length} bytes)`);

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType: mimetype,
    },
  };

  const result = await model.generateContent([DEEPFAKE_IMAGE_PROMPT, imagePart]);
  const text = result.response.text();
  console.log(`[Gemini] Image raw response for ${filename}:`, text.substring(0, 300));

  const parsed = parseGeminiJSON(text);

  // Normalise & enrich the explanation
  // Read semantically correct field first, fall back to legacy field names
  const rawFlag = Boolean(parsed.isAIGenerated ?? parsed.isDeepfake ?? parsed.isPhishing ?? parsed.isAI ?? false);
  const isAI = semanticOverride(rawFlag, Math.min(100, Math.max(0, Number(parsed.confidence ?? 50))), parsed.explanation ?? '');
  const confidence = Math.min(100, Math.max(0, Number(parsed.confidence ?? 50)));
  const baseExplanation = parsed.explanation ?? 'No explanation provided.';

  const explanation = isAI
    ? `🚨 <b>AI-generated / deepfake image detected</b> by Gemini Vision (<i>${activeModel}</i>)\n\n${baseExplanation}`
    : `✅ <b>Authentic image</b> — no AI generation signatures detected by Gemini Vision (<i>${activeModel}</i>)\n\n${baseExplanation}`;

  return {
    isPhishing: isAI,
    confidence,
    explanation,
    source: `Gemini / ${activeModel}`,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// analyzeVideoWithGemini
// Uses Gemini File API to upload the video (handles large files properly),
// polls for ACTIVE state, then runs vision analysis.
// ─────────────────────────────────────────────────────────────────────────────
export const analyzeVideoWithGemini = async (videoBuffer, mimetype = 'video/mp4', filename = 'video', modelOverride = null) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in .env');

  console.log(`[Gemini] Uploading video: ${filename} (${videoBuffer.length} bytes)`);

  // ── Step 1: Upload via File API using raw REST (avoids temp-file requirement) ──
  // The @google/generative-ai/server FileManager requires a file path on disk.
  // We use the REST API directly with a Buffer instead.
  const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;

  // Resumable upload: initiate
  const { default: axios } = await import('axios');

  const initRes = await axios.post(
    uploadUrl,
    JSON.stringify({ file: { display_name: filename } }),
    {
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': String(videoBuffer.length),
        'X-Goog-Upload-Header-Content-Type': mimetype,
        'Content-Type': 'application/json',
      },
    }
  );

  const uploadSessionUrl = initRes.headers['x-goog-upload-url'];
  if (!uploadSessionUrl) throw new Error('Gemini File API did not return an upload session URL');

  // Upload the actual bytes
  const uploadRes = await axios.post(uploadSessionUrl, videoBuffer, {
    headers: {
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Type': mimetype,
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  let fileInfo = uploadRes.data?.file ?? uploadRes.data;
  const fileUri = fileInfo?.uri;
  const fileMime = fileInfo?.mimeType ?? mimetype;

  if (!fileUri) throw new Error('Gemini File API upload did not return a file URI');
  console.log(`[Gemini] Video uploaded: ${fileUri} — state: ${fileInfo?.state}`);

  // ── Step 2: Poll until ACTIVE (video processing can take seconds) ──────────
  const fileNamePath = fileInfo?.name; // e.g. "files/abc123"
  const maxWait = 90_000; // 90 seconds
  const interval = 5_000;
  let elapsed = 0;

  while (fileInfo?.state === 'PROCESSING' && elapsed < maxWait) {
    await new Promise((r) => setTimeout(r, interval));
    elapsed += interval;
    const statusRes = await axios.get(
      `https://generativelanguage.googleapis.com/v1beta/${fileNamePath}?key=${apiKey}`
    );
    fileInfo = statusRes.data;
    console.log(`[Gemini] Video state: ${fileInfo.state} (${elapsed / 1000}s elapsed)`);
  }

  if (fileInfo?.state === 'PROCESSING') {
    throw new Error('Gemini video processing timed out after 90 seconds');
  }
  if (fileInfo?.state === 'FAILED') {
    throw new Error('Gemini File API video processing FAILED');
  }

  // ── Step 3: Generate content ───────────────────────────────────────────────
  const genAI = new GenAI(apiKey);
  const activeModel = modelOverride || GEMINI_MODEL;
  const model = genAI.getGenerativeModel({ model: activeModel });
  console.log(`[Gemini] Running video analysis with model: ${activeModel}`);

  const result = await model.generateContent([
    DEEPFAKE_VIDEO_PROMPT,
    {
      fileData: { fileUri, mimeType: fileMime },
    },
  ]);

  const text = result.response.text();
  console.log(`[Gemini] Video raw response for ${filename}:`, text.substring(0, 300));

  const parsed = parseGeminiJSON(text);

  // Read semantically correct field first, fall back to legacy field names
  const rawFlag = Boolean(parsed.isDeepfake ?? parsed.isAIGenerated ?? parsed.isPhishing ?? parsed.isAI ?? false);
  const isAI = semanticOverride(rawFlag, Math.min(100, Math.max(0, Number(parsed.confidence ?? 50))), parsed.explanation ?? '');
  const confidence = Math.min(100, Math.max(0, Number(parsed.confidence ?? 50)));
  const baseExplanation = parsed.explanation ?? 'No explanation provided.';

  const explanation = isAI
    ? `🚨 <b>Deepfake / AI-generated video detected</b> by Gemini Vision (<i>${activeModel}</i>)\n\n${baseExplanation}`
    : `✅ <b>Authentic video</b> — no deepfake signatures detected by Gemini Vision (<i>${activeModel}</i>)\n\n${baseExplanation}`;

  return {
    isPhishing: isAI,
    confidence,
    explanation,
    source: `Gemini / ${activeModel}`,
  };
};
