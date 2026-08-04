"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getClinicianList } from "@/lib/supabaseClient";

const CLINICIAN_KEY = "triage-annotation-clinician";

export default function HomePage() {
  const router = useRouter();
  const clinicians = getClinicianList();
  const [selected, setSelected] = useState<string | null>(null);

  function handleStart() {
    if (!selected) return;
    localStorage.setItem(CLINICIAN_KEY, selected);
    router.push("/annotate");
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Triage Acuity Annotation</h1>
        <p className="subtitle">
          You will review 50 simulated nurse-patient triage conversations. At
          several points during each conversation you can either commit an
          acuity label (ESI 1-5) or defer to see more of the conversation
          first. After you commit, you will see the full conversation and can
          confirm or change your answer.
        </p>

        <h2>Who are you?</h2>
        <div className="clinician-list">
          {clinicians.length === 0 && (
            <p className="subtitle">
              No clinicians configured. Set NEXT_PUBLIC_CLINICIANS in your
              environment (comma-separated names).
            </p>
          )}
          {clinicians.map((name) => (
            <button
              key={name}
              type="button"
              className={`clinician-option${selected === name ? " selected" : ""}`}
              onClick={() => setSelected(name)}
            >
              {name}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="primary-button"
          disabled={!selected}
          onClick={handleStart}
        >
          Start / Resume
        </button>
      </div>
    </div>
  );
}
