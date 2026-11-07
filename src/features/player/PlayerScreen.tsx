import TrackPlayer, { useActiveTrack, usePlaybackState, useProgress, State } from "react-native-track-player";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";
import Slider from "@react-native-community/slider";
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { appConfig } from "../../shared/config/appConfig";

interface PlayerScreenProps {
  onOpenEqualizer: () => void;
}

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

export function PlayerScreen({ onOpenEqualizer }: PlayerScreenProps) {
  const track = useActiveTrack();
  const playback = usePlaybackState();
  const progress = useProgress(500);
  const isPlaying = playback.state === State.Playing;
  const coverUrl = track?.artwork;

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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open equalizer"
          onPress={onOpenEqualizer}
          style={styles.iconButton}
        >
          <Ionicons name="options-outline" size={22} color="#e9f5f5" />
        </Pressable>
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
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#071014", paddingHorizontal: 22, paddingTop: 54, paddingBottom: 30 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
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
});