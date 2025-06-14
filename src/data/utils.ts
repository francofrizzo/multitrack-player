import type { Collection } from "@/data/collection.types";
import type { Song } from "@/data/song.types";
import type { SupabaseAudioTrack, SupabaseCollection, SupabaseSong } from "@/data/supabase.types";

export function supabaseCollectionToCollection(collection: SupabaseCollection): Collection {
  return {
    id: collection.slug,
    title: collection.title,
    enabled: collection.visible,
    songsFile: "x.json",
    artwork: collection.artwork_file_url ?? undefined,
    theme: {
      mainColor: collection.main_color,
      trackColors: collection.track_colors
    }
  };
}

export function supabaseSongToSong(song: SupabaseSong, tracks: SupabaseAudioTrack[]): Song {
  return {
    id: song.slug,
    collectionId: "",
    title: song.title,
    tracks: tracks.map((track) => ({
      id: track.color_key,
      title: track.title,
      file: track.audio_file_url
    })),
    lyrics: song.lyrics
  };
}
