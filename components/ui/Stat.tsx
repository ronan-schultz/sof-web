import MetricCell from "./MetricCell";

interface StatProps {
  label: string;
  value: string;
  delta?: number;
  deltaFormat?: "percent" | "decimal" | "currency";
}

export default function Stat({ label, value, delta, deltaFormat = "percent" }: StatProps) {
  return (
    <div>
      <p className="text-xs text-ink-tertiary font-medium uppercase tracking-wider">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-ink-primary font-mono tabular-nums">
        {value}
      </p>
      {delta !== undefined && (
        <div className="mt-1">
          <MetricCell value={delta} format={deltaFormat} showArrow />
        </div>
      )}
    </div>
  );
}
