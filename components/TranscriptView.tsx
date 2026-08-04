"use client";

import { HistoryEntry, isUtterance } from "@/lib/conversationUtils";

type TranscriptViewProps = {
  history: HistoryEntry[];
  newFromIndex?: number;
  selectable?: boolean;
  selectedIndex?: number | null;
  onSelect?: (historyIndex: number) => void;
};

export default function TranscriptView({
  history,
  newFromIndex,
  selectable = false,
  selectedIndex = null,
  onSelect,
}: TranscriptViewProps) {
  return (
    <div className="transcript">
      {history.map((entry, i) => {
        const isNew = newFromIndex !== undefined && i >= newFromIndex;

        if (!isUtterance(entry)) {
          return (
            <div key={i} className={`transcript-row vital${isNew ? " is-new" : ""}`}>
              <span className="vital-label">Vital sign checked</span>
              <span className="vital-value">
                {entry.name}: {entry.value}
              </span>
            </div>
          );
        }

        const isPatient = entry.actor === "patient";
        const canSelect = selectable && isPatient;
        const isSelected = selectedIndex === i;

        return (
          <div
            key={i}
            className={
              `transcript-row ${entry.actor}` +
              (isNew ? " is-new" : "") +
              (canSelect ? " selectable" : "") +
              (isSelected ? " is-selected" : "")
            }
            onClick={canSelect && onSelect ? () => onSelect(i) : undefined}
            role={canSelect ? "button" : undefined}
            tabIndex={canSelect ? 0 : undefined}
          >
            <span className="speaker-label">
              {entry.actor === "nurse" ? "Nurse" : "Patient"}
            </span>
            <span className="utterance-text">{entry.utterance}</span>
            {canSelect && (
              <span className="select-hint">
                {isSelected ? "Selected" : "Click if this changed your mind"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
