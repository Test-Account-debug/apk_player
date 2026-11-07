import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

import {
  addLibraryTrackToPlaylist,
  createUserPlaylist,
  deleteUserPlaylist,
  loadLibrary,
  removeLibraryTrackFromPlaylist,
} from "../features/library/libraryStore";
import { getTrackKey, type LibrarySnapshot } from "../features/library/libraryModel";
import { queueLocalAudioFiles, queueTrackFromLicensedCatalog } from "../features/player/queueTrack";
import { appConfig } from "../shared/config/appConfig";
import type { UniversalTrack } from "../shared/types/UniversalTrack";

interface LibraryScreenProps {
  onTrackQueued: () => void;
}

export function LibraryScreen({ onTrackQueued }: LibraryScreenProps) {
  const [library, setLibrary] = useState<LibrarySnapshot | null>(null);
  const [playlistName, setPlaylistName] = useState("");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyTrackId, setBusyTrackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLibrary(await loadLibrary());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить библиотеку");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createPlaylist() {
    try {
      const updated = await createUserPlaylist(playlistName);
      setLibrary(updated);
      setPlaylistName("");
      setSelectedPlaylistId(updated.playlists[updated.playlists.length - 1]?.id ?? null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось создать плейлист");
    }
  }

  async function addTrack(playlistId: string, track: UniversalTrack) {
    try {
      setLibrary(await addLibraryTrackToPlaylist(playlistId, track));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось добавить трек");
    }
  }

  async function playTrack(track: UniversalTrack) {
    setBusyTrackId(getTrackKey(track));
    try {
      if (track.localUri) {
        await queueLocalAudioFiles([{ id: track.id, url: track.localUri, title: track.title }]);
      } else {
        await queueTrackFromLicensedCatalog(track, appConfig.jamendoClientId);
      }
      onTrackQueued();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось запустить трек");
    } finally {
      setBusyTrackId(null);
    }
  }

  async function removePlaylist(playlistId: string) {
    try {
      setLibrary(await deleteUserPlaylist(playlistId));
      if (selectedPlaylistId === playlistId) setSelectedPlaylistId(null);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось удалить плейлист");
    }
  }

  async function removeTrack(playlistId: string, trackId: string) {
    try {
      setLibrary(await removeLibraryTrackFromPlaylist(playlistId, trackId));
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось удалить трек из плейлиста");
    }
  }

  if (loading || !library) {
    return <View style={styles.loading}><ActivityIndicator color={appConfig.primaryColor} /></View>;
  }

  const favorites = library.favoriteTrackIds
    .map((id) => library.tracks[id])
    .filter((track): track is UniversalTrack => Boolean(track));
  const savedTracks = Object.values(library.tracks);
  const selectedPlaylist = library.playlists.find((playlist) => playlist.id === selectedPlaylistId);
  const selectedTracks = selectedPlaylist?.trackIds
    .map((id) => library.tracks[id])
    .filter((track): track is UniversalTrack => Boolean(track)) ?? [];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>AURALITH / COLLECTION</Text>
        <Text style={styles.title}>Библиотека</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

        <Text style={styles.sectionTitle}>ПЛЕЙЛИСТЫ</Text>
        <View style={styles.createRow}>
          <TextInput
            accessibilityLabel="Название нового плейлиста"
            onChangeText={setPlaylistName}
            onSubmitEditing={() => void createPlaylist()}
            placeholder="Новый плейлист"
            placeholderTextColor="#738187"
            returnKeyType="done"
            style={styles.input}
            value={playlistName}
          />
          <Pressable accessibilityRole="button" disabled={!playlistName.trim()} onPress={() => void createPlaylist()} style={[styles.createButton, !playlistName.trim() && styles.disabled]}>
            <Ionicons name="add" size={21} color="#071014" />
          </Pressable>
        </View>
        {library.playlists.length === 0 ? <Text style={styles.empty}>Пока нет плейлистов</Text> : null}
        {library.playlists.map((playlist) => (
          <BlurView key={playlist.id} intensity={26} tint="dark" style={styles.playlistRow}>
            <Pressable onPress={() => setSelectedPlaylistId(selectedPlaylistId === playlist.id ? null : playlist.id)} style={styles.playlistSelect}>
              <Text numberOfLines={1} style={styles.trackTitle}>{playlist.name}</Text>
              <Text style={styles.muted}>{playlist.trackIds.length} треков</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Удалить плейлист ${playlist.name}`} onPress={() => void removePlaylist(playlist.id)} style={styles.iconButton}>
              <Ionicons name="trash-outline" size={17} color="#a9b9bd" />
            </Pressable>
          </BlurView>
        ))}

        {selectedPlaylist ? (
          <View style={styles.selectedPlaylist}>
            <Text style={styles.sectionTitle}>{selectedPlaylist.name.toUpperCase()}</Text>
            {savedTracks.filter((track) => !selectedPlaylist.trackIds.includes(getTrackKey(track))).map((track) => (
              <View key={getTrackKey(track)} style={styles.addTrackRow}>
                <TrackLabel track={track} />
                <Pressable accessibilityRole="button" accessibilityLabel={`Добавить ${track.title} в плейлист`} onPress={() => void addTrack(selectedPlaylist.id, track)} style={styles.iconButton}>
                  <Ionicons name="add-circle-outline" size={21} color={appConfig.primaryColor} />
                </Pressable>
              </View>
            ))}
            {selectedTracks.map((track) => (
              <View key={getTrackKey(track)} style={styles.addTrackRow}>
                <TrackLabel track={track} />
                <Pressable accessibilityRole="button" accessibilityLabel={`Убрать ${track.title} из плейлиста`} onPress={() => void removeTrack(selectedPlaylist.id, getTrackKey(track))} style={styles.iconButton}>
                  <Ionicons name="close-circle-outline" size={21} color="#a9b9bd" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>ИЗБРАННОЕ · {favorites.length}</Text>
        {favorites.length === 0 ? <Text style={styles.empty}>Отмечайте треки сердцем в поиске</Text> : null}
        {favorites.map((track) => (
          <View key={getTrackKey(track)} style={styles.addTrackRow}>
            <TrackLabel track={track} />
            <Pressable accessibilityRole="button" accessibilityLabel={`Play ${track.title}`} disabled={busyTrackId !== null} onPress={() => void playTrack(track)} style={styles.playButton}>
              {busyTrackId === getTrackKey(track) ? <ActivityIndicator color="#071014" size="small" /> : <Ionicons name="play" size={15} color="#071014" />}
            </Pressable>
          </View>
        ))}

        <Text style={styles.sectionTitle}>СОХРАНЁННЫЕ ТРЕКИ · {savedTracks.length}</Text>
        {savedTracks.map((track) => (
          <View key={getTrackKey(track)} style={styles.addTrackRow}>
            <TrackLabel track={track} />
            <Pressable accessibilityRole="button" accessibilityLabel={`Play ${track.title}`} disabled={busyTrackId !== null} onPress={() => void playTrack(track)} style={styles.playButton}>
              {busyTrackId === getTrackKey(track) ? <ActivityIndicator color="#071014" size="small" /> : <Ionicons name="play" size={15} color="#071014" />}
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function TrackLabel({ track }: { track: UniversalTrack }) {
  return (
    <View style={styles.trackLabel}>
      <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
      <Text numberOfLines={1} style={styles.muted}>{track.artist}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#071014" },
  loading: { flex: 1, backgroundColor: "#071014", alignItems: "center", justifyContent: "center" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 20, paddingTop: 32, paddingBottom: 36, gap: 11 },
  eyebrow: { color: appConfig.primaryColor, fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: "#f2ffff", fontSize: 28, fontWeight: "800", marginBottom: 4 },
  sectionTitle: { color: "#91a3a8", fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginTop: 11 },
  createRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, minHeight: 42, borderRadius: 5, borderColor: "rgba(220,245,247,0.16)", borderWidth: 1, backgroundColor: "rgba(3,10,13,0.46)", paddingHorizontal: 11, color: "#effafa", fontSize: 13 },
  createButton: { width: 42, minHeight: 42, borderRadius: 5, alignItems: "center", justifyContent: "center", backgroundColor: appConfig.primaryColor },
  playlistRow: { flexDirection: "row", alignItems: "center", paddingLeft: 12, borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: "rgba(220,245,247,0.12)", backgroundColor: "rgba(17,29,34,0.55)" },
  playlistSelect: { flex: 1, paddingVertical: 10, gap: 3 },
  selectedPlaylist: { gap: 5, paddingTop: 7 },
  addTrackRow: { minHeight: 46, flexDirection: "row", alignItems: "center", borderBottomColor: "rgba(225,255,255,0.09)", borderBottomWidth: 1 },
  trackLabel: { flex: 1, minWidth: 0, gap: 3 },
  trackTitle: { color: "#e8f0f1", fontSize: 12, fontWeight: "600" },
  muted: { color: "#8fa0a5", fontSize: 10 },
  iconButton: { width: 40, height: 42, alignItems: "center", justifyContent: "center" },
  playButton: { width: 30, height: 30, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: appConfig.primaryColor },
  empty: { color: "#829398", fontSize: 12, paddingVertical: 5 },
  error: { color: appConfig.accentColor, fontSize: 12 },
  disabled: { opacity: 0.45 },
});