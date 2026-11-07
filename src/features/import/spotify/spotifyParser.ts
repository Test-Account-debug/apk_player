import type { UniversalTrack } from "../../../shared/types/UniversalTrack";

interface SpotifyTrackItem {
  track: {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: { name: string; images?: Array<{ url: string }> };
    duration_ms: number;
  } | null;
}

interface SpotifyPage {
  items: SpotifyTrackItem[];
  next: string | null;
}

function getPlaylistId(input: string): string {
  const uriMatch = input.match(/^spotify:playlist:([\w]+)$/);
  if (uriMatch) return uriMatch[1];

  const url = new URL(input);
  const match = url.pathname.match(/\/playlist\/([\w]+)/);
  if (!match) throw new Error("Invalid Spotify playlist URL or URI");
  return match[1];
}

export async function parseSpotifyPlaylist(
  input: string,
  accessToken: string,
): Promise<UniversalTrack[]> {
  const playlistId = getPlaylistId(input);
  const tracks: UniversalTrack[] = [];
  let nextUrl: string | null =
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;

  while (nextUrl) {
    const response: Response = await fetch(nextUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error(`Spotify playlist request failed (${response.status})`);
    }

    const page: SpotifyPage = await response.json();
    for (const item of page.items) {
      const track = item.track;
      if (!track) continue;
      tracks.push({
        id: track.id,
        title: track.name,
        artist: track.artists.map((artist) => artist.name).join(", "),
        album: track.album.name,
        coverUrl: track.album.images?.[0]?.url ?? "",
        duration: track.duration_ms / 1000,
        sourcePlatform: "spotify",
      });
    }
    nextUrl = page.next;
  }

  return tracks;
}