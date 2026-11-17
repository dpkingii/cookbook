export const MAX_PHOTO_BYTES = 700_000;
export const MAX_PHOTO_EDGE = 1600;

export type PhotoCheck =
  | { ok: true; width: number; height: number }
  | { ok: false; reason: "too_large" | "not_jpeg" };

const isFrameHeader = (marker: number) =>
  marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;

/** Reads the size out of a JPEG's frame header, so the server never trusts what the browser says it sent. */
export function checkPhoto(bytes: Uint8Array): PhotoCheck {
  if (bytes.length > MAX_PHOTO_BYTES) return { ok: false, reason: "too_large" };
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return { ok: false, reason: "not_jpeg" };

  let at = 2;
  while (at + 9 < bytes.length) {
    if (bytes[at] !== 0xff) return { ok: false, reason: "not_jpeg" };
    const marker = bytes[at + 1];
    if (marker === 0xff) {
      at += 1;
      continue;
    }
    const length = (bytes[at + 2] << 8) | bytes[at + 3];
    if (length < 2) return { ok: false, reason: "not_jpeg" };
    if (isFrameHeader(marker)) {
      const height = (bytes[at + 5] << 8) | bytes[at + 6];
      const width = (bytes[at + 7] << 8) | bytes[at + 8];
      if (width === 0 || height === 0) return { ok: false, reason: "not_jpeg" };
      if (Math.max(width, height) > MAX_PHOTO_EDGE) return { ok: false, reason: "too_large" };
      return { ok: true, width, height };
    }
    at += 2 + length;
  }
  return { ok: false, reason: "not_jpeg" };
}
