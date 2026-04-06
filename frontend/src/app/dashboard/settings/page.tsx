"use client";
import { useState } from "react";
import { Settings, Key, Shield, Bell } from "lucide-react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [maxRisk, setMaxRisk] = useState("2");
  const [rebalance, setRebalance] = useState("168");

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Settings size={24} /> Configuración
      </h1>

      {/* API del Exchange */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
          <Key size={18} /> Claves API del Exchange
        </h3>
        <p className="text-text-muted text-sm mb-4">
          Conecta tu cuenta de Binance para operar en Spot. Solo se necesitan permisos de lectura y trading spot.
        </p>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary block mb-1">API Key</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm" placeholder="Ingresa tu API key de Binance" />
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1">API Secret</label>
            <input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm" placeholder="Ingresa tu API secret de Binance" />
          </div>
          <button className="bg-accent-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
            Guardar Claves
          </button>
        </div>
      </div>

      {/* Gestión de Riesgo */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
          <Shield size={18} /> Gestión de Riesgo (Spot)
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary block mb-1">Riesgo Máximo por Operación (%)</label>
            <input type="number" value={maxRisk} onChange={(e) => setMaxRisk(e.target.value)} className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm" min="0.5" max="10" step="0.5" />
            <p className="text-text-muted text-xs mt-1">Porcentaje máximo del portfolio en riesgo por operación spot (recomendado: 1-2%)</p>
          </div>
          <div>
            <label className="text-sm text-text-secondary block mb-1">Intervalo de Rebalanceo (horas)</label>
            <input type="number" value={rebalance} onChange={(e) => setRebalance(e.target.value)} className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm" />
            <p className="text-text-muted text-xs mt-1">168 horas = 1 semana. Frecuencia del rebalanceo automático del portfolio.</p>
          </div>
          <button className="bg-accent-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
            Guardar Configuración
          </button>
        </div>
      </div>

      {/* Notificaciones */}
      <div className="bg-bg-card border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
          <Bell size={18} /> Notificaciones
        </h3>
        <div className="space-y-3">
          {[
            { label: "Alertas de Señales", desc: "Recibe notificaciones cuando se generen señales BUY/SELL" },
            { label: "Ejecución de Operaciones", desc: "Aviso cuando se ejecuten operaciones spot" },
            { label: "Rebalanceo de Portfolio", desc: "Alerta cuando se realice un rebalanceo" },
            { label: "Stop Loss Activado", desc: "Alerta crítica cuando se active un stop loss" },
          ].map((n) => (
            <label key={n.label} className="flex items-center justify-between p-3 rounded-lg hover:bg-bg-hover cursor-pointer">
              <div>
                <div className="text-white text-sm">{n.label}</div>
                <div className="text-text-muted text-xs">{n.desc}</div>
              </div>
              <input type="checkbox" defaultChecked className="rounded border-gray-600 bg-bg text-accent-blue focus:ring-accent-blue" />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
