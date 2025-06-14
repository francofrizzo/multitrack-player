<script setup lang="ts">
import type { SupabaseCollection } from "@/data/supabase.types";
import { useCollectionsStore } from "@/stores/collections";
import { Menu } from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps<{
  collection: SupabaseCollection;
}>();

const collectionsStore = useCollectionsStore();

const songMenuItems = computed(() => {
  return collectionsStore.songs.map((song) => ({
    label: song.title,
    id: song.slug
  }));
});

const otherCollectionMenuItems = computed(() => {
  return collectionsStore.collections
    .filter(
      (collection) => collection.slug !== props.collection.slug && collection.visible !== false
    )
    .map((collection) => ({
      label: collection.title,
      id: collection.slug
    }));
});
</script>

<template>
  <div class="flex items-center gap-4">
    <div class="drawer">
      <input id="my-drawer" type="checkbox" class="drawer-toggle" />
      <div class="drawer-content">
        <label class="btn btn-square btn-primary btn-lg flex-shrink-0" htmlFor="my-drawer">
          <Menu class="w-5 h-5" />
        </label>
      </div>
      <div class="drawer-side z-50">
        <label htmlFor="my-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
        <div class="min-h-full w-80 flex lg:p-3">
          <div
            class="bg-base-100/75 backdrop-blur-lg px-3 lg:px-1 py-7 flex flex-col gap-6 justify-between text-base-content shadow-lg border border-base-200 lg:rounded-box"
          >
            <div class="flex flex-col gap-2">
              <span class="text-base-content/60 font-medium uppercase px-5 tracking-wide">{{
                collection.title
              }}</span>
              <ul class="menu w-full">
                <li>
                  <a
                    v-for="song in songMenuItems"
                    :key="song.label"
                    @click="collectionsStore.selectSong(song.id)"
                    :class="{
                      'menu-focus': collectionsStore.selectedSong?.slug === song.id
                    }"
                  >
                    {{ song.label }}
                  </a>
                </li>
              </ul>
            </div>
            <div class="flex flex-col gap-2" v-if="otherCollectionMenuItems.length > 0">
              <span class="text-base-content/60 font-medium uppercase text-sm px-5 tracking-wide"
                >Otras colecciones</span
              >
              <ul class="menu w-full">
                <li>
                  <a
                    v-for="collection in otherCollectionMenuItems"
                    :key="collection.label"
                    @click="collectionsStore.selectCollection(collection.id)"
                    :class="{
                      'btn-active': collectionsStore.selectedCollection?.slug === collection.id
                    }"
                  >
                    {{ collection.label }}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
