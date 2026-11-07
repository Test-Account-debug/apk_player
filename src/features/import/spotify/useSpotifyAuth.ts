import { useEffect, useState } from "react";
import {
  exchangeCodeAsync,
  makeRedirectUri,
  refreshAsync,
  useAuthRequest,
} from "expo-auth-session";
import * as SecureStore from "expo-secure-store";

import { appConfig } from "../../../shared/config/appConfig";

const discovery = {
  authorizationEndpoint: "https://accounts.spotify.com/authorize",
  tokenEndpoint: "https://accounts.spotify.com/api/token",
};

interface StoredSpotifyToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

async function saveToken(token: StoredSpotifyToken): Promise<void> {
  await SecureStore.setItemAsync("spotify_tokens", JSON.stringify(token));
}

export function useSpotifyAuth() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: appConfig.spotifyClientId,
      scopes: ["playlist-read-private"],
      redirectUri: makeRedirectUri({ scheme: "auralith" }),
      usePKCE: true,
    },
    discovery,
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const stored = await SecureStore.getItemAsync("spotify_tokens");
        if (!stored) return;
        const token = JSON.parse(stored) as StoredSpotifyToken;
        if (token.expiresAt > Date.now() + 30_000) {
          if (active) setAccessToken(token.accessToken);
          return;
        }
        if (!token.refreshToken) return;

        const refreshed = await refreshAsync(
          { clientId: appConfig.spotifyClientId, refreshToken: token.refreshToken },
          discovery,
        );
        const updated: StoredSpotifyToken = {
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken ?? token.refreshToken,
          expiresAt: Date.now() + (refreshed.expiresIn ?? 3600) * 1000,
        };
        await saveToken(updated);
        if (active) setAccessToken(updated.accessToken);
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Could not restore Spotify session");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (response?.type !== "success" || !request?.codeVerifier) return;

    let active = true;
    void (async () => {
      try {
        const token = await exchangeCodeAsync(
          {
            clientId: appConfig.spotifyClientId,
            code: response.params.code,
            redirectUri: request.redirectUri,
            extraParams: { code_verifier: request.codeVerifier! },
          },
          discovery,
        );
        const stored: StoredSpotifyToken = {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: Date.now() + (token.expiresIn ?? 3600) * 1000,
        };
        await saveToken(stored);
        if (active) setAccessToken(stored.accessToken);
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Spotify sign-in failed");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [request, response]);

  return { accessToken, error, isReady: Boolean(request), signIn: promptAsync };
}