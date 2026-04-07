import { useMarketStore } from "@/store/marketStore";
import clsx from "clsx";

export default function AssetSelector() {
  const { asset, setAsset, spot, connected } = useMarketStore();
  return (
    <div className="flex items-center gap-3">
      {(["BTC", "ETH"] as const).map((a) => (
        <button key={a} onClick={() => setAsset(a)}
          className={clsx("px-4 py-1.5 rounded-lg text-sm font-bold font-mono transition-all",
            asset === a ? "bg-accent-blue text-black" : "bg-bg-surface text-text-secondary border border-gray-700 hover:border-accent-blue/50"
          )}>
          {a}
          {asset === a && spot > 0 && (
            <span className="ml-2 font-normal opacity-80">${spot.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          )}
        </button>
      ))}
      <div className="flex items-center gap-1.5 ml-1">
        <span className={clsx("w-2 h-2 rounded-full", connected ? "bg-accent-green live-dot" : "bg-accent-red")} />
        <span className="text-[10px] text-text-muted font-mono">{connected ? "LIVE" : "OFF"}</span>
      </div>
    </div>
  );
}
