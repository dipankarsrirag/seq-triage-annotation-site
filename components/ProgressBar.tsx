type ProgressBarProps = {
  current: number;
  total: number;
};

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = total === 0 ? 0 : Math.min(100, (current / total) * 100);
  return (
    <div className="progress-wrap">
      <div className="progress-label">
        Conversation {Math.min(current + 1, total)} of {total}
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
