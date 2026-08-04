export type UtteranceEntry = {
  turn: number;
  actor: "nurse" | "patient";
  utterance: string;
  triage?: number;
};

export type VitalEntry = {
  turn: number;
  actor: "system";
  event: "vital";
  name: string;
  value: number;
};

export type HistoryEntry = UtteranceEntry | VitalEntry;

export type SampledConversation = {
  conversation_id: string;
  n_utterances: number;
  history: HistoryEntry[];
  ground_truth_acuity: number;
};

export const K_CHECKPOINTS = [4, 8, 12, 16, 20, 24] as const;

export function isUtterance(entry: HistoryEntry): entry is UtteranceEntry {
  return entry.actor === "nurse" || entry.actor === "patient";
}

/** Checkpoints (<= total utterances) available for this conversation, in order. */
export function getAvailableKs(nUtterances: number): number[] {
  return K_CHECKPOINTS.filter((k) => k <= nUtterances);
}

/** Slice history to the first k nurse/patient utterances, including any
 * interleaved vital events that occur before the k-th utterance. */
export function sliceAtK(history: HistoryEntry[], k: number): HistoryEntry[] {
  const result: HistoryEntry[] = [];
  let utteranceCount = 0;
  for (const entry of history) {
    result.push(entry);
    if (isUtterance(entry)) {
      utteranceCount += 1;
      if (utteranceCount >= k) break;
    }
  }
  return result;
}

/** Index (into the full history array) of the first entry that is new since prevK. */
export function firstNewIndex(history: HistoryEntry[], prevK: number): number {
  if (prevK <= 0) return 0;
  let utteranceCount = 0;
  for (let i = 0; i < history.length; i++) {
    if (isUtterance(history[i])) {
      utteranceCount += 1;
      if (utteranceCount === prevK) return i + 1;
    }
  }
  return history.length;
}

/** 1-indexed position of the entry at historyIndex among nurse/patient
 * utterances only (i.e. the same running count used for the k-checkpoints).
 * Unlike the raw `turn` field on each entry, which is shared by a nurse/patient
 * exchange pair, this is unique per utterance and matches what a clinician
 * sees as "utterance N" while stepping through the conversation. */
export function utteranceNumberAtIndex(
  history: HistoryEntry[],
  historyIndex: number
): number | null {
  let utteranceCount = 0;
  for (let i = 0; i <= historyIndex && i < history.length; i++) {
    if (isUtterance(history[i])) {
      utteranceCount += 1;
    }
  }
  return utteranceCount > 0 ? utteranceCount : null;
}
