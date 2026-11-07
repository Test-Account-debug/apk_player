# apk_player

## Auralith mobile foundation

This repository currently contains the TypeScript feature modules, not a generated Expo app. Create an Expo TypeScript app (or copy these modules into one), then install the native dependencies below. `react-native-track-player` and Android audio effects require an Expo development build; Expo Go is not sufficient.

```sh
npx expo install expo-dev-client expo-blur expo-linear-gradient expo-web-browser expo-auth-session expo-secure-store react-native-webview @react-native-community/slider @expo/vector-icons
npm install react-native-track-player
npx expo prebuild
npx expo run:android
```

`react-native-webview` is included for other embedded web content; Spotify sign-in intentionally uses the system browser with PKCE, not an embedded WebView. Register the Spotify redirect URI shown by `makeRedirectUri({ scheme: "auralith" })` in the Spotify developer dashboard. Set the Spotify client ID in `src/shared/config/appConfig.ts`; a client ID is public, but never ship a client secret. Do not ship a shared Yandex token in the app bundle either: bundled values can be extracted, so obtain user authorization and keep user tokens in SecureStore. The requested `playlist-read-private` scope is used by `useSpotifyAuth` and is required before `parseSpotifyPlaylist` can read a private playlist.

### App entry point

Register the playback service before mounting the React tree, then initialize the player once during app startup:

```ts
import TrackPlayer from "react-native-track-player";
import { registerRootComponent } from "expo";
import App from "./App";

TrackPlayer.registerPlaybackService(() => require("./src/features/player/PlaybackService").default);
registerRootComponent(App);
```

Call `setupPlayer()` from `src/features/player/playerEngine.ts` before adding tracks. Add tracks with `TrackPlayer.add(...)`; `PlayerScreen` reads the active queue item and playback progress from Track Player.

### Platform adapters

- `parseAppleMusicLink(url, credentials)` imports song, album, and playlist metadata through the Apple Music API. It requires a developer token; library playlists also require a Music User Token. Apple signing keys must not be embedded in the app.
- `parseYandexMusicLink(url, oauthToken)` imports tracks, albums, and playlists with a user OAuth token. Yandex Music's API is not a stable public contract and may change or restrict client access.
- `parseDeezerLink` imports tracks, albums, and playlists from Deezer links using its metadata API. Deezer may restrict API access for newly registered applications; the parser surfaces those API errors instead of silently returning an empty list.
- `parseSoundCloudLink(url, accessToken)` resolves SoundCloud track and playlist links. It requires an OAuth access token from a registered SoundCloud application and sends it only in the authorization header.
- `parseTidalLink(url, accessToken, countryCode)` imports track and playlist metadata using a Tidal bearer token. Tidal API access depends on application registration and account permissions; no client secret is embedded in the parser.
- These importers provide catalog metadata only. They do not grant rights to stream full tracks through Track Player. Keep provider tokens in SecureStore and obtain them through each provider's supported user-authorization flow.
- `audioResolver.ts` accepts a licensed provider adapter. YouTube's supported APIs do not expose downloadable audio stream URLs; this project does not extract direct YouTube/YouTube Music streams. Use a provider that explicitly licenses playback and supplies an HTTPS stream.
- `modules/audio-effects` implements the Expo Android module with Android `Equalizer` and `BassBoost`, mapping the five requested frequencies to each device's available bands. Pass the native session ID as `EqualizerScreen`'s `audioSessionId` prop. Track Player does not expose a stable public audio-session-ID API, so exposing that ID from the native player (or maintaining a small native fork) is required before effects can attach reliably. Until the session ID is connected, the equalizer UI remains visible but does not alter audio.
- Expo config must include the `auralith` URL scheme and the Track Player config plugin required by the installed version. Rebuild the development client after native configuration changes.