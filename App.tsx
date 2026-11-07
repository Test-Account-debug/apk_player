import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import TrackPlayer, { Event } from "react-native-track-player";

import playbackService from "./src/features/player/PlaybackService";
import { PlayerScreen } from "./src/features/player/PlayerScreen";
import { setupPlayer } from "./src/features/player/playerEngine";
import { EqualizerScreen } from "./src/features/equalizer/EqualizerScreen";
import { ImportScreen } from "./src/screens/ImportScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { appConfig } from "./src/shared/config/appConfig";

TrackPlayer.registerPlaybackService(() => playbackService);

type ScreenName = "player" | "import" | "equalizer" | "settings";

const tabs: Array<{ key: ScreenName; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "player", label: "Плеер", icon: "musical-notes-outline" },
  { key: "import", label: "Импорт", icon: "add-circle-outline" },
  { key: "equalizer", label: "Эквалайзер", icon: "options-outline" },
  { key: "settings", label: "Настройки", icon: "settings-outline" },
];

export default function App() {
  const [screen, setScreen] = useState<ScreenName>("player");
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [audioSessionId, setAudioSessionId] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    void setupPlayer()
      .then(() => {
        if (active) setPlayerReady(true);
      })
      .catch((cause) => {
        if (active) {
          setPlayerError(cause instanceof Error ? cause.message : "Player initialization failed");
        }
      });
    return () => {
      active = false;
    };
  }, [retry]);

  useEffect(() => {
    if (!playerReady || screen !== "equalizer") return;
    let active = true;
    let sessionResolved = false;
    const poll = setInterval(() => {
      if (!sessionResolved) updateSessionId();
    }, 500);
    const updateSessionId = () => {
      void TrackPlayer.getAudioSessionId()
        .then((sessionId) => {
          if (!active) return;
          if (sessionId > 0) {
            sessionResolved = true;
            setAudioSessionId(sessionId);
          } else {
            setAudioSessionId(null);
          }
        })
        .catch(() => {
          if (active) setAudioSessionId(null);
        });
    };

    updateSessionId();
    const stateSubscription = TrackPlayer.addEventListener(Event.PlaybackState, updateSessionId);
    const trackSubscription = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      updateSessionId,
    );
    return () => {
      active = false;
      clearInterval(poll);
      stateSubscription.remove();
      trackSubscription.remove();
    };
  }, [playerReady, screen]);

  if (!playerReady) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        {playerError ? (
          <>
            <Text style={styles.errorTitle}>Плеер не запустился</Text>
            <Text style={styles.errorMessage}>{playerError}</Text>
            <Pressable onPress={() => { setPlayerError(null); setRetry((value) => value + 1); }} style={styles.retryButton}>
              <Text style={styles.retryText}>Повторить</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={appConfig.primaryColor} size="large" />
            <Text style={styles.loadingText}>Запуск Auralith...</Text>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.app}>
      <StatusBar style="light" />
      <View style={styles.screen}>
        {screen === "player" ? (
          <PlayerScreen onOpenEqualizer={() => setScreen("equalizer")} />
        ) : screen === "import" ? (
          <ImportScreen onTrackQueued={() => setScreen("player")} />
        ) : screen === "equalizer" ? (
          <EqualizerScreen audioSessionId={audioSessionId} />
        ) : (
          <SettingsScreen />
        )}
      </View>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const selected = screen === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setScreen(tab.key)}
              style={styles.tab}
            >
              <Ionicons name={tab.icon} size={20} color={selected ? appConfig.primaryColor : "#8b9b9f"} />
              <Text style={[styles.tabLabel, selected && styles.tabLabelSelected]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: "#071014" },
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24, backgroundColor: "#071014" },
  loadingText: { color: "#d4e2e4", fontSize: 14 },
  errorTitle: { color: "#f2ffff", fontSize: 18, fontWeight: "700" },
  errorMessage: { color: "#ff8bab", fontSize: 13, textAlign: "center" },
  retryButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 6, backgroundColor: appConfig.primaryColor },
  retryText: { color: "#071014", fontWeight: "700" },
  tabBar: { flexDirection: "row", minHeight: 62, paddingBottom: 5, borderTopColor: "rgba(220,245,247,0.12)", borderTopWidth: 1, backgroundColor: "#0b1519" },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  tabLabel: { color: "#8b9b9f", fontSize: 10 },
  tabLabelSelected: { color: appConfig.primaryColor, fontWeight: "700" },
});