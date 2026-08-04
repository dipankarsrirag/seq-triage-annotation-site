"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import sampleData from "@/data/sample_conversations.json";
import AcuityPicker from "@/components/AcuityPicker";
import ProgressBar from "@/components/ProgressBar";
import TranscriptView from "@/components/TranscriptView";
import LogoutButton from "@/components/LogoutButton";
import {
  getAvailableKs,
  sliceAtK,
  firstNewIndex,
  utteranceNumberAtIndex,
  SampledConversation,
} from "@/lib/conversationUtils";
import { fetchCompletedConversationIds, saveAnnotation } from "@/lib/supabaseClient";

const conversations = sampleData as SampledConversation[];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Phase =
  | "k-view"
  | "initial-picker"
  | "full-reveal"
  | "change-picker"
  | "forced-picker"
  | "saving"
  | "error";

export default function AnnotateClient({
  clinicianName,
  isAdmin = false,
}: {
  clinicianName: string;
  isAdmin?: boolean;
}) {
  const [order, setOrder] = useState<SampledConversation[] | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [convIndex, setConvIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [kIndex, setKIndex] = useState(0);
  const [deferredKs, setDeferredKs] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("k-view");
  const [initialAcuity, setInitialAcuity] = useState<number | null>(null);
  const [committedAtK, setCommittedAtK] = useState<number | null>(null);
  const [pickerValue, setPickerValue] = useState<number | null>(null);
  const [changeAcuity, setChangeAcuity] = useState<number | null>(null);
  const [changeIndex, setChangeIndex] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const shuffled = seededShuffle(conversations, hashString(clinicianName));
    setOrder(shuffled);

    fetchCompletedConversationIds(clinicianName)
      .then((ids) => {
        setCompletedIds(ids);
        const firstOpen = shuffled.findIndex((c) => !ids.has(c.conversation_id));
        setConvIndex(firstOpen === -1 ? shuffled.length : firstOpen);
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(String(err?.message ?? err));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicianName]);

  const conv = order && convIndex < order.length ? order[convIndex] : null;

  const kList = useMemo(
    () => (conv ? getAvailableKs(conv.n_utterances) : []),
    [conv]
  );
  const currentK = kList[kIndex] ?? null;
  const isLastK = kIndex === kList.length - 1;

  const visibleHistory = useMemo(() => {
    if (!conv) return [];
    if (phase === "k-view" || phase === "initial-picker") {
      return currentK !== null ? sliceAtK(conv.history, currentK) : conv.history;
    }
    return conv.history;
  }, [conv, phase, currentK]);

  const newFromIndex = useMemo(() => {
    if (!conv || (phase !== "k-view" && phase !== "initial-picker")) return undefined;
    const prevK = kIndex === 0 ? 0 : kList[kIndex - 1];
    return firstNewIndex(conv.history, prevK);
  }, [conv, phase, kIndex, kList]);

  function resetConversationState() {
    setKIndex(0);
    setDeferredKs([]);
    setPhase("k-view");
    setInitialAcuity(null);
    setCommittedAtK(null);
    setPickerValue(null);
    setChangeAcuity(null);
    setChangeIndex(null);
    setSaveError(null);
  }

  function handleDefer() {
    if (!conv) return;
    if (currentK !== null) setDeferredKs((prev) => [...prev, currentK]);
    if (isLastK) {
      setPhase("forced-picker");
    } else {
      setKIndex((i) => i + 1);
    }
  }

  function handleCommitClicked() {
    setPickerValue(null);
    setPhase("initial-picker");
  }

  function handleBackToKView() {
    setPickerValue(null);
    setPhase("k-view");
  }

  function handleInitialConfirm() {
    if (pickerValue === null) return;
    setInitialAcuity(pickerValue);
    setCommittedAtK(currentK);
    setPhase("full-reveal");
  }

  function handleNoChange() {
    if (!conv || initialAcuity === null) return;
    void finalize(
      {
        finalAcuity: initialAcuity,
        changed: false,
        changeTurn: null,
        changeUtteranceText: null,
      },
      "full-reveal"
    );
  }

  function handleYesChange() {
    setChangeAcuity(null);
    setChangeIndex(null);
    setPhase("change-picker");
  }

  function handleChangeConfirm() {
    if (!conv || changeAcuity === null || changeIndex === null) return;
    const entry = conv.history[changeIndex];
    const turn = utteranceNumberAtIndex(conv.history, changeIndex);
    const text = "utterance" in entry ? entry.utterance : null;
    void finalize(
      {
        finalAcuity: changeAcuity,
        changed: true,
        changeTurn: turn,
        changeUtteranceText: text,
      },
      "change-picker"
    );
  }

  function handleForcedConfirm() {
    if (pickerValue === null) return;
    void finalize(
      {
        finalAcuity: pickerValue,
        changed: false,
        changeTurn: null,
        changeUtteranceText: null,
      },
      "forced-picker"
    );
  }

  async function finalize(
    result: {
      finalAcuity: number;
      changed: boolean;
      changeTurn: number | null;
      changeUtteranceText: string | null;
    },
    revertPhase: Phase
  ) {
    if (!conv) return;
    setPhase("saving");
    try {
      await saveAnnotation({
        clinician: clinicianName,
        conversation_id: conv.conversation_id,
        committed_at_k: committedAtK,
        deferred_ks: deferredKs,
        initial_acuity: initialAcuity,
        final_acuity: result.finalAcuity,
        changed: result.changed,
        change_turn: result.changeTurn,
        change_utterance_text: result.changeUtteranceText,
        completed_at: new Date().toISOString(),
      });
      setCompletedIds((prev) => new Set(prev).add(conv.conversation_id));
      resetConversationState();
      setConvIndex((i) => i + 1);
    } catch (err: any) {
      setSaveError(String(err?.message ?? err));
      setPhase(revertPhase);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="card">Loading...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page">
        <div className="card error-banner">
          Could not load your progress: {loadError}. Check your Supabase
          environment variables and try reloading.
        </div>
      </div>
    );
  }

  if (!order || convIndex >= order.length) {
    return (
      <div className="page">
        <div className="card">
          <h1>All done!</h1>
          <p>
            Thank you, {clinicianName}. You have completed all{" "}
            {order?.length ?? 0} conversations.
          </p>
          <div className="top-bar-actions">
            {isAdmin && (
              <Link href="/admin" className="secondary-button">
                Back to dashboard
              </Link>
            )}
            <LogoutButton />
          </div>
        </div>
      </div>
    );
  }

  if (!conv) return null;

  return (
    <div className="page">
      <div className="top-bar">
        <ProgressBar current={completedIds.size} total={order.length} />
        <div className="top-bar-actions">
          {isAdmin && (
            <Link href="/admin" className="secondary-button">
              Back to dashboard
            </Link>
          )}
          <LogoutButton />
        </div>
      </div>

      {saveError && (
        <div className="error-banner">
          Failed to save: {saveError}. Please try again.
        </div>
      )}

      <div className="card">
        {(phase === "k-view" || phase === "initial-picker") && currentK !== null && (
          <span className="k-badge">First {currentK} utterances</span>
        )}
        {(phase === "full-reveal" || phase === "change-picker" || phase === "forced-picker") && (
          <span className="k-badge">Full conversation</span>
        )}

        <TranscriptView
          history={visibleHistory}
          newFromIndex={newFromIndex}
          selectable={phase === "change-picker"}
          selectedIndex={changeIndex}
          onSelect={phase === "change-picker" ? setChangeIndex : undefined}
        />

        {phase === "k-view" && (
          <div className="step-actions">
            <button type="button" className="secondary-button" onClick={handleDefer}>
              Defer to next view
            </button>
            <button type="button" className="primary-button" onClick={handleCommitClicked}>
              Commit acuity now
            </button>
          </div>
        )}

        {phase === "initial-picker" && (
          <>
            <h2>What is your acuity assessment right now?</h2>
            <AcuityPicker
              value={pickerValue}
              onChange={setPickerValue}
              onConfirm={handleInitialConfirm}
              confirmLabel="Commit this acuity"
            />
            <button type="button" className="secondary-button" onClick={handleBackToKView}>
              Back
            </button>
          </>
        )}

        {phase === "full-reveal" && (
          <>
            <div className="notice">
              You committed <strong>ESI {initialAcuity}</strong> at the first{" "}
              {committedAtK} utterances.
            </div>
            <h2>Would you like to change your acuity?</h2>
            <div className="yes-no-row">
              <button type="button" className="secondary-button" onClick={handleNoChange}>
                No, keep ESI {initialAcuity}
              </button>
              <button type="button" className="primary-button" onClick={handleYesChange}>
                Yes, I'd like to change it
              </button>
            </div>
          </>
        )}

        {phase === "change-picker" && (
          <>
            <h2>Select the patient utterance that changed your mind</h2>
            <p className="subtitle">
              Click on a patient line above, then choose your new acuity below.
            </p>
            <AcuityPicker
              value={changeAcuity}
              onChange={setChangeAcuity}
              onConfirm={handleChangeConfirm}
              confirmLabel="Confirm new acuity"
            />
            {(changeAcuity === null || changeIndex === null) && (
              <p className="subtitle">
                {changeIndex === null && "Select a patient utterance above. "}
                {changeAcuity === null && "Choose a new acuity level."}
              </p>
            )}
          </>
        )}

        {phase === "forced-picker" && (
          <>
            <h2>You deferred through the entire conversation. What is your acuity assessment?</h2>
            <AcuityPicker
              value={pickerValue}
              onChange={setPickerValue}
              onConfirm={handleForcedConfirm}
              confirmLabel="Commit this acuity"
            />
          </>
        )}

        {phase === "saving" && <p>Saving...</p>}
      </div>
    </div>
  );
}
