import type { Collection, Song } from "@/data/data.types";
import { supabase } from "@/lib/supabaseClient";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";

export const fetchCollections = async (): Promise<PostgrestSingleResponse<Collection[]>> => {
  return await supabase.from("collections").select();
};

export const fetchSongsByCollectionId = async (
  collectionId: number
): Promise<PostgrestSingleResponse<Song[]>> => {
  return await supabase
    .from("songs")
    .select("*, audio_tracks(*)")
    .eq("collection_id", collectionId);
};
