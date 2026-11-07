export interface LyricsTrackMetadata {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
}

export interface LyricsLine {
  time: number;
  text: string;
}

export interface TrackLyrics {
  plainLyrics: string | null;
  syncedLyrics: string | null;
  lines: LyricsLine[];
  source: "LRCLIB";
}

interface LrclibResponse {
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

export function parseSyncedLyrics(value: string): LyricsLine[] {
  const lines: LyricsLine[] = [];
  let offset = 0;

  for (const rawLine of value.split(/\r?\n/)) {
    const offsetTag = rawLine.match(/^\[offset:([+-]?\d+)\]$/i);
    if (offsetTag) {
      offset = Number(offsetTag[1]) / 1000;
      continue;
    }

    const matches = [...rawLine.matchAll(/\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)\]/g)];
    if (matches.length === 0) continue;
    const text = rawLine.replace(/\[\d{1,2}:\d{2}(?:\.\d{1,3})?\]/g, "").trim();
    for (const match of matches) {
      const time = Number(match[1]) * 60 + Number(match[2]) + offset;
      lines.push({ time: Math.max(0, time), text });
    }
  }

  return lines.sort((left, right) => left.time - right.time);
}

export async function fetchLyrics(
  track: LyricsTrackMetadata,
  signal?: AbortSignal,
): Promise<TrackLyrics | null> {
  if (!track.title?.trim() || !track.artist?.trim()) return null;

  const url = new URL("https://lrclib.net/api/get");
  url.searchParams.set("track_name", track.title.trim());
  url.searchParams.set("artist_name", track.artist.trim());
  if (track.album?.trim()) url.searchParams.set("album_name", track.album.trim());
  if (track.duration && track.duration > 0) {
    url.searchParams.set("duration", String(Math.round(track.duration)));
  }

  const response = await fetch(url.toString(), {
    signal,
    headers: { "User-Agent": "Auralith/1.0 (Android music player)" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Lyrics lookup failed (${response.status})`);

  const result = (await response.json()) as LrclibResponse;
  const plainLyrics = result.plainLyrics?.trim() || null;
  const syncedLyrics = result.syncedLyrics?.trim() || null;
  if (!plainLyrics && !syncedLyrics) return null;

  return {
    plainLyrics,
    syncedLyrics,
    lines: syncedLyrics ? parseSyncedLyrics(syncedLyrics) : [],
    source: "LRCLIB",
  };
}