import type { DeskItem, DeskSize, SavedSetup } from "@/store/useDeskStore";
import { supabase } from "./supabase";

interface Row {
  id: string;
  name: string;
  desk: DeskSize;
  items: DeskItem[];
  saved_at: string;
}

const toRow = (s: SavedSetup) => ({ id: s.id, name: s.name, desk: s.desk, items: s.items, saved_at: new Date(s.savedAt).toISOString() });
const fromRow = (r: Row): SavedSetup => ({ id: r.id, name: r.name, desk: r.desk, items: r.items, savedAt: new Date(r.saved_at).getTime() });

/** 로그인한 사용자의 셋업 목록 (최근 저장 순). RLS로 본인 것만 조회됨 */
export async function fetchSetups(): Promise<SavedSetup[]> {
  const { data, error } = await supabase.from("setups").select("id,name,desk,items,saved_at").order("saved_at", { ascending: false });
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

/** 새로 저장/덮어쓰기/이름 변경 모두 id 기준 upsert */
export async function upsertSetups(setups: SavedSetup[]) {
  if (setups.length === 0) return;
  const { error } = await supabase.from("setups").upsert(setups.map(toRow));
  if (error) throw error;
}

export async function removeSetup(id: string) {
  const { error } = await supabase.from("setups").delete().eq("id", id);
  if (error) throw error;
}
