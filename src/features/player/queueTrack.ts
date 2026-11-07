import TrackPlayer from "react-native-track-player";

import { resolveJamendoTrack } from "../audio-donor/jamendoResolver";
import type { UniversalTrack } from "../../shared/types/UniversalTrack";

interface LocalAudioFile {
  id: string;
  url: string;
  title: string;
}

let unshuffledQueueIds: string[] | null = null;

export function getQueueShuffleEnabled(): boolean {
  return unshuffledQueueIds !== null;
}

function trackKey(track: { id?: string; url: string }): string {
  return String(track.id ?? track.url);
}

async function moveQueueToOrder(desiredQueue: Awaited<ReturnType<typeof TrackPlayer.getQueue>>) {
  const workingQueue = await TrackPlayer.getQueue();
  for (let targetIndex = 0; targetIndex < desiredQueue.length; targetIndex += 1) {
    const targetKey = trackKey(desiredQueue[targetIndex]);
    const currentIndex = workingQueue.findIndex((item) => trackKey(item) === targetKey);
    if (currentIndex < 0 || currentIndex === targetIndex) continue;
    await TrackPlayer.move(currentIndex, targetIndex);
    const [item] = workingQueue.splice(currentIndex, 1);
    workingQueue.splice(targetIndex, 0, item);
  }
}

export async function queueTrackFromLicensedCatalog(
  track: UniversalTrack,
  jamendoClientId: string,
): Promise<void> {
  const licensedTrack = await resolveJamendoTrack(track, jamendoClientId);
  const queueItem = {
    id: `${licensedTrack.sourcePlatform}-${licensedTrack.id}-${Date.now()}`,
    url: licensedTrack.audioUrl,
    title: licensedTrack.title,
    artist: licensedTrack.artist,
    album: licensedTrack.album,
    artwork: licensedTrack.coverUrl || undefined,
    duration: licensedTrack.duration,
  };
  const firstIndex = (await TrackPlayer.getQueue()).length;
  const addedIndex = await TrackPlayer.add(queueItem);
  if (unshuffledQueueIds) unshuffledQueueIds.push(queueItem.id);
  await TrackPlayer.skip(typeof addedIndex === "number" ? addedIndex : firstIndex);
  await TrackPlayer.play();
}

export async function queueLocalAudioFiles(files: LocalAudioFile[]): Promise<void> {
  const tracks = files.map((file) => ({
    id: file.id,
    url: file.url,
    title: file.title,
    artist: "Локальный файл",
    album: "На устройстве",
  }));
  if (tracks.length === 0) return;
  const firstIndex = (await TrackPlayer.getQueue()).length;
  const addedIndex = await TrackPlayer.add(tracks);
  if (unshuffledQueueIds) unshuffledQueueIds.push(...tracks.map((track) => track.id));
  await TrackPlayer.skip(typeof addedIndex === "number" ? addedIndex : firstIndex);
  await TrackPlayer.play();
}

export async function setQueueShuffle(enabled: boolean): Promise<boolean> {
  const queue = await TrackPlayer.getQueue();
  if (enabled === Boolean(unshuffledQueueIds)) return Boolean(unshuffledQueueIds);

  if (!enabled) {
    if (!unshuffledQueueIds) return false;
    const queueById = new Map(queue.map((track) => [trackKey(track), track]));
    const usedIds = new Set<string>();
    const restored = unshuffledQueueIds.flatMap((id) => {
      const track = queueById.get(id);
      if (!track) return [];
      usedIds.add(id);
      return [track];
    });
    restored.push(...queue.filter((track) => !usedIds.has(trackKey(track))));
    await moveQueueToOrder(restored);
    unshuffledQueueIds = null;
    return false;
  }

  if (queue.length < 2) return false;
  unshuffledQueueIds = queue.map(trackKey);
  const activeIndex = await TrackPlayer.getActiveTrackIndex();
  const splitAt = activeIndex === undefined ? 0 : activeIndex + 1;
  const fixedPrefix = queue.slice(0, splitAt);
  const upcoming = queue.slice(splitAt);

  for (let index = upcoming.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [upcoming[index], upcoming[randomIndex]] = [upcoming[randomIndex], upcoming[index]];
  }

  await moveQueueToOrder([...fixedPrefix, ...upcoming]);
  return true;
}