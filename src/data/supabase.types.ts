export type SupabaseCollection = {
  id: number;
  slug: string;
  title: string;
  visible: boolean;
  main_color: string;
  track_colors: Record<string, string>;
  artwork_file_url: string | null;
  created_at: string;
};

export type SupabaseSong = {
  id: number;
  slug: string;
  collection_id: number;
  title: string;
  lyrics: any;
  created_at: string;
};

export type SupabaseAudioTrack = {
  id: number;
  song_id: number;
  title: string;
  color_key: string;
  audio_file_url: string;
  created_at: string;
};
