interface MetricCellProps {
  value: number | null;
  format?: "percent" | "decimal" | "currency";
  showArrow?: boolean;
}

function formatValue(value: number, format: string): string {
  switch (format) {
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "currency":
      return value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    default:
      return value.toFixed(2);
  }
}

export default function MetricCell({
  value,
  format = "decimal",
  showArrow = false,
}: MetricCellProps) {
  if (value === null || value === undefined) {
    return <span className="font-mono text-sm text-ink-tertiary">&mdash;</span>;
  }

  const isPositive = value > 0;
  const isNegative = value < 0;
  const colorClass = isPositive
    ? "text-signal-high"
    : isNegative
      ? "text-signal-low"
      : "text-ink-tertiary";

  return (
    <span className={`font-mono text-sm tabular-nums ${colorClass}`}>
      {showArrow && isPositive && (
        <svg className="inline w-3 h-3 mr-0.5 -mt-0.5" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 2L10 8H2L6 2Z" />
        </svg>
      )}
      {showArrow && isNegative && (
        <svg className="inline w-3 h-3 mr-0.5 -mt-0.5" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 10L2 4H10L6 10Z" />
        </svg>
      )}
      {isPositive && format === "percent" ? "+" : ""}
      {formatValue(value, format)}
    </span>
  );
}
