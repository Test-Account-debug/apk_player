import * as SecureStore from "expo-secure-store";

export type SecureTokenProvider =
  | "appleMusic"
  | "appleMusicUser"
  | "yandexMusic"
  | "soundcloud"
  | "tidal"
  | "deezer";

const storageKey = (provider: SecureTokenProvider) => `auralith.auth.${provider}`;

export async function saveUserToken(
  provider: SecureTokenProvider,
  token: string,
): Promise<void> {
  const value = token.trim();
  if (!value) throw new Error("Token cannot be empty");
  if (!(await SecureStore.isAvailableAsync())) {
    throw new Error("Secure storage is unavailable on this device");
  }

  await SecureStore.setItemAsync(storageKey(provider), value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getUserToken(
  provider: SecureTokenProvider,
): Promise<string | null> {
  if (!(await SecureStore.isAvailableAsync())) {
    throw new Error("Secure storage is unavailable on this device");
  }
  return SecureStore.getItemAsync(storageKey(provider));
}

export async function deleteUserToken(provider: SecureTokenProvider): Promise<void> {
  await SecureStore.deleteItemAsync(storageKey(provider));
}