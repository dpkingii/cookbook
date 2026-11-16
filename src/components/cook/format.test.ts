import { describe, expect, it } from "vitest";
import { formatMinutes, ordinal } from "./format";

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
