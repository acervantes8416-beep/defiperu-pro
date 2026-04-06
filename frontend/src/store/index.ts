import { create } from "zustand";
import type { Signal, PortfolioOverview, RiskProfileType } from "@/types";

interface AppState {
  // Auth
  token: string | null;
  user: { id: string; username: string } | null;
  setAuth: (token: string, user: { id: string; username: string }) => void;
  logout: () => void;

  // Signals
  signals: Signal[];
  setSignals: (s: Signal[]) => void;

  // Portfolio
  portfolio: PortfolioOverview | null;
  setPortfolio: (p: PortfolioOverview) => void;

  // Perfil de riesgo activo
  riskProfile: RiskProfileType;
  setRiskProfile: (p: RiskProfileType) => void;

  // UI
  selectedSymbol: string;
  selectedTimeframe: string;
  setSymbol: (s: string) => void;
  setTimeframe: (t: string) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useStore = create<AppState>((set) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  user: null,
  setAuth: (token, user) => {
    localStorage.setItem("token", token);
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem("token");
    set({ token: null, user: null });
  },

  signals: [],
  setSignals: (signals) => set({ signals }),

  portfolio: null,
  setPortfolio: (portfolio) => set({ portfolio }),

  riskProfile: "moderado",
  setRiskProfile: (riskProfile) => {
    if (typeof window !== "undefined") localStorage.setItem("riskProfile", riskProfile);
    set({ riskProfile });
  },

  selectedSymbol: "BTC/USDT",
  selectedTimeframe: "1h",
  setSymbol: (selectedSymbol) => set({ selectedSymbol }),
  setTimeframe: (selectedTimeframe) => set({ selectedTimeframe }),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
