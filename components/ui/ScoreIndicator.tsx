interface ScoreIndicatorProps {
  score: number;
  size?: "sm" | "md";
}

function scoreColor(score: number): string {
  if (score >= 0.75) return "text-signal-high";
  if (score >= 0.50) return "text-signal-mid";
  return "text-signal-low";
}

function strokeColor(score: number): string {
  if (score >= 0.75) return "var(--color-signal-high)";
  if (score >= 0.50) return "var(--color-signal-mid)";
  return "var(--color-signal-low)";
}

export default function ScoreIndicator({ score, size = "md" }: ScoreIndicatorProps) {
  const diameter = size === "sm" ? 24 : 32;
  const strokeWidth = size === "sm" ? 2.5 : 3;
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(score, 0), 1));

  return (
    <div className="flex items-center gap-2">
      <svg
        width={diameter}
        height={diameter}
        viewBox={`0 0 ${diameter} ${diameter}`}
        className="-rotate-90"
      >
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-sunken)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke={strokeColor(score)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className={`font-mono text-sm font-semibold tabular-nums ${scoreColor(score)}`}>
        {score.toFixed(2)}
      </span>
    </div>
  );
}
