import { useState } from "react";
import * as DocumentPicker from "expo-document-picker";
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
import { BlurView } from "expo-blur";

import { parseAppleMusicLink } from "../features/import/appleMusic/appleMusicParser";
import { parseDeezerLink } from "../features/import/deezer/deezerParser";
import { parseSoundCloudLink } from "../features/import/soundcloud/soundcloudParser";
import { parseSpotifyPlaylist } from "../features/import/spotify/spotifyParser";
import { useSpotifyAuth } from "../features/import/spotify/useSpotifyAuth";
import { parseTidalLink } from "../features/import/tidal/tidalParser";
import { parseYandexMusicLink } from "../features/import/yandex/yandexParser";
import { queueLocalAudioFiles, queueTrackFromLicensedCatalog } from "../features/player/queueTrack";
import { persistAudioFiles } from "../features/player/localAudioStorage";
import { saveLibraryTrack } from "../features/library/libraryStore";
import { appConfig } from "../shared/config/appConfig";
import { getUserToken, type SecureTokenProvider } from "../shared/config/secureStorage";
import type { UniversalTrack } from "../shared/types/UniversalTrack";

type ImportPlatform =
  | "spotify"
  | "appleMusic"
  | "yandexMusic"
  | "deezer"
  | "soundcloud"
  | "tidal";

const platforms: Array<{ key: ImportPlatform; label: string; placeholder: string }> = [
  { key: "spotify", label: "Spotify", placeholder: "Ссылка на плейлист Spotify" },
  { key: "appleMusic", label: "Apple Music", placeholder: "Ссылка на песню, альбом или плейлист" },
  { key: "yandexMusic", label: "Яндекс", placeholder: "Ссылка на трек, альбом или плейлист" },
  { key: "deezer", label: "Deezer", placeholder: "Ссылка на трек, альбом или плейлист" },
  { key: "soundcloud", label: "SoundCloud", placeholder: "Ссылка на трек или плейлист" },
  { key: "tidal", label: "Tidal", placeholder: "Ссылка на трек или плейлист" },
];

interface ImportScreenProps {
  onTrackQueued: () => void;
}

export function ImportScreen({ onTrackQueued }: ImportScreenProps) {
  const { accessToken: spotifyToken, signIn, isReady: spotifyReady } = useSpotifyAuth();
  const [platform, setPlatform] = useState<ImportPlatform>("spotify");
  const [shareUrl, setShareUrl] = useState("");
  const [tracks, setTracks] = useState<UniversalTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pickingFiles, setPickingFiles] = useState(false);

  async function importTracks() {
    setLoading(true);
    setError(null);
    setNotice(null);
    setTracks([]);
    try {
      let result: UniversalTrack[];
      switch (platform) {
        case "spotify": {
          if (!spotifyToken) throw new Error("Сначала подключите Spotify в настройках");
          result = await parseSpotifyPlaylist(shareUrl, spotifyToken);
          break;
        }
        case "appleMusic": {
          const developerToken = await getUserToken("appleMusic");
          if (!developerToken) throw new Error("Сохраните Apple Music Developer Token в настройках");
          const userToken = await getUserToken("appleMusicUser");
          result = await parseAppleMusicLink(shareUrl, { developerToken, userToken: userToken ?? undefined });
          break;
        }
        case "yandexMusic": {
          const token = await getUserToken("yandexMusic");
          if (!token) throw new Error("Сохраните Яндекс OAuth token в настройках");
          result = await parseYandexMusicLink(shareUrl, token);
          break;
        }
        case "deezer": {
          const token = await getUserToken("deezer");
          result = await parseDeezerLink(shareUrl, token ?? undefined);
          break;
        }
        case "soundcloud": {
          const token = await getUserToken("soundcloud");
          if (!token) throw new Error("Сохраните SoundCloud access token в настройках");
          result = await parseSoundCloudLink(shareUrl, token);
          break;
        }
        case "tidal": {
          const token = await getUserToken("tidal");
          if (!token) throw new Error("Сохраните Tidal bearer token в настройках");
          result = await parseTidalLink(shareUrl, token, appConfig.tidalCountryCode);
          break;
        }
      }
      setTracks(result);
      if (result.length === 0) setNotice("По этой ссылке треки не найдены");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось импортировать треки");
    } finally {
      setLoading(false);
    }
  }

  async function addTrack(track: UniversalTrack) {
    setAddingId(track.id);
    setError(null);
    setNotice(null);
    try {
      await queueTrackFromLicensedCatalog(track, appConfig.jamendoClientId);
      setNotice(`Добавлено: ${track.title}`);
      onTrackQueued();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось добавить трек в очередь");
    } finally {
      setAddingId(null);
    }
  }

  async function importLocalAudio() {
    setPickingFiles(true);
    setError(null);
    setNotice(null);
    try {
      const selection = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (selection.canceled) return;

      const localTracks = await persistAudioFiles(selection.assets.map((asset) => ({
        name: asset.name,
        uri: asset.uri,
      })));
      if (localTracks.length === 0) return;
      await Promise.all(localTracks.map((file) => saveLibraryTrack({
        id: file.id,
        title: file.title,
        artist: "Локальный файл",
        album: "На устройстве",
        coverUrl: "",
        duration: 0,
        sourcePlatform: "local",
        localUri: file.url,
      })));
      await queueLocalAudioFiles(localTracks);
      setNotice(`Импортировано и добавлено файлов: ${localTracks.length}`);
      onTrackQueued();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось импортировать аудиофайлы");
    } finally {
      setPickingFiles(false);
    }
  }

  const selectedPlatform = platforms.find((item) => item.key === platform)!;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>AURALITH / LIBRARY</Text>
        <Text style={styles.title}>Импорт музыки</Text>
        <Text style={styles.subtitle}>Откройте share-ссылку, чтобы получить метаданные треков.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platforms}>
          {platforms.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected: platform === item.key }}
              onPress={() => {
                setPlatform(item.key);
                setTracks([]);
                setError(null);
                setNotice(null);
              }}
              style={[styles.platformButton, platform === item.key && styles.platformButtonSelected]}
            >
              <Text style={[styles.platformLabel, platform === item.key && styles.platformLabelSelected]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Pressable
          accessibilityRole="button"
          disabled={pickingFiles}
          onPress={() => void importLocalAudio()}
          style={[styles.localButton, pickingFiles && styles.disabled]}
        >
          {pickingFiles ? (
            <ActivityIndicator color={appConfig.primaryColor} size="small" />
          ) : (
            <>
              <Text style={styles.localButtonText}>Выбрать аудиофайлы с устройства</Text>
              <Text style={styles.localButtonHint}>MP3, M4A, FLAC и другие поддерживаемые форматы</Text>
            </>
          )}
        </Pressable>

        {platform === "spotify" && !spotifyToken ? (
          <Pressable
            accessibilityRole="button"
            disabled={!spotifyReady}
            onPress={() => void signIn()}
            style={[styles.authButton, !spotifyReady && styles.disabled]}
          >
            <Text style={styles.authButtonText}>Подключить Spotify</Text>
          </Pressable>
        ) : null}

        <BlurView intensity={32} tint="dark" style={styles.importCard}>
          <TextInput
            accessibilityLabel={`${selectedPlatform.label} share link`}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            onChangeText={setShareUrl}
            placeholder={selectedPlatform.placeholder}
            placeholderTextColor="#738187"
            style={styles.urlInput}
            value={shareUrl}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!shareUrl.trim() || loading}
            onPress={() => void importTracks()}
            style={[styles.importButton, (!shareUrl.trim() || loading) && styles.disabled]}
          >
            {loading ? <ActivityIndicator color="#071014" /> : <Text style={styles.importButtonText}>Импортировать</Text>}
          </Pressable>
        </BlurView>

        <Text style={styles.licenseNote}>
          Аудио добавляется только при совпадении в Jamendo с Creative Commons лицензией. Нужен client ID в appConfig.
        </Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        {tracks.map((track) => (
          <BlurView key={`${track.sourcePlatform}:${track.id}`} intensity={28} tint="dark" style={styles.trackRow}>
            {track.coverUrl ? (
              <Image source={{ uri: track.coverUrl }} style={styles.cover} />
            ) : (
              <View style={[styles.cover, styles.coverEmpty]} />
            )}
            <View style={styles.trackDetails}>
              <Text numberOfLines={1} style={styles.trackTitle}>{track.title}</Text>
              <Text numberOfLines={1} style={styles.trackArtist}>{track.artist}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Add ${track.title} to queue`}
              disabled={addingId !== null}
              onPress={() => void addTrack(track)}
              style={[styles.addButton, addingId !== null && styles.disabled]}
            >
              {addingId === track.id ? (
                <ActivityIndicator color="#071014" size="small" />
              ) : (
                <Text style={styles.addButtonText}>В очередь</Text>
              )}
            </Pressable>
          </BlurView>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#071014" },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 20, paddingTop: 32, paddingBottom: 36, gap: 14 },
  eyebrow: { color: appConfig.primaryColor, fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  title: { color: "#f2ffff", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#9baeb3", fontSize: 13, marginTop: -7 },
  platforms: { gap: 8, paddingVertical: 5 },
  platformButton: { minHeight: 38, justifyContent: "center", paddingHorizontal: 13, borderRadius: 5, borderColor: "rgba(230,250,250,0.18)", borderWidth: 1, backgroundColor: "rgba(17,30,35,0.7)" },
  platformButtonSelected: { borderColor: appConfig.primaryColor, backgroundColor: "rgba(0,255,204,0.13)" },
  platformLabel: { color: "#a9b9bd", fontSize: 12, fontWeight: "600" },
  platformLabelSelected: { color: appConfig.primaryColor },
  localButton: { minHeight: 58, justifyContent: "center", gap: 4, paddingHorizontal: 13, borderRadius: 6, borderWidth: 1, borderColor: "rgba(255,0,127,0.38)", backgroundColor: "rgba(255,0,127,0.08)" },
  localButtonText: { color: "#ffb0d1", fontSize: 12, fontWeight: "700" },
  localButtonHint: { color: "#9a8791", fontSize: 10 },
  authButton: { alignSelf: "flex-start", minHeight: 38, justifyContent: "center", paddingHorizontal: 14, borderRadius: 5, backgroundColor: "#1ed760" },
  authButtonText: { color: "#071014", fontWeight: "700", fontSize: 12 },
  importCard: { flexDirection: "row", gap: 9, padding: 12, borderRadius: 8, overflow: "hidden", borderColor: "rgba(0,255,204,0.2)", borderWidth: 1, backgroundColor: "rgba(18,30,35,0.54)" },
  urlInput: { flex: 1, minWidth: 0, color: "#f0f8f8", fontSize: 13, paddingHorizontal: 11, minHeight: 46, borderRadius: 5, borderColor: "rgba(220,245,247,0.16)", borderWidth: 1, backgroundColor: "rgba(3,10,13,0.5)" },
  importButton: { minWidth: 116, minHeight: 46, justifyContent: "center", alignItems: "center", paddingHorizontal: 11, borderRadius: 5, backgroundColor: appConfig.primaryColor },
  importButtonText: { color: "#071014", fontSize: 12, fontWeight: "800" },
  licenseNote: { color: "#829398", fontSize: 11, lineHeight: 16 },
  error: { color: "#ff82a8", fontSize: 13 },
  notice: { color: appConfig.primaryColor, fontSize: 12 },
  trackRow: { flexDirection: "row", alignItems: "center", gap: 11, padding: 10, borderRadius: 7, overflow: "hidden", borderColor: "rgba(225,255,255,0.12)", borderWidth: 1, backgroundColor: "rgba(17,29,34,0.54)" },
  cover: { width: 48, height: 48, borderRadius: 4, backgroundColor: "#203137" },
  coverEmpty: { borderColor: "rgba(0,255,204,0.2)", borderWidth: 1 },
  trackDetails: { flex: 1, minWidth: 0, gap: 4 },
  trackTitle: { color: "#f2ffff", fontSize: 13, fontWeight: "700" },
  trackArtist: { color: "#9baeb3", fontSize: 11 },
  addButton: { minWidth: 82, minHeight: 38, justifyContent: "center", alignItems: "center", paddingHorizontal: 8, borderRadius: 5, backgroundColor: appConfig.primaryColor },
  addButtonText: { color: "#071014", fontSize: 11, fontWeight: "800" },
  disabled: { opacity: 0.5 },
});