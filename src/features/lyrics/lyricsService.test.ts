import { describe, expect, it } from "vitest";

import { parseSyncedLyrics } from "./lyricsService";

describe("parseSyncedLyrics", () => {
  it("parses and sorts timestamps with fractional seconds", () => {
    expect(parseSyncedLyrics("[00:02.25]second\n[00:01.50]first")).toEqual([
      { time: 1.5, text: "first" },
      { time: 2.25, text: "second" },
    ]);
  });

  it("applies offset metadata and supports multiple timestamps per line", () => {
    expect(parseSyncedLyrics("[offset:500]\n[00:01.00][00:03.00]repeat")).toEqual([
      { time: 1.5, text: "repeat" },
      { time: 3.5, text: "repeat" },
    ]);
  });

  it("ignores untimed metadata and empty input", () => {
    expect(parseSyncedLyrics("[ar:Artist]\n[ti:Title]\nnot timed")).toEqual([]);
    expect(parseSyncedLyrics("")).toEqual([]);
  });
});