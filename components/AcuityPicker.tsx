"use client";

const ESI_LABELS: Record<number, string> = {
  1: "Requires immediate life-saving intervention",
  2: "High-risk situation / severe pain or distress",
  3: "Stable, likely needs multiple resources",
  4: "Stable, likely needs one resource",
  5: "Stable, likely needs no resources",
};

type AcuityPickerProps = {
  value: number | null;
  onChange: (value: number) => void;
  onConfirm: () => void;
  confirmLabel?: string;
};

export default function AcuityPicker({
  value,
  onChange,
  onConfirm,
  confirmLabel = "Confirm acuity",
}: AcuityPickerProps) {
  return (
    <div className="acuity-picker">
      <div className="acuity-options">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            type="button"
            className={`acuity-option${value === level ? " selected" : ""}`}
            onClick={() => onChange(level)}
          >
            <span className="acuity-level">ESI {level}</span>
            <span className="acuity-desc">{ESI_LABELS[level]}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="primary-button"
        disabled={value === null}
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
