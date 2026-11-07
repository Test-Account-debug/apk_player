import { describe, expect, it } from "vitest";

import {
  addTrackToPlaylist,
  createEmptyLibrary,
  createPlaylist,
  deletePlaylist,
  getTrackKey,
  removeTrackFromPlaylist,
  toggleFavorite,
} from "./libraryModel";
import type { UniversalTrack } from "../../shared/types/UniversalTrack";

const track: UniversalTrack = {
  id: "track-1",
  title: "Northern Lights",
  artist: "Aural Test",
  album: "Demo",
  coverUrl: "",
  duration: 180,
  sourcePlatform: "jamendo",
};

describe("library model", () => {
  it("uses platform-qualified track IDs", () => {
    expect(getTrackKey(track)).toBe("jamendo:track-1");
  });

  it("adds and removes a favorite without duplicating its saved track", () => {
    const empty = createEmptyLibrary();
    const favorited = toggleFavorite(toggleFavorite(empty, track), track);

    expect(favorited.favoriteTrackIds).toEqual([]);
    expect(Object.keys(favorited.tracks)).toEqual(["jamendo:track-1"]);
  });

  it("creates a playlist and de-duplicates tracks added to it", () => {
    const playlist = createPlaylist(createEmptyLibrary(), "Night drive", "list-1", 10);
    const once = addTrackToPlaylist(playlist, "list-1", track);
    const twice = addTrackToPlaylist(once, "list-1", track);

    expect(twice.playlists[0].trackIds).toEqual(["jamendo:track-1"]);
    expect(twice.tracks["jamendo:track-1"]).toEqual(track);
  });

  it("rejects blank and duplicate playlist names", () => {
    const initial = createEmptyLibrary();
    const withPlaylist = createPlaylist(initial, "Favorites", "list-1");

    expect(() => createPlaylist(initial, "  ", "list-2")).toThrow("Playlist name cannot be empty");
    expect(() => createPlaylist(withPlaylist, "favorites", "list-2")).toThrow(
      "A playlist with this name already exists",
    );
  });

  it("removes a track and playlist immutably", () => {
    const initial = addTrackToPlaylist(
      createPlaylist(createEmptyLibrary(), "Road", "list-1"),
      "list-1",
      track,
    );
    const withoutTrack = removeTrackFromPlaylist(initial, "list-1", "jamendo:track-1");

    expect(withoutTrack.playlists[0].trackIds).toEqual([]);
    expect(deletePlaylist(withoutTrack, "list-1").playlists).toEqual([]);
    expect(initial.playlists[0].trackIds).toEqual(["jamendo:track-1"]);
  });
});