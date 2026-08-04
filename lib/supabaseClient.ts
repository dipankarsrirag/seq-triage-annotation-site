import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AnnotationRow = {
  clinician: string;
  conversation_id: string;
  committed_at_k: number | null;
  deferred_ks: number[];
  initial_acuity: number | null;
  final_acuity: number;
  changed: boolean;
  change_turn: number | null;
  change_utterance_text: string | null;
  completed_at: string;
};

export async function fetchCompletedConversationIds(
  clinician: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("annotations")
    .select("conversation_id")
    .eq("clinician", clinician);

  if (error) {
    throw error;
  }

  return new Set((data ?? []).map((row) => row.conversation_id as string));
}

export async function saveAnnotation(row: AnnotationRow): Promise<void> {
  const { error } = await supabase
    .from("annotations")
    .upsert(row, { onConflict: "clinician,conversation_id" });

  if (error) {
    throw error;
  }
}

export async function fetchAllAnnotations(): Promise<AnnotationRow[]> {
  const { data, error } = await supabase
    .from("annotations")
    .select("*")
    .order("completed_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as AnnotationRow[];
}

export async function deleteClinicianAnnotations(clinician: string): Promise<void> {
  const { error } = await supabase.from("annotations").delete().eq("clinician", clinician);

  if (error) {
    throw error;
  }
}
