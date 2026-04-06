"use client";
import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  title: string;
  value: string | number;
  change?: number;
  icon?: ReactNode;
  format?: "currency" | "percent" | "number" | "ratio";
}

export default function MetricCard({ title, value, change, icon, format }: Props) {
  const formatted = (() => {
    if (typeof value === "string") return value;
    switch (format) {
      case "currency": return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
      case "percent": return `${value.toFixed(2)}%`;
      case "ratio": return value.toFixed(2);
      default: return value.toLocaleString();
    }
  })();

  return (
    <div className="bg-bg-card border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-text-secondary text-sm">{title}</span>
        {icon && <span className="text-text-muted">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-white">{formatted}</div>
      {change !== undefined && (
        <div className={clsx("text-sm mt-1 font-medium", change >= 0 ? "text-accent-green" : "text-accent-red")}>
          {change >= 0 ? "+" : ""}{change.toFixed(2)}%
        </div>
      )}
    </div>
  );
}
