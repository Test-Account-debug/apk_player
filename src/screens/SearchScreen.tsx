import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import { searchJamendoCatalog, type SearchableJamendoTrack } from "../features/search/jamendoSearch";
import { addAndPlayLicensedTrack } from "../features/player/queueTrack";
import { loadLibrary, saveLibraryTrack, toggleLibraryFavorite } from "../features/library/libraryStore";
import type { LibrarySnapshot } from "../features/library/libraryModel";
import { appConfig } from "../shared/config/appConfig";

interface SearchScreenProps {
  onTrackQueued: () => void;
}

export function SearchScreen({ onTrackQueued }: SearchScreenProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchableJamendoTrack[]>([]);
  const [library, setLibrary] = useState<LibrarySnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function search() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const [tracks, currentLibrary] = await Promise.all([
        searchJamendoCatalog(query, appConfig.jamendoClientId),
        loadLibrary(),
      ]);
      setResults(tracks);
      setLibrary(currentLibrary);
      if (tracks.length === 0) setNotice("По этому запросу нет доступных лицензированных результатов");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось выполнить поиск");
    } finally {
      setLoading(false);
    }
  }

  async function saveTrack(track: SearchableJamendoTrack) {
    try {
      setLibrary(await saveLibraryTrack(track));
      setNotice(`Сохранено в библиотеку: ${track.title}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить трек");
    }
  }

  async function toggleFavorite(track: SearchableJamendoTrack) {
    try {
      setLibrary(await toggleLibraryFavorite(track));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось обновить избранное");
    }
  }

  async function playTrack(track: SearchableJamendoTrack) {
    setPlayingId(track.id);
    setError(null);
    try {
      await addAndPlayLicensedTrack(track);
      onTrackQueued();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось запустить трек");
    } finally {
      setPlayingId(null);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>AURALITH / DISCOVER</Text>
        <Text style={styles.title}>Поиск</Text>
        <Text style={styles.subtitle}>Поиск по музыкальному каталогу Jamendo.</Text>

        <BlurView intensity={32} tint="dark" style={styles.searchBar}>
          <TextInput
            accessibilityLabel="Поиск треков"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            onSubmitEditing={() => void search()}
            placeholder="Название трека или исполнитель"
            placeholderTextColor="#738187"
            returnKeyType="search"
            style={styles.input}
            value={query}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Искать"
            disabled={!query.trim() || loading}
            onPress={() => void search()}
            style={[styles.searchButton, (!query.trim() || loading) && styles.disabled]}
          >
            {loading ? <ActivityIndicator color="#071014" /> : <Ionicons name="search" size={19} color="#071014" />}
          </Pressable>
        </BlurView>

        <Text style={styles.licenseNote}>Показываются только результаты с лицензией, допускающей воспроизведение.</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        {results.map((track) => {
          const trackKey = `jamendo:${track.id}`;
          const isFavorite = library?.favoriteTrackIds.includes(trackKey) ?? false;
          const isSaved = Boolean(library?.tracks[trackKey]);
          return (
            <BlurView key={trackKey} intensity={28} tint="dark" style={styles.resultRow}>
              {track.coverUrl ? (
                <Image source={{ uri: track.coverUrl }} style={styles.cover} />
              ) : (
                <View style={[styles.cover, styles.coverEmpty]} />
              )}
              <View style={styles.trackDetails}>
                <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
                <Text numberOfLines={1} style={styles.artist}>{track.artist}</Text>
                <Text style={styles.license}>Creative Commons</Text>
              </View>
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" accessibilityLabel={isFavorite ? "Убрать из избранного" : "В избранное"} onPress={() => void toggleFavorite(track)} style={styles.iconButton}>
                  <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={19} color={isFavorite ? appConfig.accentColor : "#d8e4e6"} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={isSaved ? "Сохранено в библиотеке" : "Сохранить в библиотеку"} onPress={() => void saveTrack(track)} style={styles.iconButton}>
                  <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={18} color={isSaved ? appConfig.primaryColor : "#d8e4e6"} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel={`Play ${track.title}`} disabled={playingId !== null} onPress={() => void playTrack(track)} style={styles.playButton}>
                  {playingId === track.id ? <ActivityIndicator color="#071014" size="small" /> : <Ionicons name="play" size={17} color="#071014" />}
                </Pressable>
              </View>
            </BlurView>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#071014" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 20, paddingTop: 32, paddingBottom: 36, gap: 13 },
  eyebrow: { color: appConfig.primaryColor, fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: "#f2ffff", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#9baeb3", fontSize: 13, marginTop: -7 },
  searchBar: { flexDirection: "row", gap: 8, padding: 9, borderRadius: 8, overflow: "hidden", borderColor: "rgba(0,255,204,0.22)", borderWidth: 1, backgroundColor: "rgba(17,30,35,0.58)" },
  input: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 11, color: "#f0f8f8", fontSize: 13, borderRadius: 5, borderColor: "rgba(220,245,247,0.14)", borderWidth: 1, backgroundColor: "rgba(3,10,13,0.46)" },
  searchButton: { width: 46, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 5, backgroundColor: appConfig.primaryColor },
  licenseNote: { color: "#829398", fontSize: 11 },
  error: { color: "#ff82a8", fontSize: 13 },
  notice: { color: appConfig.primaryColor, fontSize: 12 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, padding: 9, borderRadius: 7, overflow: "hidden", borderColor: "rgba(225,255,255,0.12)", borderWidth: 1, backgroundColor: "rgba(17,29,34,0.55)" },
  cover: { width: 50, height: 50, borderRadius: 4, backgroundColor: "#203137" },
  coverEmpty: { borderColor: "rgba(0,255,204,0.2)", borderWidth: 1 },
  trackDetails: { flex: 1, minWidth: 0, gap: 3 },
  trackTitle: { color: "#f2ffff", fontSize: 13, fontWeight: "700" },
  artist: { color: "#9baeb3", fontSize: 11 },
  license: { color: appConfig.primaryColor, fontSize: 9, marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 1 },
  iconButton: { width: 34, height: 38, alignItems: "center", justifyContent: "center" },
  playButton: { width: 34, height: 34, alignItems: "center", justifyContent: "center", borderRadius: 17, backgroundColor: appConfig.primaryColor },
  disabled: { opacity: 0.5 },
});