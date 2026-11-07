import type { UniversalTrack } from "../../../shared/types/UniversalTrack";

interface YandexTrack {
  id: number | string;
  title?: string;
  durationMs?: number;
  artists?: Array<{ name?: string }>;
  albums?: Array<{ title?: string; coverUri?: string }>;
}

interface YandexResponse<T> {
  result?: T;
}

function mapTrack(track: YandexTrack): UniversalTrack {
  const coverUri = track.albums?.[0]?.coverUri?.replace("%%", "400x400");
  return {
    id: String(track.id),
    title: track.title ?? "Unknown title",
    artist: track.artists?.map((artist) => artist.name).filter(Boolean).join(", ") || "Unknown artist",
    album: track.albums?.[0]?.title ?? "",
    coverUrl: coverUri ? `https://${coverUri.replace(/^https?:\/\//, "")}` : "",
    duration: (track.durationMs ?? 0) / 1000,
    sourcePlatform: "yandexMusic",
  };
}

async function yandexRequest<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, { headers: { Authorization: `OAuth ${token}` } });
  if (!response.ok) throw new Error(`Yandex Music request failed (${response.status})`);
  const payload = (await response.json()) as YandexResponse<T>;
  if (payload.result === undefined) throw new Error("Unexpected Yandex Music API response");
  return payload.result;
}

export async function parseYandexMusicLink(
  shareUrl: string,
  oauthToken: string,
): Promise<UniversalTrack[]> {
  if (!oauthToken) throw new Error("A Yandex Music OAuth token is required");
  const url = new URL(shareUrl);
  if (!/(^|\.)music\.yandex\.(ru|com|by|kz|uz)$/i.test(url.hostname)) {
    throw new Error("Expected a Yandex Music share URL");
  }

  const trackId = url.pathname.match(/\/track\/(\d+)/)?.[1];
  if (trackId) {
    const tracks = await yandexRequest<YandexTrack[]>(
      `https://api.music.yandex.net/tracks?trackIds=${encodeURIComponent(trackId)}`,
      oauthToken,
    );
    return tracks.map(mapTrack);
  }

  const albumId = url.pathname.match(/\/album\/(\d+)/)?.[1];
  if (albumId) {
    const album = await yandexRequest<{ volumes?: YandexTrack[][]; title?: string }>(
      `https://api.music.yandex.net/albums/${albumId}/with-tracks`,
      oauthToken,
    );
    return (album.volumes ?? []).flat().map((track) => {
      const mapped = mapTrack(track);
      return { ...mapped, album: mapped.album || album.title || "" };
    });
  }

  const playlistMatch = url.pathname.match(/\/users\/([^/]+)\/playlists\/(\d+)/);
  if (playlistMatch) {
    const [, user, kind] = playlistMatch;
    const playlist = await yandexRequest<{ tracks?: Array<{ track?: YandexTrack }> }>(
      `https://api.music.yandex.net/users/${encodeURIComponent(user)}/playlists/${kind}?richtracks=true`,
      oauthToken,
    );
    return (playlist.tracks ?? [])
      .map((item) => item.track)
      .filter((track): track is YandexTrack => Boolean(track))
      .map(mapTrack);
  }

  throw new Error("Unsupported Yandex Music URL; provide a track, album, or playlist link");
}