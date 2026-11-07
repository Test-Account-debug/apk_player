import type { UniversalTrack } from "../types/UniversalTrack";

export interface YouTubeSearchLink {
  query: string;
  webUrl: string;
  musicUrl: string;
}

export function createYouTubeSearchLink(track: UniversalTrack): YouTubeSearchLink {
  const query = [track.title, track.artist].filter(Boolean).join(" ").trim();
  const encodedQuery = encodeURIComponent(query);

  return {
    query,
    webUrl: `https://www.youtube.com/results?search_query=${encodedQuery}`,
    musicUrl: `https://music.youtube.com/search?q=${encodedQuery}`,
  };
}

export function getYouTubeWatchUrl(videoId: string): string {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    throw new Error("Invalid YouTube video ID");
  }
  return `https://www.youtube.com/watch?v=${videoId}`;
}