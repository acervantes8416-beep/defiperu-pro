import { create } from "zustand";
import type { Signal, PortfolioOverview, RiskProfileType } from "@/types";

interface InvestorProfile {
  name: string;
  capital: number;
  experience: "principiante" | "intermedio" | "avanzado";
  riskScore: number; // 1-9 del cuestionario
  timeHorizon: "corto" | "medio" | "largo";
  maxLoss: number; // % máximo aceptable
  diversification: "pocos" | "diversificado";
}

interface AppState {
  token: string | null;
  user: { id: string; username: string } | null;
  setAuth: (token: string, user: { id: string; username: string }) => void;
  logout: () => void;

  // Onboarding
  onboardingDone: boolean;
  investorProfile: InvestorProfile | null;
  completeOnboarding: (profile: InvestorProfile, riskProfile: RiskProfileType) => void;

  signals: Signal[];
  setSignals: (s: Signal[]) => void;

  portfolio: PortfolioOverview | null;
  setPortfolio: (p: PortfolioOverview) => void;

  riskProfile: RiskProfileType;
  setRiskProfile: (p: RiskProfileType) => void;

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
    localStorage.removeItem("onboardingDone");
    localStorage.removeItem("investorProfile");
    set({ token: null, user: null, onboardingDone: false, investorProfile: null });
  },

  onboardingDone: typeof window !== "undefined" ? localStorage.getItem("onboardingDone") === "true" : false,
  investorProfile: typeof window !== "undefined" && localStorage.getItem("investorProfile")
    ? JSON.parse(localStorage.getItem("investorProfile")!)
    : null,
  completeOnboarding: (profile, riskProfile) => {
    localStorage.setItem("onboardingDone", "true");
    localStorage.setItem("investorProfile", JSON.stringify(profile));
    localStorage.setItem("riskProfile", riskProfile);
    set({ onboardingDone: true, investorProfile: profile, riskProfile });
  },

  signals: [],
  setSignals: (signals) => set({ signals }),

  portfolio: null,
  setPortfolio: (portfolio) => set({ portfolio }),

  riskProfile: (typeof window !== "undefined" ? localStorage.getItem("riskProfile") as RiskProfileType : null) || "moderado",
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
