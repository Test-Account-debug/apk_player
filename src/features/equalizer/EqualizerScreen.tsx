import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import Slider from "@react-native-community/slider";

import { appConfig } from "../../shared/config/appConfig";
import { audioEffects, isAudioEffectsAvailable } from "./audioEffects";

const bands = ["60 Hz", "230 Hz", "910 Hz", "4 kHz", "14 kHz"];

interface EqualizerScreenProps {
  audioSessionId: number | null;
}

export function EqualizerScreen({ audioSessionId }: EqualizerScreenProps) {
  const [levels, setLevels] = useState([0, 0, 0, 0, 0]);
  const [bassBoost, setBassBoost] = useState(false);
  const canControlAudio = isAudioEffectsAvailable && audioSessionId !== null;

  useEffect(() => {
    if (!isAudioEffectsAvailable || audioSessionId === null) return;
    void audioEffects.attach(audioSessionId);
    return () => audioEffects.release();
  }, [audioSessionId]);

  function updateBand(index: number, levelDb: number) {
    setLevels((current) => current.map((value, i) => (i === index ? levelDb : value)));
    if (canControlAudio) audioEffects.setBandLevel(index, levelDb);
  }

  function updateBassBoost(enabled: boolean) {
    setBassBoost(enabled);
    if (canControlAudio) audioEffects.setBassBoost(enabled, 750);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EQUALIZER</Text>
      {!canControlAudio && (
        <Text style={styles.notice}>
          {isAudioEffectsAvailable
            ? "Attach the Android playback session to enable effects."
            : "Android audio-effects module is not installed."}
        </Text>
      )}
      <View style={styles.bands}>
        {bands.map((label, index) => (
          <View key={label} style={styles.band}>
            <Text style={styles.value}>{levels[index] > 0 ? "+" : ""}{levels[index]} dB</Text>
            <View style={styles.sliderTrack}>
              <Slider
                accessibilityLabel={`${label} equalizer band`}
                minimumValue={-12}
                maximumValue={12}
                step={1}
                value={levels[index]}
                onValueChange={(value) => updateBand(index, value)}
                minimumTrackTintColor={appConfig.primaryColor}
                maximumTrackTintColor="#46565e"
                thumbTintColor={appConfig.accentColor}
                style={styles.slider}
              />
            </View>
            <Text style={styles.frequency}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.bassRow}>
        <Text style={styles.bassLabel}>Bass Boost</Text>
        <Switch
          value={bassBoost}
          onValueChange={updateBassBoost}
          trackColor={{ false: "#46565e", true: appConfig.primaryColor }}
          thumbColor={bassBoost ? appConfig.accentColor : "#d8e2e4"}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#071014", padding: 24, justifyContent: "center" },
  title: { color: "#f4ffff", fontSize: 20, fontWeight: "700", letterSpacing: 0, marginBottom: 8 },
  notice: { color: "#a5b6bb", fontSize: 13, marginBottom: 24 },
  bands: { flexDirection: "row", justifyContent: "space-between", minHeight: 230 },
  band: { alignItems: "center", flex: 1, minWidth: 0 },
  value: { color: appConfig.primaryColor, fontSize: 11, height: 18 },
  sliderTrack: { width: 40, height: 156, alignItems: "center", justifyContent: "center", marginTop: 12 },
  slider: { position: "absolute", width: 148, height: 36, transform: [{ rotate: "-90deg" }] },
  frequency: { color: "#d9e3e5", fontSize: 11, marginTop: 8 },
  bassRow: { borderTopWidth: 1, borderTopColor: "#314047", marginTop: 24, paddingTop: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  bassLabel: { color: "#f4ffff", fontSize: 15, fontWeight: "600" },
});