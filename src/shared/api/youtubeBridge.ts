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

export async function getDirectAudioStream(videoId: string): Promise<string> {
  // Список публичных инстансов Piped для отказоустойчивости (fallback)
  const pipedInstances = [
    'https://kavin.rocks',
    'https://piped.yt',
    'https://garudalinux.org'
  ];

  let lastError: any = null;

  for (const instance of pipedInstances) {
    try {
      // Делаем запрос к API инстанса для получения данных о стримах видео
      const response = await fetch(`${instance}/streams/${videoId}`);
      if (!response.ok) throw new Error(`Instance ${instance} returned status ${response.status}`);
      
      const data = await response.json();
      
      // Фильтруем потоки: ищем только аудио (audioStreams)
      if (data && data.audioStreams && data.audioStreams.length > 0) {
        // Сортируем по битрейту, чтобы взять максимальное качество (кодек Opus идет по умолчанию в топе)
        const bestAudio = data.audioStreams.sort((a: any, b: any) => b.bitrate - a.bitrate)[0];
        
        // Возвращаем прямой URL на аудиофайл
        return bestAudio.url;
      }
    } catch (error) {
      console.warn(`Failed to fetch stream from ${instance}, trying next...`, error);
      lastError = error;
    }
  }

  throw new Error(`Failed to extract audio stream from all Piped instances. Last error: ${lastError?.message}`);
}