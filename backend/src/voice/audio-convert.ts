/**
 * Audio format conversion for Twilio Media Streams <-> Browser audio.
 *
 * Pure audio bridge (no STT/TTS involved):
 * - Browser mic: PCM 16-bit 16kHz → downsample 8kHz → mulaw encode → base64 → Twilio
 * - Twilio phone: base64 → mulaw decode → upsample 24kHz → WAV header → Browser speaker
 */

// ─── Mulaw decode table (ITU-T G.711) ───────────────────────────────────────
const MULAW_DECODE_TABLE = new Int16Array(256);
(function buildDecodeTable() {
  for (let i = 0; i < 256; i++) {
    let mulaw = ~i & 0xff;
    const sign = mulaw & 0x80;
    const exponent = (mulaw >> 4) & 0x07;
    const mantissa = mulaw & 0x0f;
    let magnitude = ((mantissa << 1) + 33) << (exponent + 2);
    magnitude -= 0x84;
    MULAW_DECODE_TABLE[i] = sign ? -magnitude : magnitude;
  }
})();

// ─── Mulaw encode ───────────────────────────────────────────────────────────
const MULAW_BIAS = 0x84;
const MULAW_CLIP = 32635;

function linear16ToMulawSample(sample: number): number {
  const sign = (sample >> 8) & 0x80;
  if (sign) sample = -sample;
  if (sample > MULAW_CLIP) sample = MULAW_CLIP;
  sample += MULAW_BIAS;

  let exponent = 7;
  const expMask = 0x4000;
  for (; exponent > 0; exponent--) {
    if (sample & (expMask >> (7 - exponent))) break;
  }

  const mantissa = (sample >> (exponent + 3)) & 0x0f;
  const mulawByte = ~(sign | (exponent << 4) | mantissa) & 0xff;
  return mulawByte;
}

/**
 * Decode mulaw buffer to PCM 16-bit signed.
 */
export function mulawToLinear16(mulawBuf: Buffer): Buffer {
  const pcm = Buffer.alloc(mulawBuf.length * 2);
  for (let i = 0; i < mulawBuf.length; i++) {
    pcm.writeInt16LE(MULAW_DECODE_TABLE[mulawBuf[i]], i * 2);
  }
  return pcm;
}

/**
 * Encode PCM 16-bit signed buffer to mulaw.
 */
export function linear16ToMulaw(pcmBuf: Buffer): Buffer {
  const numSamples = Math.floor(pcmBuf.length / 2);
  const mulaw = Buffer.alloc(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const sample = pcmBuf.readInt16LE(i * 2);
    mulaw[i] = linear16ToMulawSample(sample);
  }
  return mulaw;
}

/**
 * Resample PCM 16-bit buffer using linear interpolation.
 */
export function resample(pcmBuf: Buffer, fromRate: number, toRate: number): Buffer {
  if (fromRate === toRate) return pcmBuf;

  const numInputSamples = Math.floor(pcmBuf.length / 2);
  const ratio = fromRate / toRate;
  const numOutputSamples = Math.floor(numInputSamples / ratio);
  const output = Buffer.alloc(numOutputSamples * 2);

  for (let i = 0; i < numOutputSamples; i++) {
    const srcIdx = i * ratio;
    const srcIdxFloor = Math.floor(srcIdx);
    const frac = srcIdx - srcIdxFloor;

    const s0 = pcmBuf.readInt16LE(Math.min(srcIdxFloor, numInputSamples - 1) * 2);
    const s1 = pcmBuf.readInt16LE(Math.min(srcIdxFloor + 1, numInputSamples - 1) * 2);
    const interpolated = Math.round(s0 + frac * (s1 - s0));

    output.writeInt16LE(Math.max(-32768, Math.min(32767, interpolated)), i * 2);
  }

  return output;
}

/**
 * Browser mic PCM (16kHz 16-bit) → Twilio mulaw base64.
 * Pipeline: downsample 16k→8k → encode mulaw → base64
 */
export function browserPcmToMulaw(pcm16k: Buffer): string {
  const pcm8k = resample(pcm16k, 16000, 8000);
  const mulawBuf = linear16ToMulaw(pcm8k);
  return mulawBuf.toString('base64');
}

/**
 * Twilio mulaw base64 → Browser-playable WAV buffer (24kHz).
 * Pipeline: base64 decode → mulaw decode → upsample 8k→24k → prepend WAV header
 */
export function mulawToBrowserAudio(mulawBase64: string): Buffer {
  const mulawBuf = Buffer.from(mulawBase64, 'base64');
  const pcm8k = mulawToLinear16(mulawBuf);
  const pcm24k = resample(pcm8k, 8000, 24000);

  // Build WAV header
  const sampleRate = 24000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm24k.length;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm24k]);
}
