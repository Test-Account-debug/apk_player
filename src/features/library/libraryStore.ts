import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  addTrackToPlaylist as addTrack,
  createEmptyLibrary,
  createPlaylist as createList,
  deletePlaylist as deleteList,
  removeTrackFromPlaylist as removeTrack,
  saveTrack as save,
  toggleFavorite as toggle,
  type LibrarySnapshot,
} from "./libraryModel";
import type { UniversalTrack } from "../../shared/types/UniversalTrack";

const storageKey = "auralith.library.v1";
let pendingWrite: Promise<unknown> = Promise.resolve();

export async function loadLibrary(): Promise<LibrarySnapshot> {
  const serialized = await AsyncStorage.getItem(storageKey);
  if (!serialized) return createEmptyLibrary();

  try {
    const parsed = JSON.parse(serialized) as Partial<LibrarySnapshot>;
    return {
      tracks: parsed.tracks ?? {},
      favoriteTrackIds: parsed.favoriteTrackIds ?? [],
      playlists: parsed.playlists ?? [],
    };
  } catch {
    return createEmptyLibrary();
  }
}

async function updateLibrary(
  updater: (library: LibrarySnapshot) => LibrarySnapshot,
): Promise<LibrarySnapshot> {
  const operation = pendingWrite.then(async () => {
    const updated = updater(await loadLibrary());
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    return updated;
  });
  pendingWrite = operation.catch(() => undefined);
  return operation;
}

export function saveLibraryTrack(track: UniversalTrack) {
  return updateLibrary((library) => save(library, track));
}

export function toggleLibraryFavorite(track: UniversalTrack) {
  return updateLibrary((library) => toggle(library, track));
}

export function createUserPlaylist(name: string) {
  return updateLibrary((library) => createList(library, name, `playlist-${Date.now()}`));
}

export function addLibraryTrackToPlaylist(playlistId: string, track: UniversalTrack) {
  return updateLibrary((library) => addTrack(library, playlistId, track));
}

export function deleteUserPlaylist(playlistId: string) {
  return updateLibrary((library) => deleteList(library, playlistId));
}

export function removeLibraryTrackFromPlaylist(playlistId: string, trackId: string) {
  return updateLibrary((library) => removeTrack(library, playlistId, trackId));
}