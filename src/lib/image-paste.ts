/** 클라이언트 전용: 이미지 붙여넣기·리사이즈 유틸 (분석 카드·종목 아바타 공용) */

export function normalizeHttpUrl(src: string): string | null {
  try {
    const u = new URL(
      src,
      typeof window !== "undefined" ? window.location.href : undefined
    );
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
    return null;
  } catch {
    return null;
  }
}

export function extractImgSrcFromHtml(html: string): string | null {
  if (!html?.trim()) return null;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const img = doc.querySelector("img[src]");
    const raw = img?.getAttribute("src");
    if (raw) return normalizeHttpUrl(raw);
  } catch {
    /* fall through */
  }
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m?.[1]) return normalizeHttpUrl(m[1]);
  return null;
}

export async function resizeImageToDataUrl(
  blob: Blob,
  maxDim = 220,
  quality = 0.88
): Promise<string> {
  const file =
    blob instanceof File
      ? blob
      : new File([blob], "image", { type: blob.type || "image/png" });
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else {
          width = (width / height) * maxDim;
          height = maxDim;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("load"));
    };
    img.src = url;
  });
}
