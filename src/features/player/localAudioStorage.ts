import * as FileSystem from "expo-file-system";

export interface PickedAudioFile {
  name: string;
  uri: string;
}

export interface StoredAudioFile {
  id: string;
  title: string;
  url: string;
}

const directoryName = "auralith-audio/";

export async function persistAudioFiles(files: PickedAudioFile[]): Promise<StoredAudioFile[]> {
  const documentDirectory = FileSystem.documentDirectory;
  if (!documentDirectory) throw new Error("Persistent app storage is unavailable");

  const directory = `${documentDirectory}${directoryName}`;
  const directoryInfo = await FileSystem.getInfoAsync(directory);
  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }

  return Promise.all(files.map(async (file) => {
    const safeName = file.name.replace(/[^\p{L}\p{N}._-]+/gu, "_");
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const destination = `${directory}${id}-${safeName || "audio"}`;
    await FileSystem.copyAsync({ from: file.uri, to: destination });
    return {
      id,
      title: file.name.replace(/\.[^.]+$/, "") || file.name,
      url: destination,
    };
  }));
}