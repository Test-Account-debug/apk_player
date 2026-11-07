export type SourcePlatform =
  | "spotify"
  | "appleMusic"
  | "yandexMusic"
  | "youtubeMusic"
  | "deezer"
  | "soundcloud"
  | "tidal";

export interface UniversalTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string;
  /** Track duration in seconds. */
  duration: number;
  sourcePlatform: SourcePlatform;
}