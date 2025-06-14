import type { SupabaseAudioTrack, SupabaseCollection, SupabaseSong } from "@/data/supabase.types";
import { supabase } from "@/lib/supabaseClient";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useCollectionsStore = defineStore("supabase", () => {
  const collections = ref<SupabaseCollection[]>([]);
  const songs = ref<SupabaseSong[]>([]);
  const audioTracks = ref<SupabaseAudioTrack[]>([]);

  const selectedCollectionId = ref<number | null>(null);
  const selectedSongId = ref<number | null>(null);

  async function getCollections() {
    const { data } = await supabase.from("collections").select();
    collections.value = data as SupabaseCollection[];
  }

  async function getSongsByCollectionId(collectionId: number) {
    const { data } = await supabase.from("songs").select("*").eq("collection_id", collectionId);
    return data as SupabaseSong[];
  }

  async function getAudioTracksBySongId(songId: number) {
    const { data } = await supabase.from("audio_tracks").select("*").eq("song_id", songId);
    return data as SupabaseAudioTrack[];
  }

  async function selectCollection(slug: string) {
    const collection = collections.value?.find((collection) => collection.slug === slug);
    if (collection) {
      selectedCollectionId.value = collection.id;
      songs.value = await getSongsByCollectionId(collection.id);
    }
  }

  async function selectSong(slug: string) {
    const song = songs.value?.find((song) => song.slug === slug);
    if (song) {
      selectedSongId.value = song.id;
      audioTracks.value = await getAudioTracksBySongId(song.id);
    }
  }

  const selectedCollection = computed(() => {
    return (
      collections.value?.find((collection) => collection.id === selectedCollectionId.value) ?? null
    );
  });

  const selectedSong = computed(() => {
    return songs.value?.find((song) => song.id === selectedSongId.value) ?? null;
  });

  return {
    collections,
    songs,
    audioTracks,
    getCollections,
    selectCollection,
    selectSong,
    selectedCollection,
    selectedSong
  };
});
