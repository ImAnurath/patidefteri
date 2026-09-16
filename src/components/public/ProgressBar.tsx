export function ProgressBar({ ratio, label }: { ratio: number | null; label: string }) {
  const pct = ratio === null ? 0 : Math.min(100, Math.round(ratio * 100));
  return (
    <div>
      <div className="h-3 w-full border"><div className="h-full bg-gray-700" style={{ width: `${pct}%` }} /></div>
      <p className="text-sm">{ratio === null ? label : `${Math.round(ratio * 100)}% · ${label}`}</p>
    </div>
  );
}
