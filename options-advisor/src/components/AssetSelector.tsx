import { useMarketStore } from "@/store/marketStore";
import clsx from "clsx";

export default function AssetSelector() {
  const { asset, setAsset, connected } = useMarketStore();

  return (
    <div className="flex items-center gap-2">
      {(["BTC", "ETH"] as const).map((a) => (
        <button key={a} onClick={() => setAsset(a)}
          className={clsx("px-4 py-1.5 rounded-lg text-sm font-bold transition-colors",
            asset === a ? "bg-accent-blue text-white" : "bg-bg-card text-text-secondary border border-gray-700 hover:border-gray-600"
          )}>{a}</button>
      ))}
      <div className="flex items-center gap-1.5 ml-2">
        <span className={clsx("w-2 h-2 rounded-full", connected ? "bg-accent-green live-dot" : "bg-accent-red")} />
        <span className="text-xs text-text-muted">{connected ? "LIVE" : "Offline"}</span>
      </div>
    </div>
  );
}
