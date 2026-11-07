import type { UniversalTrack } from "../../shared/types/UniversalTrack";

export interface ResolvedAudio {
  url: string;
  mimeType: string;
}

export type LicensedAudioResolver = (
  track: UniversalTrack,
) => Promise<ResolvedAudio | null>;

export async function resolveAudioForTrack(
  track: UniversalTrack,
  resolver: LicensedAudioResolver,
): Promise<ResolvedAudio> {
  const result = await resolver(track);
  if (!result) throw new Error("No licensed audio source is available for this track");

  const url = new URL(result.url);
  if (url.protocol !== "https:") {
    throw new Error("Audio providers must return an HTTPS stream URL");
  }
  return result;
}