import { describe, expect, it } from "vitest";
import { formatElapsed, formatMinutes, ordinal } from "./format";

describe("formatElapsed", () => {
  it("counts up in minutes and seconds, adding hours only when needed", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(59_999)).toBe("0:59");
    expect(formatElapsed(372_000)).toBe("6:12");
    expect(formatElapsed(3_725_000)).toBe("1:02:05");
  });
});

describe("ordinal", () => {
  it("handles the irregular teens and the usual endings", () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 101, 111].map(ordinal)).toEqual([
      "1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "101st", "111th",
    ]);
  });
});

describe("formatMinutes", () => {
  it("switches to hours and pads the minutes", () => {
    expect([0, 27, 59, 60, 65, 139].map(formatMinutes)).toEqual(["0m", "27m", "59m", "1h 00m", "1h 05m", "2h 19m"]);
  });
});
