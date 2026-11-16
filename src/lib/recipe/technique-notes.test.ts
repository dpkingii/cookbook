import { describe, expect, it } from "vitest";
import { TECHNIQUE_NOTES } from "./technique-notes";
import { TECHNIQUES } from "./types";

describe("technique notes", () => {
  it("cover every technique and nothing else", () => {
    expect(Object.keys(TECHNIQUE_NOTES).sort()).toEqual([...TECHNIQUES].sort());
  });

  it.each(TECHNIQUES)("%s is short enough to read mid-cook", (technique) => {
    const note = TECHNIQUE_NOTES[technique];
    for (const text of [note.what, note.why, note.right, note.fix.when, note.fix.then]) {
      expect(text.length).toBeGreaterThan(0);
      expect(text.length).toBeLessThanOrEqual(170);
    }
    expect(note.fix.when).not.toMatch(/[.,]$/);
  });
});
