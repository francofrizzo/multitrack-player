import { ref, watch, type Ref } from "vue";

export interface MediaSessionOptions {
  title: string;
  artist: string;
  album: string;
  artwork?: string;
  duration: number;
}

export interface MediaSessionEvents {
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
}

export function useMediaSession(
  options: Ref<MediaSessionOptions>,
  events: MediaSessionEvents = {}
) {
  const currentTime = ref(0);
  const isPlaying = ref(false);

  const initMediaSession = () => {
    if ("mediaSession" in navigator) {
      updateMediaSessionMetadata();

      navigator.mediaSession.setActionHandler("play", () => {
        isPlaying.value = true;
        events.onPlay?.();
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        isPlaying.value = false;
        events.onPause?.();
      });

      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime !== undefined) {
          currentTime.value = details.seekTime;
          events.onSeek?.(details.seekTime);
        }
      });

      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        const skipTime = details.seekOffset || 10;
        const newTime = Math.min(currentTime.value + skipTime, options.value.duration);
        currentTime.value = newTime;
        events.onSeek?.(newTime);
      });

      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        const skipTime = details.seekOffset || 10;
        const newTime = Math.max(currentTime.value - skipTime, 0);
        currentTime.value = newTime;
        events.onSeek?.(newTime);
      });
    }
  };

  const updateMediaSessionMetadata = () => {
    if (!("mediaSession" in navigator)) return;

    const { title, artist, album, artwork } = options.value;
    const artworkList = artwork ? [{ src: artwork, type: "image/jpeg", sizes: "512x512" }] : [];

    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist,
      album,
      artwork: artworkList
    });
  };

  const updateMediaSessionPlaybackState = (playing: boolean) => {
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }
  };

  const updatePositionState = (time: number) => {
    if ("mediaSession" in navigator && "setPositionState" in navigator.mediaSession) {
      navigator.mediaSession.setPositionState({
        duration: options.value.duration,
        position: time,
        playbackRate: 1.0
      });
    }
  };

  const cleanupMediaSession = () => {
    if ("mediaSession" in navigator) {
      // Remove action handlers
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("seekto", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);

      // Clear metadata
      navigator.mediaSession.metadata = null;
    }
  };

  // Watch for options changes to update metadata
  watch(
    () => options.value,
    () => updateMediaSessionMetadata(),
    { deep: true }
  );

  // Watch for playback state changes
  watch(isPlaying, (playing) => {
    updateMediaSessionPlaybackState(playing);
  });

  // Watch for time changes to update position state
  watch(currentTime, (time) => {
    updatePositionState(time);
  });

  return {
    currentTime,
    isPlaying,
    initMediaSession,
    cleanupMediaSession,
    updateMediaSessionMetadata
  };
}
