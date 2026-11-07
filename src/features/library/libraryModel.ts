import type { UniversalTrack } from "../../shared/types/UniversalTrack";

export interface UserPlaylist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
}

export interface LibrarySnapshot {
  tracks: Record<string, UniversalTrack>;
  favoriteTrackIds: string[];
  playlists: UserPlaylist[];
}

export function createEmptyLibrary(): LibrarySnapshot {
  return { tracks: {}, favoriteTrackIds: [], playlists: [] };
}

export function getTrackKey(track: UniversalTrack): string {
  return `${track.sourcePlatform}:${track.id}`;
}

export function saveTrack(
  library: LibrarySnapshot,
  track: UniversalTrack,
): LibrarySnapshot {
  const key = getTrackKey(track);
  return { ...library, tracks: { ...library.tracks, [key]: track } };
}

export function toggleFavorite(
  library: LibrarySnapshot,
  track: UniversalTrack,
): LibrarySnapshot {
  const key = getTrackKey(track);
  const favoriteTrackIds = library.favoriteTrackIds.includes(key)
    ? library.favoriteTrackIds.filter((favoriteId) => favoriteId !== key)
    : [...library.favoriteTrackIds, key];

  return {
    ...saveTrack(library, track),
    favoriteTrackIds,
  };
}

export function createPlaylist(
  library: LibrarySnapshot,
  name: string,
  id: string,
  createdAt = Date.now(),
): LibrarySnapshot {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Playlist name cannot be empty");
  if (library.playlists.some((playlist) => playlist.name.toLowerCase() === normalizedName.toLowerCase())) {
    throw new Error("A playlist with this name already exists");
  }

  return {
    ...library,
    playlists: [
      ...library.playlists,
      { id, name: normalizedName, trackIds: [], createdAt },
    ],
  };
}

export function addTrackToPlaylist(
  library: LibrarySnapshot,
  playlistId: string,
  track: UniversalTrack,
): LibrarySnapshot {
  const key = getTrackKey(track);
  let found = false;
  const playlists = library.playlists.map((playlist) => {
    if (playlist.id !== playlistId) return playlist;
    found = true;
    return playlist.trackIds.includes(key)
      ? playlist
      : { ...playlist, trackIds: [...playlist.trackIds, key] };
  });
  if (!found) throw new Error("Playlist not found");

  return { ...saveTrack(library, track), playlists };
}

export function deletePlaylist(
  library: LibrarySnapshot,
  playlistId: string,
): LibrarySnapshot {
  return {
    ...library,
    playlists: library.playlists.filter((playlist) => playlist.id !== playlistId),
  };
}

export function removeTrackFromPlaylist(
  library: LibrarySnapshot,
  playlistId: string,
  trackId: string,
): LibrarySnapshot {
  return {
    ...library,
    playlists: library.playlists.map((playlist) =>
      playlist.id === playlistId
        ? { ...playlist, trackIds: playlist.trackIds.filter((id) => id !== trackId) }
        : playlist,
    ),
  };
}