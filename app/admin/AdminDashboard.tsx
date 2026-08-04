"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import sampleData from "@/data/sample_conversations.json";
import LogoutButton from "@/components/LogoutButton";
import {
  fetchAllAnnotations,
  deleteClinicianAnnotations,
  AnnotationRow,
} from "@/lib/supabaseClient";

const TOTAL_CONVERSATIONS = sampleData.length;

export default function AdminDashboard({ clinicianNames }: { clinicianNames: string[] }) {
  const [rows, setRows] = useState<AnnotationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);

  function load() {
    setError(null);
    fetchAllAnnotations()
      .then(setRows)
      .catch((err) => setError(String(err?.message ?? err)));
  }

  useEffect(load, []);

  async function handleReset(clinician: string) {
    const confirmed = window.confirm(
      `Delete all ${countFor(clinician)} saved annotation(s) for ${clinician}? This cannot be undone.`
    );
    if (!confirmed) return;

    setResetting(clinician);
    try {
      await deleteClinicianAnnotations(clinician);
      load();
    } catch (err: any) {
      setError(String(err?.message ?? err));
    } finally {
      setResetting(null);
    }
  }

  function countFor(clinician: string): number {
    return rows?.filter((r) => r.clinician === clinician).length ?? 0;
  }

  return (
    <div className="page page-wide">
      <div className="top-bar">
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
        <LogoutButton />
      </div>

      <div className="card">
        <h2>Test the annotation flow</h2>
        <p className="subtitle">
          Your test annotations save under a separate "Admin (test)" identity
          and never mix with real clinician data.
        </p>
        <Link href="/annotate" className="primary-button" style={{ display: "inline-block", textDecoration: "none" }}>
          Go to annotation flow
        </Link>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h2>Clinician progress</h2>
        {clinicianNames.map((name) => (
          <div key={name} className="admin-progress-row">
            <span>
              <strong>{name}</strong> — {countFor(name)} / {TOTAL_CONVERSATIONS} completed
            </span>
            <button
              type="button"
              className="secondary-button"
              disabled={resetting === name || countFor(name) === 0}
              onClick={() => handleReset(name)}
            >
              {resetting === name ? "Resetting..." : "Reset progress"}
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>All annotations ({rows?.length ?? 0})</h2>
        {rows === null && <p>Loading...</p>}
        {rows !== null && rows.length === 0 && <p className="subtitle">No annotations saved yet.</p>}
        {rows !== null && rows.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Clinician</th>
                  <th>Conversation</th>
                  <th>Committed@k</th>
                  <th>Initial</th>
                  <th>Final</th>
                  <th>Changed</th>
                  <th>Change utterance #</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.clinician}-${r.conversation_id}`}>
                    <td>{r.clinician}</td>
                    <td>{r.conversation_id}</td>
                    <td>{r.committed_at_k ?? "—"}</td>
                    <td>{r.initial_acuity ?? "—"}</td>
                    <td>{r.final_acuity}</td>
                    <td>{r.changed ? "Yes" : "No"}</td>
                    <td>{r.change_turn ?? "—"}</td>
                    <td>{new Date(r.completed_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
