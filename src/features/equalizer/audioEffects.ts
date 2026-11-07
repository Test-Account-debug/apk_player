import { requireOptionalNativeModule } from "expo-modules-core";

interface AudioEffectsNativeModule {
  attach(audioSessionId: number): Promise<void> | void;
  setBandLevel(band: number, levelDb: number): void;
  setBassBoost(enabled: boolean, strength: number): void;
  release(): void;
}

const nativeModule = requireOptionalNativeModule<AudioEffectsNativeModule>(
  "AuralithAudioEffects",
);

export const isAudioEffectsAvailable = Boolean(nativeModule);

function requireNativeModule(): AudioEffectsNativeModule {
  if (!nativeModule) {
    throw new Error("AuralithAudioEffects requires the Android native module");
  }
  return nativeModule;
}

export const audioEffects = {
  attach: (audioSessionId: number) => requireNativeModule().attach(audioSessionId),
  setBandLevel: (band: number, levelDb: number) =>
    requireNativeModule().setBandLevel(band, levelDb),
  setBassBoost: (enabled: boolean, strength: number) =>
    requireNativeModule().setBassBoost(enabled, strength),
  release: () => requireNativeModule().release(),
};