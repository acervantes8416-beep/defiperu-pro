"use client";
import { RefreshCcw } from "lucide-react";

interface Props {
  countdown: number;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function CountdownBadge({ countdown, loading, onRefresh }: Props) {
  return (
    <button
      onClick={onRefresh}
      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
      title="Clic para actualizar ahora"
    >
      <RefreshCcw size={11} className={loading ? "animate-spin" : ""} />
      <span className="font-mono">{countdown}s</span>
    </button>
  );
}
