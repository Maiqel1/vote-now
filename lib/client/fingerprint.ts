async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function canvasSignal(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 280;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#f60";
    ctx.fillRect(100, 1, 62, 20);
    ctx.font = "16px Arial";
    ctx.fillStyle = "#069";
    ctx.fillText("VoteNow poll \u{1F5F3}️ ✓ Ωπ", 2, 15);
    ctx.font = "18px 'Times New Roman'";
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("VoteNow poll \u{1F5F3}️ ✓ Ωπ", 4, 32);
    const gradient = ctx.createLinearGradient(0, 0, 280, 0);
    gradient.addColorStop(0, "#f97316");
    gradient.addColorStop(1, "#2563eb");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(240, 30, 18, 0, Math.PI * 2);
    ctx.fill();
    return canvas.toDataURL();
  } catch {
    return "";
  }
}

function webglSignal(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "";
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    return [
      info ? gl.getParameter(info.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      (gl.getSupportedExtensions() ?? []).length,
    ].join("|");
  } catch {
    return "";
  }
}

async function audioSignal(): Promise<string> {
  try {
    const Offline =
      window.OfflineAudioContext ??
      (window as typeof window & { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (!Offline) return "";
    const context = new Offline(1, 5000, 44100);
    const oscillator = context.createOscillator();
    oscillator.type = "triangle";
    oscillator.frequency.value = 10000;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -50;
    compressor.knee.value = 40;
    compressor.ratio.value = 12;
    compressor.attack.value = 0;
    compressor.release.value = 0.25;
    oscillator.connect(compressor);
    compressor.connect(context.destination);
    oscillator.start(0);
    const buffer = await Promise.race([
      context.startRendering(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000)),
    ]);
    if (!buffer) return "";
    const data = buffer.getChannelData(0);
    let sum = 0;
    for (let i = 4500; i < data.length; i++) sum += Math.abs(data[i]);
    return sum.toFixed(6);
  } catch {
    return "";
  }
}

function environmentSignal(): string {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const [short, long] = [screen.width, screen.height].sort((a, b) => a - b);
  return [
    nav.userAgent,
    nav.language,
    (nav.languages ?? []).join(","),
    nav.platform,
    nav.hardwareConcurrency,
    nav.deviceMemory ?? "",
    nav.maxTouchPoints,
    short,
    long,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join("|");
}

let cached: Promise<string> | null = null;

export function browserFingerprint(): Promise<string> {
  cached ??= (async () => {
    const audio = await audioSignal();
    return sha256Hex([environmentSignal(), canvasSignal(), webglSignal(), audio].join("||"));
  })();
  return cached;
}
