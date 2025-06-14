<script setup lang="ts">
import LoadingScreen from "@/components/LoadingScreen.vue";
import MultitrackPlayer from "@/components/MultitrackPlayer.vue";
import type { SupabaseCollection } from "@/data/supabase.types";
import { supabaseSongToSong } from "@/data/utils";
import { useCollectionsStore } from "@/stores/collections";

import { onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

const props = defineProps<{
  collectionSlug?: string;
  songSlug?: string;
}>();

const route = useRoute();
const router = useRouter();
const collectionsStore = useCollectionsStore();

// Load collection and song based on route parameters
onMounted(async () => {
  // Get collections
  await collectionsStore.getCollections();

  // If we have route parameters, use them
  if (props.collectionSlug) {
    await collectionsStore.selectCollection(props.collectionSlug);

    if (props.songSlug) {
      collectionsStore.selectSong(props.songSlug);
    } else if (collectionsStore.songs?.length > 0) {
      // If no song specified but we have songs, select the first one
      collectionsStore.selectSong(collectionsStore.songs[0].slug);
      router.push({
        name: "song",
        params: {
          collectionId: props.collectionSlug,
          songId: collectionsStore.songs[0].id
        }
      });
    }
  } else if (collectionsStore.collections.length > 0) {
    // If no collection specified, select the first available one
    const defaultCollection =
      collectionsStore.collections.find((c: SupabaseCollection) => c.visible !== false) ||
      collectionsStore.collections[0];
    if (defaultCollection) {
      await collectionsStore.selectCollection(defaultCollection.slug);
      if (collectionsStore.songs.length > 0) {
        collectionsStore.selectSong(collectionsStore.songs[0].slug);
        router.push({
          name: "song",
          params: {
            collectionId: defaultCollection.id,
            songId: collectionsStore.songs[0].id
          }
        });
      }
    }
  }
});

// Update the route when collection or song changes
watch(
  () => collectionsStore.selectedCollection,
  (collection) => {
    if (collection && route.params.collectionSlug !== collection.slug) {
      if (collectionsStore.selectedSong) {
        router.push({
          name: "song",
          params: {
            collectionSlug: collection.slug,
            songSlug: collectionsStore.selectedSong.slug
          }
        });
      } else {
        router.push({ name: "collection", params: { collectionId: collection.id } });
      }
    }
  }
);

watch(
  () => collectionsStore.selectedSong,
  (song) => {
    if (song && collectionsStore.selectedCollection) {
      router.push({
        name: "song",
        params: {
          collectionSlug: collectionsStore.selectedCollection.slug,
          songSlug: song.slug
        }
      });
    }
  }
);
</script>

<template>
  <MultitrackPlayer
    v-if="collectionsStore.selectedCollection && collectionsStore.selectedSong"
    :collection="collectionsStore.selectedCollection"
    :newCollection="collectionsStore.selectedCollection"
    :song="supabaseSongToSong(collectionsStore.selectedSong, collectionsStore.audioTracks)"
    :key="collectionsStore.selectedSong.id"
  />
  <LoadingScreen v-else />
</template>
