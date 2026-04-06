"use client";
import { useStore } from "@/store";
import {
  LayoutDashboard, Signal, Wallet, BarChart3,
  LineChart, Settings, ChevronLeft, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const nav = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Panel Principal" },
  { href: "/dashboard/signals", icon: Signal, label: "Señales" },
  { href: "/dashboard/portfolio", icon: Wallet, label: "Portfolio" },
  { href: "/dashboard/rendimientos", icon: BarChart3, label: "Rendimientos" },
  { href: "/dashboard/simulacion", icon: LineChart, label: "Simulación" },
  { href: "/dashboard/settings", icon: Settings, label: "Configuración" },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useStore();
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        "h-screen bg-bg-card border-r border-gray-800 flex flex-col transition-all duration-300",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      <div className="h-16 flex items-center px-4 border-b border-gray-800">
        {sidebarOpen && (
          <span className="text-lg font-bold bg-gradient-to-r from-accent-green to-accent-blue bg-clip-text text-transparent">
            DeFiPerú Pro
          </span>
        )}
        <button onClick={toggleSidebar} className="ml-auto text-text-secondary hover:text-white p-1">
          {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      </div>

      {sidebarOpen && (
        <div className="px-4 py-2 border-b border-gray-800">
          <span className="text-xs text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-0.5 rounded-full">
            Modo Spot
          </span>
        </div>
      )}

      <nav className="flex-1 py-4 space-y-1 px-2">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                active
                  ? "bg-accent-blue/10 text-accent-blue"
                  : "text-text-secondary hover:text-white hover:bg-bg-hover"
              )}
            >
              <item.icon size={20} />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {sidebarOpen && (
        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-text-muted">v2.0.0 — Trading Spot Automatizado</div>
        </div>
      )}
    </aside>
  );
}
