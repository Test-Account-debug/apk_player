import { afterEach, describe, expect, it, vi } from "vitest";

import { searchJamendoCatalog } from "./jamendoSearch";

afterEach(() => vi.unstubAllGlobals());

describe("searchJamendoCatalog", () => {
  it("returns only HTTPS tracks with an explicit Creative Commons license", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      headers: { status: "success" },
      results: [
        {
          id: "1",
          name: "Licensed",
          artist_name: "Artist",
          duration: 123,
          audio: "https://audio.example/licensed.mp3",
          license_ccurl: "https://creativecommons.org/licenses/by/4.0/",
        },
        {
          id: "2",
          name: "Missing license",
          artist_name: "Artist",
          duration: 123,
          audio: "https://audio.example/unlicensed.mp3",
        },
        {
          id: "3",
          name: "Insecure URL",
          artist_name: "Artist",
          duration: 123,
          audio: "http://audio.example/track.mp3",
          license_ccurl: "https://creativecommons.org/licenses/by/4.0/",
        },
      ],
    }), { status: 200 })));

    const results = await searchJamendoCatalog("licensed", "registered-client-id");

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: "1",
      title: "Licensed",
      sourcePlatform: "jamendo",
      audioUrl: "https://audio.example/licensed.mp3",
    });
  });

  it("does not make a request for a blank query", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(searchJamendoCatalog("  ", "client")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});