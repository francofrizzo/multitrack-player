<script setup lang="ts">
import SongMenu from "@/components/SongMenu.vue";
import type { Song } from "@/data/song.types";
import type { SupabaseCollection } from "@/data/supabase.types";
import { supabaseCollectionToCollection } from "@/data/utils";

const props = defineProps<{
  collection: SupabaseCollection;
  song: Song;
}>();
</script>

<template>
  <div class="flex items-center gap-3 sm:gap-4 min-w-0">
    <SongMenu :collection="supabaseCollectionToCollection(props.collection)" class="shrink-0" />

    <div class="flex flex-col tracking-wide min-w-0 gap-1">
      <span class="text-lg font-semibold text-ellipsis line-clamp-2 leading-tight tracking-tight">{{
        props.song.title
      }}</span>
      <span class="text-xs font-medium uppercase text-base-content/50 text-ellipsis line-clamp-1">{{
        props.collection.title
      }}</span>
    </div>
  </div>
</template>
