import { describe, expect, it } from "vitest";
import { checkPhoto, MAX_PHOTO_BYTES, MAX_PHOTO_EDGE } from "./jpeg";

const segment = (marker: number, body: number[]) => [0xff, marker, (body.length + 2) >> 8, (body.length + 2) & 0xff, ...body];
const frame = (width: number, height: number, marker = 0xc0) =>
  segment(marker, [8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3, 1, 0x11, 0]);
const jpeg = (...segments: number[][]) => Uint8Array.from([0xff, 0xd8, ...segments.flat(), 0xff, 0xd9]);
const app0 = segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);

describe("checkPhoto", () => {
  it("reads the size from the frame header, past earlier segments", () => {
    expect(checkPhoto(jpeg(app0, segment(0xc4, [0, 1, 2, 3]), frame(1200, 900)))).toEqual({ ok: true, width: 1200, height: 900 });
  });

  it("reads progressive JPEGs", () => {
    expect(checkPhoto(jpeg(app0, frame(640, 480, 0xc2)))).toEqual({ ok: true, width: 640, height: 480 });
  });

  it("rejects anything that is not a JPEG", () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0]);
    expect(checkPhoto(png)).toEqual({ ok: false, reason: "not_jpeg" });
    expect(checkPhoto(new Uint8Array())).toEqual({ ok: false, reason: "not_jpeg" });
  });

  it("rejects a JPEG with no frame header or a zero size", () => {
    expect(checkPhoto(jpeg(app0))).toEqual({ ok: false, reason: "not_jpeg" });
    expect(checkPhoto(jpeg(frame(0, 900)))).toEqual({ ok: false, reason: "not_jpeg" });
  });

  it("rejects photos that are too heavy or too wide", () => {
    const heavy = new Uint8Array(MAX_PHOTO_BYTES + 1);
    heavy.set(jpeg(frame(800, 600)));
    expect(checkPhoto(heavy)).toEqual({ ok: false, reason: "too_large" });
    expect(checkPhoto(jpeg(frame(MAX_PHOTO_EDGE + 1, 600)))).toEqual({ ok: false, reason: "too_large" });
  });
});
