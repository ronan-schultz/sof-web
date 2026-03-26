interface DividerProps {
  label?: string;
}

export default function Divider({ label }: DividerProps) {
  if (!label) {
    return <hr className="border-0 h-px bg-surface-sunken" />;
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 h-px bg-surface-sunken" />
      <span className="text-xs text-ink-tertiary shrink-0">{label}</span>
      <div className="flex-1 h-px bg-surface-sunken" />
    </div>
  );
}
