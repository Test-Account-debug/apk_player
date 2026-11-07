import type { UniversalTrack } from "../../../shared/types/UniversalTrack";

interface SoundCloudTrack {
  id: number | string;
  title: string;
  duration: number;
  artwork_url?: string | null;
  user?: { username?: string; avatar_url?: string | null };
  publisher_metadata?: { artist?: string | null };
  album?: { title?: string };
}

interface SoundCloudCollection {
  kind?: string;
  tracks?: SoundCloudTrack[];
  next_href?: string | null;
}

function isSoundCloudApiUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "api.soundcloud.com";
  } catch {
    return false;
  }
}

function mapTrack(track: SoundCloudTrack): UniversalTrack {
  return {
    id: String(track.id),
    title: track.title,
    artist: track.publisher_metadata?.artist || track.user?.username || "Unknown artist",
    album: track.album?.title ?? "",
    coverUrl: track.artwork_url ?? track.user?.avatar_url ?? "",
    duration: track.duration / 1000,
    sourcePlatform: "soundcloud",
  };
}

export async function parseSoundCloudLink(
  shareUrl: string,
  accessToken: string,
): Promise<UniversalTrack[]> {
  if (!accessToken) throw new Error("A SoundCloud OAuth access token is required");
  const url = new URL(shareUrl);
  if (!/(^|\.)soundcloud\.com$/i.test(url.hostname)) {
    throw new Error("Expected a SoundCloud share URL");
  }

  let nextUrl: string | null =
    `https://api.soundcloud.com/resolve?url=${encodeURIComponent(url.toString())}`;
  const tracks: UniversalTrack[] = [];
  const visited = new Set<string>();
  while (nextUrl) {
    if (!isSoundCloudApiUrl(nextUrl)) throw new Error("Unexpected SoundCloud pagination URL");
    const response = await fetch(nextUrl, {
      headers: { Authorization: `OAuth ${accessToken}` },
    });
    if (!response.ok) throw new Error(`SoundCloud request failed (${response.status})`);

    const result = (await response.json()) as SoundCloudTrack | SoundCloudCollection;
    if ("tracks" in result && Array.isArray(result.tracks)) {
      tracks.push(...result.tracks.map(mapTrack));
      nextUrl = result.next_href ?? null;
      if (nextUrl && visited.has(nextUrl)) break;
      if (nextUrl) visited.add(nextUrl);
    } else {
      tracks.push(mapTrack(result as SoundCloudTrack));
      nextUrl = null;
    }
  }
  return tracks;
}