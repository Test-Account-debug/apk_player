import type { UniversalTrack } from "../../shared/types/UniversalTrack";

export interface SearchableJamendoTrack extends UniversalTrack {
  audioUrl: string;
  licenseUrl: string;
}

interface JamendoTrackResult {
  id: string;
  name: string;
  artist_name: string;
  album_name?: string;
  duration: number;
  image?: string;
  audio?: string;
  license_ccurl?: string;
}

interface JamendoResponse {
  results?: JamendoTrackResult[];
  headers?: { status?: string; error_message?: string };
}

export async function searchJamendoCatalog(
  query: string,
  clientId: string,
  signal?: AbortSignal,
): Promise<SearchableJamendoTrack[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];
  if (!clientId.trim()) throw new Error("Set a Jamendo client ID in appConfig before searching");

  const url = new URL("https://api.jamendo.com/v3.0/tracks/");
  url.searchParams.set("client_id", clientId.trim());
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "30");
  url.searchParams.set("search", normalizedQuery);
  url.searchParams.set("audioformat", "mp31");
  url.searchParams.set("include", "musicinfo");

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) throw new Error(`Jamendo search failed (${response.status})`);
  const payload = (await response.json()) as JamendoResponse;
  if (payload.headers?.status !== "success") {
    throw new Error(payload.headers?.error_message ?? "Jamendo returned an unsuccessful response");
  }

  return (payload.results ?? [])
    .filter((track) => {
      if (!track.audio || !track.license_ccurl) return false;
      try {
        return new URL(track.audio).protocol === "https:";
      } catch {
        return false;
      }
    })
    .map((track) => ({
      id: String(track.id),
      title: track.name,
      artist: track.artist_name,
      album: track.album_name ?? "",
      coverUrl: track.image ?? "",
      duration: track.duration,
      sourcePlatform: "jamendo" as const,
      audioUrl: track.audio!,
      licenseUrl: track.license_ccurl!,
    }));
}