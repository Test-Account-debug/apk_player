import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as WebBrowser from "expo-web-browser";

import { useSpotifyAuth } from "../features/import/spotify/useSpotifyAuth";
import { appConfig } from "../shared/config/appConfig";
import {
  deleteUserToken,
  getUserToken,
  saveUserToken,
  type SecureTokenProvider,
} from "../shared/config/secureStorage";

const tokenProviders: Array<{
  key: SecureTokenProvider;
  title: string;
  placeholder: string;
}> = [
  { key: "appleMusic", title: "Apple Music Developer Token", placeholder: "Developer token" },
  { key: "appleMusicUser", title: "Apple Music User Token (optional)", placeholder: "User token for library playlists" },
  { key: "yandexMusic", title: "Яндекс Музыка OAuth", placeholder: "OAuth token" },
  { key: "soundcloud", title: "SoundCloud Access Token", placeholder: "Access token" },
  { key: "tidal", title: "Tidal Bearer Token", placeholder: "Bearer token" },
  { key: "deezer", title: "Deezer OAuth Access Token (optional)", placeholder: "Для ссылок на private playlist" },
];

type TokenValues = Record<SecureTokenProvider, string>;

const emptyTokens: TokenValues = {
  appleMusic: "",
  appleMusicUser: "",
  yandexMusic: "",
  soundcloud: "",
  tidal: "",
  deezer: "",
};

export function SettingsScreen() {
  const { accessToken, error: spotifyError, isReady, signIn } = useSpotifyAuth();
  const [tokens, setTokens] = useState<TokenValues>(emptyTokens);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<SecureTokenProvider | null>(null);
  const [saved, setSaved] = useState<SecureTokenProvider | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all(
      tokenProviders.map(async ({ key }) => [key, (await getUserToken(key)) ?? ""] as const),
    )
      .then((entries) => {
        if (active) setTokens(Object.fromEntries(entries) as TokenValues);
      })
      .catch((cause) => {
        if (active) {
          setStorageError(cause instanceof Error ? cause.message : "Не удалось прочитать токены");
        }
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave(provider: SecureTokenProvider) {
    setSaving(provider);
    setSaved(null);
    setStorageError(null);
    try {
      const value = tokens[provider].trim();
      if (value) await saveUserToken(provider, value);
      else await deleteUserToken(provider);
      setSaved(provider);
    } catch (cause) {
      setStorageError(cause instanceof Error ? cause.message : "Не удалось сохранить токен");
    } finally {
      setSaving(null);
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#071014", "#10191e", "#160d17"]}
        locations={[0, 0.58, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>AURALITH / ACCOUNT</Text>
        <Text style={styles.title}>Auralith Settings</Text>

        <BlurView intensity={38} tint="dark" style={styles.spotifyCard}>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.cardTitle}>Spotify</Text>
              <Text style={styles.cardSubtitle}>Приватные плейлисты и библиотека</Text>
            </View>
            <View style={[styles.statusDot, accessToken ? styles.connectedDot : styles.disconnectedDot]} />
          </View>
          <Text style={[styles.statusText, accessToken ? styles.connectedText : null]}>
            {accessToken ? "Подключено" : "Войти"}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!isReady}
            onPress={() => void signIn()}
            style={({ pressed }) => [styles.spotifyButton, pressed && styles.pressed, !isReady && styles.disabled]}
          >
            <Text style={styles.spotifyButtonText}>Синхронизировать Spotify</Text>
          </Pressable>
          {spotifyError ? <Text style={styles.errorText}>{spotifyError}</Text> : null}
        </BlurView>

        <Text style={styles.sectionTitle}>ПОДКЛЮЧЕНИЯ</Text>
        {tokenProviders.map((provider) => (
          <BlurView key={provider.key} intensity={32} tint="dark" style={styles.tokenCard}>
            <Text style={styles.cardTitle}>{provider.title}</Text>
            <View style={styles.inputRow}>
              <TextInput
                accessibilityLabel={provider.title}
                autoCapitalize="none"
                autoCorrect={false}
                editable={loaded && saving !== provider.key}
                onChangeText={(value) => setTokens((current) => ({ ...current, [provider.key]: value }))}
                placeholder={loaded ? provider.placeholder : "Загрузка..."}
                placeholderTextColor="#738187"
                secureTextEntry
                style={styles.input}
                value={tokens[provider.key]}
              />
              <Pressable
                accessibilityRole="button"
                disabled={!loaded || saving !== null}
                onPress={() => void handleSave(provider.key)}
                style={({ pressed }) => [styles.saveButton, pressed && styles.pressed, (!loaded || saving !== null) && styles.disabled]}
              >
                {saving === provider.key ? (
                  <ActivityIndicator color="#071014" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Сохранить</Text>
                )}
              </Pressable>
            </View>
            {saved === provider.key ? <Text style={styles.savedText}>Сохранено на устройстве</Text> : null}
          </BlurView>
        ))}

        {storageError ? <Text accessibilityRole="alert" style={styles.errorText}>{storageError}</Text> : null}

        <BlurView intensity={38} tint="dark" style={styles.footerCard}>
          <View style={styles.footerCopy}>
            <Text style={styles.footerTitle}>Desktop project reference</Text>
            <Text style={styles.footerSubtitle}>Ссылка на исходный сайт, без аффилиации</Text>
          </View>
          <Pressable
            accessibilityRole="link"
            onPress={() => void WebBrowser.openBrowserAsync(appConfig.platformUrl)}
            style={({ pressed }) => [styles.openButton, pressed && styles.pressed]}
          >
            <Text style={styles.openButtonText}>Открыть</Text>
          </Pressable>
        </BlurView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#071014" },
  content: { width: "100%", maxWidth: 680, alignSelf: "center", padding: 22, paddingTop: 32, paddingBottom: 40, gap: 14 },
  eyebrow: { color: appConfig.primaryColor, fontSize: 11, fontWeight: "700", letterSpacing: 1.4 },
  title: { color: "#f2ffff", fontSize: 29, fontWeight: "800", marginBottom: 8 },
  spotifyCard: { padding: 18, borderRadius: 8, overflow: "hidden", borderColor: "rgba(0,255,204,0.28)", borderWidth: 1, backgroundColor: "rgba(17,31,36,0.42)" },
  sectionHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { color: "#f0f8f8", fontSize: 15, fontWeight: "700" },
  cardSubtitle: { color: "#9baeb3", fontSize: 12, marginTop: 4 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  connectedDot: { backgroundColor: appConfig.primaryColor },
  disconnectedDot: { backgroundColor: "#718087" },
  statusText: { color: "#b3c1c4", fontSize: 13, marginTop: 16, marginBottom: 10 },
  connectedText: { color: appConfig.primaryColor },
  spotifyButton: { minHeight: 46, justifyContent: "center", alignItems: "center", borderRadius: 6, backgroundColor: "#1ed760", paddingHorizontal: 14 },
  spotifyButtonText: { color: "#071014", fontSize: 14, fontWeight: "800" },
  sectionTitle: { color: "#91a3a8", fontSize: 11, fontWeight: "700", letterSpacing: 1.2, marginTop: 8 },
  tokenCard: { padding: 14, borderRadius: 8, overflow: "hidden", borderColor: "rgba(230,250,250,0.13)", borderWidth: 1, backgroundColor: "rgba(18,28,33,0.44)" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  input: { flex: 1, minWidth: 0, height: 44, color: "#effafa", borderRadius: 5, borderColor: "rgba(210,235,237,0.18)", borderWidth: 1, paddingHorizontal: 11, fontSize: 13, backgroundColor: "rgba(2,10,13,0.36)" },
  saveButton: { minWidth: 92, minHeight: 42, borderRadius: 5, alignItems: "center", justifyContent: "center", paddingHorizontal: 10, backgroundColor: appConfig.primaryColor },
  saveButtonText: { color: "#071014", fontSize: 12, fontWeight: "800" },
  savedText: { color: appConfig.primaryColor, fontSize: 11, marginTop: 8 },
  errorText: { color: "#ff7aa7", fontSize: 12, marginTop: 8 },
  footerCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14, padding: 16, marginTop: 10, borderRadius: 8, overflow: "hidden", borderColor: "rgba(255,0,127,0.3)", borderWidth: 1, backgroundColor: "rgba(26,16,27,0.52)" },
  footerCopy: { flex: 1 },
  footerTitle: { color: "#f4eff4", fontSize: 13, fontWeight: "700" },
  footerSubtitle: { color: "#a99ba5", fontSize: 11, marginTop: 4 },
  openButton: { minHeight: 40, justifyContent: "center", paddingHorizontal: 14, borderRadius: 5, backgroundColor: "rgba(255,0,127,0.16)", borderColor: appConfig.accentColor, borderWidth: 1 },
  openButtonText: { color: "#ff9fc6", fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.78 },
  disabled: { opacity: 0.5 },
});