import { MAX_PHOTO_BYTES, MAX_PHOTO_EDGE } from "./jpeg";

const QUALITIES = [0.82, 0.7, 0.55, 0.4];

const encode = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

/** Turns whatever the camera or file picker gave us into a JPEG small enough to store. Throws if it is not a picture. */
export async function shrinkPhoto(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of QUALITIES) {
    const blob = await encode(canvas, quality);
    if (blob && blob.size <= MAX_PHOTO_BYTES) return blob;
  }
  throw new Error("photo too large");
}

export const photoUrl = (sessionId: string, version: number) => `/api/sessions/${sessionId}/photo?v=${version}`;

/** Resolves with the saved photo's version, or null if it could not be saved. */
export async function uploadPhoto(sessionId: string, photo: Blob): Promise<number | null> {
  try {
    const response = await fetch(`/api/sessions/${sessionId}/photo`, {
      method: "POST",
      headers: { "content-type": "image/jpeg" },
      body: photo,
    });
    return response.ok ? ((await response.json()) as { version: number }).version : null;
  } catch {
    return null;
  }
}
