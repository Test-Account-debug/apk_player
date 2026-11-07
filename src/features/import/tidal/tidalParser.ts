import type { UniversalTrack } from "../../../shared/types/UniversalTrack";

interface TidalTrack {
  id: number | string;
  title: string;
  duration: number;
  artist?: { name?: string };
  artists?: Array<{ name?: string }>;
  album?: { title?: string; cover?: string };
}

interface TidalResponse<T> {
  track?: TidalTrack;
  items?: T[];
  title?: string;
  limit?: number;
  offset?: number;
  totalNumberOfItems?: number;
}

function mapTrack(track: TidalTrack): UniversalTrack {
  const cover = track.album?.cover?.replace(/-/g, "/");
  return {
    id: String(track.id),
    title: track.title,
    artist:
      track.artists?.map((artist) => artist.name).filter(Boolean).join(", ") ||
      track.artist?.name ||
      "Unknown artist",
    album: track.album?.title ?? "",
    coverUrl: cover ? `https://resources.tidal.com/images/${cover}/640x640.jpg` : "",
    duration: track.duration,
    sourcePlatform: "tidal",
  };
}

async function tidalRequest<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`Tidal request failed (${response.status})`);
  return (await response.json()) as T;
}

export async function parseTidalLink(
  shareUrl: string,
  accessToken: string,
  countryCode: string,
): Promise<UniversalTrack[]> {
  if (!accessToken) throw new Error("A Tidal OAuth access token is required");
  const url = new URL(shareUrl);
  if (!/(^|\.)tidal\.com$/i.test(url.hostname)) {
    throw new Error("Expected a Tidal share URL");
  }
  const match = url.pathname.match(/\/(?:browse\/)?(track|playlist)\/([\w-]+)/);
  if (!match) throw new Error("Unsupported Tidal URL; provide a track or playlist link");

  const [, kind, id] = match;
  const query = new URLSearchParams({ countryCode });
  if (kind === "track") {
    const result = await tidalRequest<TidalResponse<TidalTrack>>(
      `https://api.tidal.com/v1/tracks/${encodeURIComponent(id)}?${query}`,
      accessToken,
    );
    return result ? [mapTrack(result.track ?? (result as unknown as TidalTrack))] : [];
  }

  const tracks: UniversalTrack[] = [];
  const limit = 100;
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  while (offset < total) {
    query.set("limit", String(limit));
    query.set("offset", String(offset));
    const result = await tidalRequest<TidalResponse<TidalTrack>>(
      `https://api.tidal.com/v1/playlists/${encodeURIComponent(id)}/tracks?${query}`,
      accessToken,
    );
    const items = result.items ?? [];
    tracks.push(...items.map(mapTrack));
    total = result.totalNumberOfItems ?? offset + items.length;
    if (items.length === 0) break;
    offset += items.length;
  }
  return tracks;
}