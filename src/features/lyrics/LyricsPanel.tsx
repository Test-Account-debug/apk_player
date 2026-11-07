import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";

import { appConfig } from "../../shared/config/appConfig";
import { fetchLyrics, type LyricsLine, type LyricsTrackMetadata, type TrackLyrics } from "./lyricsService";

interface LyricsPanelProps {
  track: LyricsTrackMetadata | null;
  position: number;
  visible: boolean;
}

export function LyricsPanel({ track, position, visible }: LyricsPanelProps) {
  const [lyrics, setLyrics] = useState<TrackLyrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollView = useRef<ScrollView>(null);
  const lineOffsets = useRef<number[]>([]);
  const activeLineIndex = useMemo(() => {
    if (!lyrics?.lines.length) return -1;
    for (let index = lyrics.lines.length - 1; index >= 0; index -= 1) {
      if (lyrics.lines[index].time <= position) return index;
    }
    return -1;
  }, [lyrics, position]);

  useEffect(() => {
    if (!visible || !track?.title || !track.artist) return;
    const controller = new AbortController();
    setLyrics(null);
    setError(null);
    setLoading(true);
    void fetchLyrics(track, controller.signal)
      .then(setLyrics)
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Не удалось загрузить текст");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [visible, track?.title, track?.artist, track?.album, track?.duration]);

  useEffect(() => {
    if (activeLineIndex < 0) return;
    scrollView.current?.scrollTo({ y: Math.max(0, (lineOffsets.current[activeLineIndex] ?? 0) - 48), animated: true });
  }, [activeLineIndex]);

  if (!visible) return null;

  const lines: LyricsLine[] = lyrics?.lines.length
    ? lyrics.lines
    : lyrics?.plainLyrics
      ? lyrics.plainLyrics.split(/\r?\n/).map((text) => ({ time: 0, text }))
      : [];

  return (
    <BlurView intensity={38} tint="dark" style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>ТЕКСТ ПЕСНИ</Text>
        {lyrics ? <Text style={styles.source}>{lyrics.source}</Text> : null}
      </View>
      {loading ? <Text style={styles.message}>Ищем текст...</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {!loading && !error && !lyrics ? <Text style={styles.message}>Текст не найден</Text> : null}
      {lyrics && lines.length === 0 ? <Text style={styles.message}>Текст найден, но синхронизации по времени нет</Text> : null}
      {lines.length > 0 ? (
        <ScrollView ref={scrollView} style={styles.scroll}>
          {lines.map((line, index) => (
            <Text
              key={`${line.time}:${index}`}
              onLayout={(event) => { lineOffsets.current[index] = event.nativeEvent.layout.y; }}
              style={[styles.line, index === activeLineIndex && lyrics?.lines.length ? styles.activeLine : null]}
            >
              {line.text || " "}
            </Text>
          ))}
        </ScrollView>
      ) : null}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  panel: { maxHeight: 220, padding: 14, borderRadius: 8, overflow: "hidden", borderColor: "rgba(255,0,127,0.22)", borderWidth: 1, backgroundColor: "rgba(22,16,24,0.58)" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { color: "#d7cbd3", fontSize: 10, fontWeight: "700", letterSpacing: 1.1 },
  source: { color: "#8f818a", fontSize: 9 },
  message: { color: "#a69aa2", fontSize: 12, paddingVertical: 8 },
  error: { color: appConfig.accentColor, fontSize: 12 },
  scroll: { maxHeight: 168 },
  line: { color: "#b3a9af", fontSize: 14, lineHeight: 23, paddingVertical: 3, textAlign: "center" },
  activeLine: { color: appConfig.primaryColor, fontWeight: "800", fontSize: 16 },
});