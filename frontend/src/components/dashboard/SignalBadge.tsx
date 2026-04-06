"use client";
import clsx from "clsx";

interface Props {
  signal: "BUY" | "SELL" | "HOLD";
  confidence?: number;
  size?: "sm" | "md" | "lg";
}

export default function SignalBadge({ signal, confidence, size = "md" }: Props) {
  const colors = {
    BUY: "bg-accent-green/15 text-accent-green border-accent-green/30",
    SELL: "bg-accent-red/15 text-accent-red border-accent-red/30",
    HOLD: "bg-accent-yellow/15 text-accent-yellow border-accent-yellow/30",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full border font-semibold", colors[signal], sizes[size])}>
      <span className={clsx("w-1.5 h-1.5 rounded-full", signal === "BUY" ? "bg-accent-green" : signal === "SELL" ? "bg-accent-red" : "bg-accent-yellow", "signal-pulse")} />
      {signal}
      {confidence !== undefined && <span className="font-normal opacity-75">{confidence.toFixed(0)}%</span>}
    </span>
  );
}
