# apk_player

## Auralith mobile foundation

This repository contains an Expo SDK 52 TypeScript app scaffold. Install dependencies with pnpm, then build a custom Android development client. `react-native-track-player` and Android audio effects require that development build; Expo Go is not sufficient.

```sh
pnpm install
pnpm dev
pnpm prebuild
pnpm run:android
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

The Import tab accepts supported platform share links and imports audio files from device storage using Android's system picker. Local files are queued directly. Imported catalog tracks are searched in Jamendo and can be queued only when a close Creative Commons match exists. Set a registered Jamendo `client_id` in `appConfig.jamendoClientId` to enable that licensed catalog adapter; metadata from the source service alone does not grant playback rights.

The player queue supports removing and selecting items, repeat off/all/one, and shuffle of upcoming items with restoration of the previous order. Speed, pitch, reverb, lyrics, saved playlists, offline caching, and discovery views are not implemented yet.

### Platform adapters

- `parseAppleMusicLink(url, credentials)` imports song, album, and playlist metadata through the Apple Music API. It requires a developer token; library playlists also require a Music User Token. Apple signing keys must not be embedded in the app.
- `parseYandexMusicLink(url, oauthToken)` imports tracks, albums, and playlists with a user OAuth token. Yandex Music's API is not a stable public contract and may change or restrict client access.
- `parseDeezerLink` imports tracks, albums, and playlists from Deezer links using its metadata API. Deezer may restrict API access for newly registered applications; the parser surfaces those API errors instead of silently returning an empty list.
- `parseSoundCloudLink(url, accessToken)` resolves SoundCloud track and playlist links. It requires an OAuth access token from a registered SoundCloud application and sends it only in the authorization header.
- `parseTidalLink(url, accessToken, countryCode)` imports track and playlist metadata using a Tidal bearer token. Tidal API access depends on application registration and account permissions; no client secret is embedded in the parser.
- These importers provide catalog metadata only. They do not grant rights to stream full tracks through Track Player. Keep provider tokens in SecureStore and obtain them through each provider's supported user-authorization flow.
- `audioResolver.ts` validates licensed HTTPS adapters. YouTube's supported APIs do not expose downloadable audio stream URLs; the app links to official YouTube search rather than extracting streams.
- `modules/audio-effects` implements Android `Equalizer` and `BassBoost`. A pinned patch in `patches/react-native-track-player@4.1.2.patch` exposes RNTP's ExoPlayer session ID to JS; `App.tsx` passes it to `EqualizerScreen`. The patch reads a protected KotlinAudio field reflectively, so it must be rechecked when upgrading RNTP or KotlinAudio. The Android Gradle build still needs validation on a machine with Android SDK and `adb` installed.
- Expo config includes the `auralith` URL scheme. RNTP 4.1.x is linked by React Native autolinking and does not ship an Expo config plugin; listing `react-native-track-player` in `plugins` makes Expo config resolution fail. Rebuild the development client after native configuration changes.
- This app is an independent implementation. It does not reuse Liner desktop source, algorithms, or assets. The settings link is only a reference link and should not be presented as an endorsement or affiliation.