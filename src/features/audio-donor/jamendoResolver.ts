import type { UniversalTrack } from "../../shared/types/UniversalTrack";

interface JamendoTrack {
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
  results?: JamendoTrack[];
  headers?: { status?: string; error_message?: string };
}

export interface LicensedJamendoTrack extends UniversalTrack {
  audioUrl: string;
  licenseUrl: string;
}

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function similarity(expected: string, actual: string): number {
  const expectedTokens = new Set(normalize(expected).split(" ").filter(Boolean));
  const actualTokens = new Set(normalize(actual).split(" ").filter(Boolean));
  if (expectedTokens.size === 0 || actualTokens.size === 0) return 0;
  let matches = 0;
  for (const token of expectedTokens) {
    if (actualTokens.has(token)) matches += 1;
  }
  return matches / expectedTokens.size;
}

export async function resolveJamendoTrack(
  track: UniversalTrack,
  clientId: string,
): Promise<LicensedJamendoTrack> {
  if (!clientId.trim()) throw new Error("Set a Jamendo client ID in appConfig before playback");

  const url = new URL("https://api.jamendo.com/v3.0/tracks/");
  url.searchParams.set("client_id", clientId.trim());
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "20");
  url.searchParams.set("search", `${track.title} ${track.artist}`);
  url.searchParams.set("audioformat", "mp31");
  url.searchParams.set("include", "musicinfo");

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`Jamendo search failed (${response.status})`);
  const payload = (await response.json()) as JamendoResponse;
  if (payload.headers?.status !== "success") {
    throw new Error(payload.headers?.error_message ?? "Jamendo returned an unsuccessful response");
  }

  const candidates = (payload.results ?? [])
    .filter((candidate) => candidate.audio && candidate.license_ccurl)
    .map((candidate) => ({
      candidate,
      score:
        similarity(track.title, candidate.name) * 0.65 +
        similarity(track.artist, candidate.artist_name) * 0.35,
    }))
    .sort((left, right) => right.score - left.score);

  const best = candidates[0];
  if (!best || best.score < 0.7) {
    throw new Error("No sufficiently close Creative Commons match was found on Jamendo");
  }
  const audioUrl = new URL(best.candidate.audio!);
  if (audioUrl.protocol !== "https:") throw new Error("Jamendo returned a non-HTTPS audio URL");

  return {
    id: String(best.candidate.id),
    title: best.candidate.name,
    artist: best.candidate.artist_name,
    album: best.candidate.album_name ?? "",
    coverUrl: best.candidate.image ?? "",
    duration: best.candidate.duration,
    sourcePlatform: "jamendo",
    audioUrl: audioUrl.toString(),
    licenseUrl: best.candidate.license_ccurl!,
  };
}