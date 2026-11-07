import type { UniversalTrack } from "../../../shared/types/UniversalTrack";

interface AppleMusicCredentials {
  developerToken: string;
  userToken?: string;
  storefront?: string;
}

interface AppleArtwork {
  url?: string;
}

interface AppleResource {
  id: string;
  type: string;
  attributes?: {
    name?: string;
    artistName?: string;
    albumName?: string;
    durationInMillis?: number;
    artwork?: AppleArtwork;
  };
}

interface AppleResponse {
  data?: AppleResource[];
  next?: string;
  errors?: Array<{ title?: string; detail?: string }>;
}

function mapSong(song: AppleResource): UniversalTrack {
  const attributes = song.attributes ?? {};
  return {
    id: song.id,
    title: attributes.name ?? "Unknown title",
    artist: attributes.artistName ?? "Unknown artist",
    album: attributes.albumName ?? "",
    coverUrl: attributes.artwork?.url?.replace("{w}", "600").replace("{h}", "600") ?? "",
    duration: (attributes.durationInMillis ?? 0) / 1000,
    sourcePlatform: "appleMusic",
  };
}

function isAppleApiUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "api.music.apple.com";
  } catch {
    return false;
  }
}

async function appleRequest(
  url: string,
  credentials: AppleMusicCredentials,
): Promise<AppleResponse> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${credentials.developerToken}`,
  };
  if (credentials.userToken) headers["Music-User-Token"] = credentials.userToken;
  const response = await fetch(url, { headers });
  const result = (await response.json()) as AppleResponse;
  if (!response.ok || result.errors?.length) {
    throw new Error(result.errors?.[0]?.detail ?? `Apple Music request failed (${response.status})`);
  }
  return result;
}

export async function parseAppleMusicLink(
  shareUrl: string,
  credentials: AppleMusicCredentials,
): Promise<UniversalTrack[]> {
  if (!credentials.developerToken) {
    throw new Error("An Apple Music developer token is required");
  }
  const url = new URL(shareUrl);
  if (url.hostname !== "music.apple.com") {
    throw new Error("Expected an Apple Music share URL");
  }

  const storefront = credentials.storefront ?? url.pathname.split("/")[1] ?? "us";
  const songId = url.searchParams.get("i") ?? url.pathname.match(/\/song\/[^/]+\/(\d+)/)?.[1];
  const playlistId = url.pathname.match(/\/playlist\/.*?\/(pl\.[^/]+)/)?.[1];
  const albumId = url.pathname.match(/\/album\/.*?\/(\d+)/)?.[1];
  const catalog = `https://api.music.apple.com/v1/catalog/${encodeURIComponent(storefront)}`;

  if (songId) {
    const result = await appleRequest(`${catalog}/songs/${encodeURIComponent(songId)}`, credentials);
    return (result.data ?? []).map(mapSong);
  }

  let nextUrl: string;
  if (playlistId && credentials.userToken) {
    nextUrl = `https://api.music.apple.com/v1/me/library/playlists/${encodeURIComponent(playlistId)}/tracks`;
  } else if (playlistId) {
    nextUrl = `${catalog}/playlists/${encodeURIComponent(playlistId)}/tracks`;
  } else if (albumId) {
    nextUrl = `${catalog}/albums/${encodeURIComponent(albumId)}/tracks`;
  } else {
    throw new Error("Unsupported Apple Music URL; provide a song, album, or playlist link");
  }

  const tracks: UniversalTrack[] = [];
  const visited = new Set<string>();
  while (nextUrl) {
    if (!isAppleApiUrl(nextUrl)) throw new Error("Unexpected Apple Music pagination URL");
    const result = await appleRequest(nextUrl, credentials);
    tracks.push(...(result.data ?? []).filter((item) => item.type === "songs").map(mapSong));
    nextUrl = result.next
      ? new URL(result.next, "https://api.music.apple.com").toString()
      : "";
    if (nextUrl && visited.has(nextUrl)) break;
    if (nextUrl) visited.add(nextUrl);
  }
  return tracks;
}