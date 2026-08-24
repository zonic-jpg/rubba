// Smooth, non-breaking image intake used across MyYanga uploads.
// Downscales to a max dimension, compresses, respects EXIF orientation, and
// NEVER throws — on any failure it falls back to the raw data URL so an upload
// can't break the UI.

const fileToDataUrl = (file: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("read failed"));
    r.readAsDataURL(file);
  });

const loadImg = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("decode failed"));
    i.src = src;
  });

export interface PrepOpts { maxDim?: number; quality?: number; mime?: "image/jpeg" | "image/png"; }

/** Returns a resized data URL. Safe: never rejects — falls back to the original. */
export async function prepImage(file: File, opts: PrepOpts = {}): Promise<string> {
  const maxDim = opts.maxDim ?? 1600;
  const quality = opts.quality ?? 0.85;
  const mime = opts.mime ?? "image/jpeg";
  try {
    // createImageBitmap applies EXIF orientation in modern browsers
    let w0: number, h0: number, source: CanvasImageSource;
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as any);
      w0 = bmp.width; h0 = bmp.height; source = bmp;
    } catch {
      const img = await loadImg(await fileToDataUrl(file));
      w0 = img.naturalWidth; h0 = img.naturalHeight; source = img;
    }
    const scale = Math.min(1, maxDim / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0 * scale));
    const h = Math.max(1, Math.round(h0 * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return await fileToDataUrl(file);
    ctx.drawImage(source, 0, 0, w, h);
    if ("close" in source && typeof (source as any).close === "function") (source as any).close();
    return canvas.toDataURL(mime, mime === "image/jpeg" ? quality : undefined);
  } catch {
    // last-resort fallback: original file, so the upload still works
    try { return await fileToDataUrl(file); } catch { return ""; }
  }
}
