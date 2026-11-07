import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
} from "react-native-track-player";

let initialized = false;

export async function setupPlayer(): Promise<void> {
  if (initialized) return;
  await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
  await TrackPlayer.updateOptions({
    android: { appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
  });
  initialized = true;
}