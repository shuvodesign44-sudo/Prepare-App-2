// Browser-only microphone recorder that produces a complete 16 kHz mono WAV file.

export interface Recording {
  blob: Blob;
  seconds: number;
}

function encodeWav(chunks: Float32Array[], sampleRate: number, targetRate = 16000): Blob {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const ratio = sampleRate / targetRate;
  const outLength = Math.floor(merged.length / ratio);
  const samples = new Int16Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const value = merged[Math.floor(i * ratio)] ?? 0;
    const clamped = Math.max(-1, Math.min(1, value));
    samples[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (pos: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(pos + i, text.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, targetRate, true);
  view.setUint32(28, targetRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  new Int16Array(buffer, 44).set(samples);

  return new Blob([buffer], { type: "audio/wav" });
}

export async function startRecording(options?: {
  onFrame?: (frame: { level: number; seconds: number }) => void;
}): Promise<{ stop: () => Promise<Recording> }> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);
  const node = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  const startedAt = Date.now();

  node.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(input));
    if (options?.onFrame) {
      let sum = 0;
      for (let i = 0; i < input.length; i += 1) sum += input[i] * input[i];
      options.onFrame({
        level: Math.min(1, Math.sqrt(sum / input.length) * 6),
        seconds: (Date.now() - startedAt) / 1000,
      });
    }
  };
  source.connect(node);
  node.connect(ctx.destination);


  return {
    stop: async () => {
      stream.getTracks().forEach((track) => track.stop());
      node.disconnect();
      source.disconnect();
      const blob = encodeWav(chunks, ctx.sampleRate);
      await ctx.close();
      return { blob, seconds: Math.max(0, Math.round((Date.now() - startedAt) / 100) / 10) };
    },
  };
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the recording."));
    reader.readAsDataURL(blob);
  });
}
