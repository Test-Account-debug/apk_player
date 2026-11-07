import type { UniversalTrack } from "../../../shared/types/UniversalTrack";

interface DeezerTrack {
  id: number | string;
  title: string;
  duration: number;
  artist?: { name?: string };
  album?: {
    title?: string;
    cover_xl?: string;
    cover_big?: string;
    cover_medium?: string;
  };
}

interface DeezerResponse<T> {
  data?: T;
  next?: string | null;
  error?: { message?: string };
  title?: string;
  tracks?: { data?: DeezerTrack[] };
}

function parseDeezerTrack(track: DeezerTrack): UniversalTrack {
  return {
    id: String(track.id),
    title: track.title,
    artist: track.artist?.name ?? "Unknown artist",
    album: track.album?.title ?? "",
    coverUrl:
      track.album?.cover_xl ?? track.album?.cover_big ?? track.album?.cover_medium ?? "",
    duration: track.duration,
    sourcePlatform: "deezer",
  };
}

async function deezerRequest<T>(url: string, accessToken?: string): Promise<DeezerResponse<T>> {
  const requestUrl = new URL(url);
  if (requestUrl.hostname !== "api.deezer.com" || requestUrl.protocol !== "https:") {
    throw new Error("Unexpected Deezer API URL");
  }
  if (accessToken) requestUrl.searchParams.set("access_token", accessToken);
  const response = await fetch(requestUrl.toString());
  if (!response.ok) throw new Error(`Deezer request failed (${response.status})`);
  const result = (await response.json()) as DeezerResponse<T>;
  if (result.error) throw new Error(result.error.message ?? "Deezer API error");
  return result;
}

export async function parseDeezerLink(
  shareUrl: string,
  accessToken?: string,
): Promise<UniversalTrack[]> {
  const url = new URL(shareUrl);
  if (!/(^|\.)deezer\.com$/i.test(url.hostname)) {
    throw new Error("Expected a Deezer share URL");
  }

  const match = url.pathname.match(/\/(track|playlist|album)\/(\d+)/);
  if (!match) throw new Error("Unsupported Deezer URL; provide a track, album, or playlist link");

  const [, kind, id] = match;
  if (kind === "track") {
    const result = await deezerRequest<DeezerTrack>(`https://api.deezer.com/track/${id}`, accessToken);
    return result.data ? [parseDeezerTrack(result.data)] : [];
  }

  const initialUrl =
    kind === "playlist"
      ? `https://api.deezer.com/playlist/${id}`
      : `https://api.deezer.com/album/${id}`;
  const collection = await deezerRequest<unknown>(initialUrl, accessToken);
  const firstPage = await deezerRequest<DeezerTrack[]>(
    kind === "playlist"
      ? `https://api.deezer.com/playlist/${id}/tracks?limit=100`
      : `https://api.deezer.com/album/${id}/tracks?limit=100`,
    accessToken,
  );

  const tracks: UniversalTrack[] = [];
  let page: DeezerResponse<DeezerTrack[]> = firstPage;
  const visited = new Set<string>();
  while (page) {
    tracks.push(...(page.data ?? []).map(parseDeezerTrack));
    if (!page.next || visited.has(page.next)) break;
    visited.add(page.next);
    page = await deezerRequest<DeezerTrack[]>(page.next, accessToken);
  }

  const albumName = collection.title ?? "";
  if (kind === "album" && albumName) {
    for (const track of tracks) track.album = albumName;
  }
  return tracks;
}