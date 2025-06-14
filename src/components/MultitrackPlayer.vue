<script setup lang="ts">
import { ChevronDown, Loader2 } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

import LyricsViewer from "@/components/LyricsViewer.vue";
import PlayerControls from "@/components/PlayerControls.vue";
import PlayerHeader from "@/components/PlayerHeader.vue";
import TimeCopier from "@/components/TimeCopier.vue";
import TrackPlayer from "@/components/TrackPlayer.vue";
import { useMediaSession } from "@/composables/useMediaSession";
import type { Collection, Song } from "@/data/data.types";
import { selectMostContrasting } from "@/utils/utils";

const props = defineProps<{
  collection: Collection;
  song: Song;
}>();

// General state
const sortedTracks = computed(() => {
  return [...props.song.audio_tracks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
});

const tracksIdsWithLyrics = () => {
  const tracks = new Set<number>();
  props.song.lyrics.forEach((stanza) => {
    stanza.forEach((item) => {
      if (Array.isArray(item)) {
        item.forEach((column) => {
          column.forEach((verse) => {
            verse.audio_track_ids?.forEach((trackId) => tracks.add(trackId));
          });
        });
      } else {
        item.audio_track_ids?.forEach((trackId) => tracks.add(trackId));
      }
    });
  });
  return Array.from(tracks);
};

const state = {
  currentTime: ref<number>(0),
  lastSeekTime: ref<number>(0),
  totalDuration: ref<number>(0),
  playing: ref(false),
  trackStates: ref(
    sortedTracks.value.map((track) => ({
      id: track.id,
      isReady: false,
      volume: 1,
      hasLyrics: tracksIdsWithLyrics().includes(track.id),
      lyricsEnabled: true
    }))
  )
};
const isReady = computed(() => state.trackStates.value.every((track) => track.isReady));
const trackIdsWithLyricsEnabled = computed(() => {
  return state.trackStates.value.filter((track) => track.lyricsEnabled).map((track) => track.id);
});

// Interactivity
const seekAllTracks = (time: number) => {
  trackPlayers.value.forEach((player) => {
    if (player) {
      player.seekTo(time);
    }
  });
  state.currentTime.value = time;
};

const onReady = (trackIndex: number, duration: number) => {
  state.trackStates.value[trackIndex]!.isReady = true;
  if (trackIndex === 0) {
    state.totalDuration.value = duration;
  }
};

const onTimeUpdate = (trackIndex: number, time: number) => {
  if (trackIndex === 0) {
    state.currentTime.value = time;
  }
};

const onFinish = (trackIndex: number) => {
  if (trackIndex === 0) {
    state.playing.value = false;
  }
};

const onVolumeChange = (trackIndex: number, volume: number) => {
  const clampedVolume = Math.max(0, Math.min(1, volume));
  state.trackStates.value[trackIndex]!.volume = clampedVolume;
  if (state.trackStates.value[trackIndex]!.volume > 0) {
    onSetTrackLyricsEnabled(sortedTracks.value[trackIndex]!.id, true);
  } else {
    onSetTrackLyricsEnabled(sortedTracks.value[trackIndex]!.id, false);
  }
};

const onToggleTrackMuted = (trackIndex: number, toggleLyrics: boolean) => {
  const shouldBeEnabled = state.trackStates.value[trackIndex]!.volume === 0;
  const newVolume = shouldBeEnabled ? 1 : 0;
  onVolumeChange(trackIndex, newVolume);
  if (toggleLyrics) {
    onSetTrackLyricsEnabled(sortedTracks.value[trackIndex]!.id, shouldBeEnabled);
  }
};

const onSoloTrack = (index: number, toggleLyrics: boolean) => {
  const isCurrentlySoloed = state.trackStates.value.every(
    (track, i) => i === index || track.volume === 0
  );

  state.trackStates.value.forEach((_, i) => {
    const shouldBeEnabled = i === index || isCurrentlySoloed;
    const newVolume = shouldBeEnabled ? 1 : 0;
    onVolumeChange(i, newVolume);
    if (toggleLyrics) {
      onSetTrackLyricsEnabled(sortedTracks.value[i]!.id, shouldBeEnabled);
    }
  });
};

const onSetTrackLyricsEnabled = (trackId: number, newState: boolean) => {
  const trackIndex = sortedTracks.value.findIndex((track) => track.id === trackId);
  if (trackIndex === -1) return;
  state.trackStates.value[trackIndex]!.lyricsEnabled = newState;
};

const onToggleTrackLyrics = (trackId: number) => {
  const trackIndex = sortedTracks.value.findIndex((track) => track.id === trackId);
  if (trackIndex === -1) return;
  onSetTrackLyricsEnabled(trackId, !state.trackStates.value[trackIndex]!.lyricsEnabled);
};

const onPlayPause = async (forcePlay?: boolean) => {
  // Initialize audio context for WebAudio API user gesture requirement
  if (!hasInitializedAudio.value) {
    try {
      await initializeAudioContext();
      // Try to play silent audio to unlock WebAudio context
      silentAudio.value?.play().catch(() => {
        console.debug("Silent audio play was blocked or failed");
      });
    } catch (e) {
      console.error("Failed to initialize audio context:", e);
    }
  }

  state.playing.value = forcePlay ?? !state.playing.value;
};

const onSeekToTime = (time: number) => {
  seekAllTracks(time);
};

const keydownHandler = (event: KeyboardEvent) => {
  if (event.key === " ") {
    event.preventDefault();
    onPlayPause();
  }
};

onMounted(() => {
  window.addEventListener("keydown", keydownHandler);
  initMediaSession();
});

onUnmounted(() => {
  window.removeEventListener("keydown", keydownHandler);
  stopSyncCheck();
  cleanupMediaSession();
});

// UI/Visual related state
const tracksExpanded = ref(true);

const colorVariables = computed(() => {
  try {
    const primaryColor = props.collection.main_color;
    const primaryColorContentValue = selectMostContrasting(primaryColor, ["white", "black"]);
    return {
      "--color-primary": primaryColor,
      "--color-primary-content": primaryColorContentValue
    };
  } catch {
    return {};
  }
});

// Audio playing trickery
const trackPlayers = ref<InstanceType<typeof TrackPlayer>[]>([]);
const syncInterval = ref<number | null>(null);
const SYNC_CHECK_INTERVAL = 1000;
const DRIFT_THRESHOLD = 0.05;
const hasInitializedAudio = ref(false);
const silentAudio = ref<HTMLAudioElement | null>(null);

const initializeAudioContext = () => {
  // Only run once
  if (hasInitializedAudio.value) {
    return Promise.resolve();
  }

  // Create silent audio element to unlock audio context on user interaction
  // This is needed for WebAudio API which requires user gesture to start playing
  silentAudio.value = new Audio();
  // Use a very short mp3 data URI
  silentAudio.value.src =
    "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAQABAQEBAQEBAQEBAQEBAQEBAQEB";
  silentAudio.value.load();
  hasInitializedAudio.value = true;
  return Promise.resolve();
};

const checkAndCorrectSync = () => {
  if (!state.playing.value || !isReady.value) return;
  const referenceTrack = trackPlayers.value[0];
  const referenceTime = referenceTrack?.waveSurfer?.getCurrentTime?.() ?? 0;
  trackPlayers.value.forEach((player) => {
    const time = player.waveSurfer?.getCurrentTime?.() ?? 0;
    const drift = time - referenceTime;
    if (Math.abs(drift) > DRIFT_THRESHOLD) {
      player.seekTo(referenceTime);
    }
  });
  state.currentTime.value = referenceTime;
};

const startSyncCheck = () => {
  stopSyncCheck();
  syncInterval.value = window.setInterval(checkAndCorrectSync, SYNC_CHECK_INTERVAL);
};

const stopSyncCheck = () => {
  if (syncInterval.value) {
    window.clearInterval(syncInterval.value);
    syncInterval.value = null;
  }
};

watch(
  () => state.playing.value,
  (isPlaying) => {
    if (isPlaying) {
      startSyncCheck();
    } else {
      stopSyncCheck();
    }
  }
);

// MediaSession
const mediaSessionOptions = computed(() => ({
  title: props.song.title,
  artist: "",
  album: props.collection.title,
  artwork: props.collection.artwork_file_url || "",
  duration: state.totalDuration.value
}));

const {
  currentTime: mediaSessionTime,
  isPlaying: mediaSessionPlaying,
  initMediaSession,
  cleanupMediaSession
} = useMediaSession(mediaSessionOptions, {
  onPlay: () => onPlayPause(true),
  onPause: () => onPlayPause(false),
  onSeek: (time) => onSeekToTime(time)
});

watch(
  () => state.currentTime.value,
  (time) => {
    mediaSessionTime.value = time;
  }
);
watch(
  () => state.playing.value,
  (playing) => {
    mediaSessionPlaying.value = playing;
  }
);
watch(mediaSessionPlaying, (playing) => {
  if (playing !== state.playing.value) {
    state.playing.value = playing;
  }
});
watch(mediaSessionTime, (time) => {
  if (Math.abs(time - state.currentTime.value) > 0.1) {
    seekAllTracks(time);
  }
});
</script>

<template>
  <div
    class="bg-base-200 flex w-full h-dvh flex-col md:gap-3 lg:gap-4 md:p-3 lg:p-4 select-none"
    :style="{ ...colorVariables }"
  >
    <div class="p-3 md:p-0 md:pb-3 flex items-center justify-between gap-3 relative">
      <PlayerHeader :collection="collection" :song="song" />
      <PlayerControls
        :currentTime="state.currentTime.value"
        :totalDuration="state.totalDuration.value"
        :isPlaying="state.playing.value"
        :isReady="isReady"
        @play-pause="onPlayPause"
      />
      <div class="absolute top-2 left-1/2 -translate-x-1/2 flex items-center justify-end">
        <TimeCopier :currentTime="state.currentTime.value" />
      </div>
    </div>

    <div class="h-full flex-grow-1 overflow-auto px-10 relative">
      <div class="bg-gradient-to-b from-base-200 to-transparent sticky inset-x-0 top-0 h-8" />
      <LyricsViewer
        :lyrics="song.lyrics"
        :currentTime="state.currentTime.value"
        :isDisabled="!isReady"
        :collection="collection"
        :enabledTrackIds="trackIdsWithLyricsEnabled"
        @seek="onSeekToTime"
      />
      <div class="bg-gradient-to-t from-base-200 to-transparent sticky inset-x-0 bottom-0 h-8" />
    </div>

    <div
      class="relative border-t md:border border-base-300 md:rounded-box bg-base-100 shadow-sm transition-[max-height] duration-300"
      :class="{ 'max-h-[45%]': tracksExpanded, 'max-h-2': !tracksExpanded }"
    >
      <div class="h-full overflow-hidden transition-all duration-300">
        <div class="h-full overflow-y-auto p-3">
          <TrackPlayer
            v-for="(track, index) in sortedTracks"
            :key="index"
            :track="track"
            :collection="collection"
            :isPlaying="state.playing.value"
            :isReady="state.trackStates.value[index].isReady"
            :volume="state.trackStates.value[index].volume"
            :hasLyrics="state.trackStates.value[index].hasLyrics"
            :lyricsEnabled="state.trackStates.value[index].lyricsEnabled"
            :ref="(el: InstanceType<typeof TrackPlayer>) => (trackPlayers[index] = el)"
            @ready="(duration: number) => onReady(index, duration)"
            @time-update="(time: number) => onTimeUpdate(index, time)"
            @volume-change="(volume: number) => onVolumeChange(index, volume)"
            @toggle-muted="(toggleLyrics: boolean) => onToggleTrackMuted(index, toggleLyrics)"
            @toggle-solo="(toggleLyrics: boolean) => onSoloTrack(index, toggleLyrics)"
            @toggle-lyrics="() => onToggleTrackLyrics(track.id)"
            @seek="onSeekToTime"
            @finish="onFinish(index)"
          />
        </div>
      </div>

      <div
        class="absolute inset-x-0 top-0 -mt-6 h-6 pointer-events-none flex justify-center z-10 cursor-pointer"
      >
        <button
          class="p-2 pointer-events-auto bg-base-100 text-base-content/50 rounded-t-box w-16 flex items-center justify-center border-t border-r border-l border-base-300 cursor-pointer"
          @click="tracksExpanded = !tracksExpanded"
        >
          <ChevronDown
            class="w-7 h-7 transition-transform duration-300"
            :class="{ 'rotate-180': !tracksExpanded }"
          />
        </button>
      </div>

      <div
        v-if="!isReady"
        class="absolute inset-0 z-10 bg-base-100 rounded-box opacity-80 flex gap-4 text-lg items-center justify-center text-base-content/50 select-none"
      >
        <Loader2 class="size-6 animate-spin" />
        <span class="uppercase tracking-wide">Cargando...</span>
      </div>
    </div>
  </div>
</template>
