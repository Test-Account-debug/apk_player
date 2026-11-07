import TrackPlayer, { Event, RepeatMode, State, useActiveTrack, usePlaybackState, useProgress } from "react-native-track-player";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import Slider from "@react-native-community/slider";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEffect, useState } from "react";

import { appConfig } from "../../shared/config/appConfig";
import { getQueueShuffleEnabled, setQueueShuffle } from "./queueTrack";
import { LyricsPanel } from "../lyrics/LyricsPanel";

interface PlayerScreenProps {
  onOpenEqualizer: () => void;
}

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

export function PlayerScreen({ onOpenEqualizer }: PlayerScreenProps) {
  const [queue, setQueue] = useState<Awaited<ReturnType<typeof TrackPlayer.getQueue>>>([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState<number | undefined>();
  const [queueVisible, setQueueVisible] = useState(false);
  const [lyricsVisible, setLyricsVisible] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>(RepeatMode.Off);
  const [shuffleEnabled, setShuffleEnabled] = useState(getQueueShuffleEnabled);
  const track = useActiveTrack();
  const playback = usePlaybackState();
  const progress = useProgress(500);
  const isPlaying = playback.state === State.Playing;
  const coverUrl = track?.artwork;

  useEffect(() => {
    let active = true;
    const refreshQueue = () => {
      void Promise.all([TrackPlayer.getQueue(), TrackPlayer.getActiveTrackIndex()]).then(
        ([nextQueue, nextActiveIndex]) => {
          if (!active) return;
          setQueue(nextQueue);
          setActiveQueueIndex(nextActiveIndex);
        },
      );
    };

    refreshQueue();
    void TrackPlayer.getRepeatMode().then(setRepeatMode);
    const subscription = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      refreshQueue,
    );
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  async function removeQueueItem(index: number) {
    await TrackPlayer.remove(index);
    const nextQueue = await TrackPlayer.getQueue();
    const nextActiveIndex = await TrackPlayer.getActiveTrackIndex();
    setQueue(nextQueue);
    setActiveQueueIndex(nextActiveIndex);
  }

  async function cycleRepeatMode() {
    const nextMode =
      repeatMode === RepeatMode.Off
        ? RepeatMode.Queue
        : repeatMode === RepeatMode.Queue
          ? RepeatMode.Track
          : RepeatMode.Off;
    await TrackPlayer.setRepeatMode(nextMode);
    setRepeatMode(nextMode);
  }

  async function toggleShuffle() {
    const enabled = await setQueueShuffle(!shuffleEnabled);
    setShuffleEnabled(enabled);
  }

  return (
    <View style={styles.root}>
      {coverUrl ? (
        <ImageBackground source={{ uri: String(coverUrl) }} style={StyleSheet.absoluteFill} blurRadius={28} />
      ) : null}
      <LinearGradient
        colors={["rgba(3,12,16,0.54)", "#071014", "rgba(4,10,14,0.96)"]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Open ${appConfig.appName} desktop project`}
          onPress={() => void WebBrowser.openBrowserAsync(appConfig.platformUrl)}
          style={styles.brandButton}
        >
          <Text style={styles.brand}>{appConfig.appName}</Text>
          <Ionicons name="open-outline" size={16} color={appConfig.primaryColor} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={lyricsVisible ? "Hide lyrics" : "Show lyrics"}
            accessibilityState={{ selected: lyricsVisible }}
            onPress={() => setLyricsVisible((visible) => !visible)}
            style={styles.iconButton}
          >
            <Ionicons name="reader-outline" size={20} color={lyricsVisible ? appConfig.primaryColor : "#e9f5f5"} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open equalizer"
            onPress={onOpenEqualizer}
            style={styles.iconButton}
          >
            <Ionicons name="options-outline" size={22} color="#e9f5f5" />
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.artworkFrame}>
          {coverUrl ? (
            <ImageBackground source={{ uri: String(coverUrl) }} style={styles.artwork} imageStyle={styles.artworkImage} />
          ) : (
            <View style={[styles.artwork, styles.artworkEmpty]}>
              <Ionicons name="musical-notes" size={58} color={appConfig.primaryColor} />
            </View>
          )}
        </View>

        <BlurView intensity={48} tint="dark" style={styles.controlPanel}>
          <Text numberOfLines={1} style={styles.trackTitle}>{track?.title ?? "Nothing playing"}</Text>
          <Text numberOfLines={1} style={styles.artist}>{track?.artist ?? "Choose a track to begin"}</Text>
          <Slider
            accessibilityLabel="Playback position"
            minimumValue={0}
            maximumValue={Math.max(progress.duration, 1)}
            value={Math.min(progress.position, progress.duration || 1)}
            onSlidingComplete={(position) => void TrackPlayer.seekTo(position)}
            minimumTrackTintColor={appConfig.primaryColor}
            maximumTrackTintColor="rgba(230,250,250,0.24)"
            thumbTintColor={appConfig.accentColor}
          />
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatTime(progress.position)}</Text>
            <Text style={styles.time}>{formatTime(progress.duration)}</Text>
          </View>
          <View style={styles.controls}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous track" onPress={() => void TrackPlayer.skipToPrevious()} style={styles.transportButton}>
              <Ionicons name="play-skip-back" size={26} color="#f2ffff" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? "Pause" : "Play"}
              onPress={() => void (isPlaying ? TrackPlayer.pause() : TrackPlayer.play())}
              style={styles.playButton}
            >
              <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="#071014" />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next track" onPress={() => void TrackPlayer.skipToNext()} style={styles.transportButton}>
              <Ionicons name="play-skip-forward" size={26} color="#f2ffff" />
            </Pressable>
          </View>
          <View style={styles.modeControls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Repeat ${repeatMode === RepeatMode.Off ? "off" : repeatMode === RepeatMode.Queue ? "queue" : "track"}`}
              onPress={() => void cycleRepeatMode()}
              style={styles.modeButton}
            >
              <Ionicons
                name={repeatMode === RepeatMode.Track ? "repeat" : "repeat-outline"}
                size={18}
                color={repeatMode === RepeatMode.Off ? "#8b9b9f" : appConfig.primaryColor}
              />
              <Text style={[styles.modeLabel, repeatMode !== RepeatMode.Off && styles.modeLabelActive]}>
                {repeatMode === RepeatMode.Off ? "Repeat off" : repeatMode === RepeatMode.Queue ? "Repeat all" : "Repeat one"}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: shuffleEnabled }}
              onPress={() => void toggleShuffle()}
              style={styles.modeButton}
            >
              <Ionicons name="shuffle" size={18} color={shuffleEnabled ? appConfig.primaryColor : "#8b9b9f"} />
              <Text style={[styles.modeLabel, shuffleEnabled && styles.modeLabelActive]}>Shuffle</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: queueVisible }}
            onPress={() => setQueueVisible((visible) => !visible)}
            style={styles.queueToggle}
          >
            <Ionicons name="list-outline" size={16} color={appConfig.primaryColor} />
            <Text style={styles.queueToggleText}>Очередь · {queue.length}</Text>
            <Ionicons name={queueVisible ? "chevron-up" : "chevron-down"} size={15} color="#a9b9bd" />
          </Pressable>
          {queueVisible ? (
            <ScrollView style={styles.queueList} nestedScrollEnabled>
              {queue.length === 0 ? (
                <Text style={styles.queueEmpty}>Очередь пуста. Добавьте трек во вкладке «Импорт».</Text>
              ) : (
                queue.map((item, index) => (
                  <View key={`${item.id ?? item.url}:${index}`} style={styles.queueItem}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => void TrackPlayer.skip(index)}
                      style={styles.queueTrackButton}
                    >
                      <Text numberOfLines={1} style={[styles.queueTrackTitle, index === activeQueueIndex && styles.queueTrackActive]}>
                        {item.title ?? "Unknown track"}
                      </Text>
                      <Text numberOfLines={1} style={styles.queueTrackArtist}>{item.artist ?? ""}</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.title ?? "track"} from queue`}
                      onPress={() => void removeQueueItem(index)}
                      style={styles.removeQueueButton}
                    >
                      <Ionicons name="close" size={17} color="#a9b9bd" />
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
          ) : null}
        </BlurView>
        <LyricsPanel
          visible={lyricsVisible}
          position={progress.position}
          track={track ? {
            title: track.title,
            artist: track.artist,
            album: track.album,
            duration: track.duration,
          } : null}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#071014", paddingHorizontal: 22, paddingTop: 54, paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 5 },
  brandButton: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  brand: { color: "#f1ffff", fontSize: 17, fontWeight: "800", letterSpacing: 0 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "rgba(255,255,255,0.08)" },
  content: { flex: 1, justifyContent: "center", gap: 24, maxWidth: 520, width: "100%", alignSelf: "center" },
  artworkFrame: { width: "100%", aspectRatio: 1, maxHeight: 370, alignSelf: "center", borderRadius: 8, overflow: "hidden", borderColor: "rgba(0,255,204,0.34)", borderWidth: 1 },
  artwork: { flex: 1, alignItems: "center", justifyContent: "center" },
  artworkImage: { resizeMode: "cover" },
  artworkEmpty: { backgroundColor: "#142329" },
  controlPanel: { padding: 20, borderRadius: 8, overflow: "hidden", borderColor: "rgba(225,255,255,0.16)", borderWidth: 1, backgroundColor: `rgba(15,27,32,${appConfig.glassBlurOpacity})` },
  trackTitle: { color: "#f3ffff", fontSize: 20, fontWeight: "700" },
  artist: { color: "#a9b9bd", fontSize: 14, marginTop: 5 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: -7 },
  time: { color: "#a9b9bd", fontSize: 11, fontVariant: ["tabular-nums"] },
  controls: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 28, marginTop: 18 },
  transportButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  playButton: { width: 62, height: 62, alignItems: "center", justifyContent: "center", borderRadius: 31, backgroundColor: appConfig.primaryColor },
  modeControls: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  modeButton: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 34, paddingHorizontal: 5 },
  modeLabel: { color: "#9baeb3", fontSize: 11, fontWeight: "600" },
  modeLabelActive: { color: appConfig.primaryColor },
  queueToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 40, marginTop: 10, borderTopColor: "rgba(230,250,250,0.12)", borderTopWidth: 1 },
  queueToggleText: { color: "#d2dfe1", fontSize: 12, fontWeight: "600" },
  queueList: { maxHeight: 144, borderTopColor: "rgba(230,250,250,0.1)", borderTopWidth: 1 },
  queueEmpty: { color: "#91a3a8", fontSize: 12, paddingVertical: 12, textAlign: "center" },
  queueItem: { flexDirection: "row", alignItems: "center", minHeight: 48, borderBottomColor: "rgba(230,250,250,0.08)", borderBottomWidth: 1 },
  queueTrackButton: { flex: 1, minWidth: 0, paddingVertical: 7 },
  queueTrackTitle: { color: "#e5eeee", fontSize: 12, fontWeight: "600" },
  queueTrackActive: { color: appConfig.primaryColor },
  queueTrackArtist: { color: "#8fa0a5", fontSize: 10, marginTop: 3 },
  removeQueueButton: { width: 34, height: 40, alignItems: "center", justifyContent: "center" },
});