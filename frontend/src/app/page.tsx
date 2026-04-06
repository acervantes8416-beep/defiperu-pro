"use client";
import { useState } from "react";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { setAuth } = useStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      setAuth("demo-token", { id: "demo-user", username: username || "trader" });
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-green via-accent-blue to-accent-purple bg-clip-text text-transparent">
            DeFiPerú Pro
          </h1>
          <p className="text-text-secondary mt-2">Plataforma de Trading Cripto Automatizado</p>
          <span className="text-xs text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-0.5 rounded-full mt-2 inline-block">
            Solo Spot — Sin apalancamiento
          </span>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-bg-card border border-gray-800 rounded-2xl p-8 space-y-5">
          <h2 className="text-xl font-semibold text-white">{isRegister ? "Crear Cuenta" : "Iniciar Sesión"}</h2>

          {isRegister && (
            <div>
              <label className="text-sm text-text-secondary block mb-1">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
                placeholder="trader@ejemplo.com"
              />
            </div>
          )}

          <div>
            <label className="text-sm text-text-secondary block mb-1">Usuario</label>
            <input
              type="text" value={username} onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
              placeholder="Ingresa tu usuario"
            />
          </div>

          <div>
            <label className="text-sm text-text-secondary block mb-1">Contraseña</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-bg border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:border-accent-blue focus:ring-1 focus:ring-accent-blue"
              placeholder="Ingresa tu contraseña"
            />
          </div>

          {error && <div className="text-accent-red text-sm">{error}</div>}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-accent-blue to-accent-purple text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            {isRegister ? "Crear Cuenta" : "Entrar"}
          </button>

          <div className="text-center text-sm text-text-secondary">
            {isRegister ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
            <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-accent-blue hover:underline">
              {isRegister ? "Iniciar Sesión" : "Registrarse"}
            </button>
          </div>
        </form>

        <p className="text-center text-text-muted text-xs mt-6">
          Modo demo disponible — ingresa cualquier usuario para comenzar
        </p>
      </div>
    </div>
  );
}
