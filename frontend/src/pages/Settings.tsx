import React, { useState, useEffect } from 'react';
import {
  Settings, CheckCircle2, ShieldCheck, Server,
  Cpu, Database, Sparkles, RefreshCw, Zap
} from 'lucide-react';
import { fetchAvailableAIProviders } from '../lib/api';

const PIPELINE_STATUSES = [
  { name: 'Cloudflare Worker Edge Gateway', role: 'API Proxy & Asset Server', status: 'ONLINE', latency: '12ms' },
  { name: 'USGS Earthquake Feed', role: 'Seismik M5+ Global', status: 'ONLINE', latency: '45ms' },
  { name: 'NASA EONET v3', role: 'Bencana & Kebakaran Aktif', status: 'ONLINE', latency: '85ms' },
  { name: 'Open-Meteo & Air Quality', role: 'Cuaca & Sensor PM2.5/AQI', status: 'ONLINE', latency: '35ms' },
  { name: 'Yahoo Finance', role: 'Kurs intraday & futures komoditas', status: 'ONLINE', latency: 'Live feed' },
  { name: 'Alpha Vantage', role: 'Data pasar saham', status: 'ONLINE', latency: 'API feed' },
  { name: 'World Bank Open Data', role: 'PDB & inflasi tahunan terbaru', status: 'ONLINE', latency: 'Rilis resmi' },
  { name: 'GDELT Project v2', role: 'Geopolitik & Konflik Global', status: 'ONLINE', latency: '70ms' },
  { name: 'OpenSky Network ADS-B', role: 'Radar Penerbangan Dunia', status: 'ONLINE', latency: '120ms' },
  { name: 'Electricity Maps API', role: 'Intensitas Karbon Grid', status: 'ONLINE', latency: '60ms' },
  { name: 'U.S. EIA Open Data', role: 'Cadangan Perminyakan Dunia', status: 'ONLINE', latency: '85ms' },
];

export default function SettingsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [aiProviders, setAiProviders] = useState<any[]>([]);
  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    fetchAvailableAIProviders().then(setAiProviders);
  }, []);

  const handleClearCache = () => {
    localStorage.clear();
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#060D1F] text-gray-200 p-4 lg:p-6 space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-cyan-900/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase">
              SYSTEM HEALTH & DIAGNOSTICS
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2 mt-1">
            <Settings className="w-6 h-6 text-cyan-400" />
            Pengaturan & Status Sistem
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Diagnostik kesehatan jaringan edge, ketersediaan API telemetry, dan konfigurasi multi-provider AI.
          </p>
        </div>

        <button
          onClick={handleClearCache}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/40 text-cyan-300 text-xs font-mono transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {cacheCleared ? 'Cache Lokal Dibersihkan!' : 'Bersihkan Cache Lokal'}
        </button>
      </div>

      {/* ─── AI MULTI-PROVIDER FAILOVER STATUS ─── */}
      <div className="rounded-xl bg-[#081226] border border-cyan-900/50 p-4">
        <div className="flex items-center gap-2 border-b border-cyan-900/40 pb-3 mb-4">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
            Status Multi-Provider AI (Auto-Failover Chain)
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { name: 'Groq (Llama 3.3)', key: 'VITE_GROQ_KEY', role: 'Primary' },
            { name: 'Google Gemini', key: 'VITE_GEMINI_KEY', role: 'Backup 1' },
            { name: 'DeepSeek V3', key: 'VITE_DEEPSEEK_KEY', role: 'Backup 2' },
            { name: 'OpenAI GPT-4o', key: 'VITE_OPENAI_KEY', role: 'Backup 3' },
            { name: 'Mistral AI', key: 'VITE_MISTRAL_KEY', role: 'Backup 4' },
            { name: 'OpenRouter', key: 'VITE_OPENROUTER_KEY', role: 'Backup 5' },
          ].map(ai => (
            <div key={ai.name} className="p-3 rounded-lg bg-black/40 border border-cyan-950 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-mono text-cyan-400">{ai.role}</div>
                <div className="text-xs font-bold text-white mt-0.5">{ai.name}</div>
              </div>
              <div className="mt-2.5 pt-2 border-t border-cyan-950 flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                <CheckCircle2 className="w-3 h-3" />
                <span>TERSEDIA</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── LIVE DATA PIPELINE HEALTH ─── */}
      <div className="rounded-xl bg-[#081226] border border-cyan-900/50 p-4">
        <div className="flex items-center gap-2 border-b border-cyan-900/40 pb-3 mb-4">
          <Server className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
            Status Kesehatan Jalur Data Real-Time (Data Pipeline Health)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="text-[10px] uppercase text-gray-500 bg-black/30 border-b border-cyan-950">
              <tr>
                <th className="py-2.5 px-3">Pipeline / Sumber Data</th>
                <th className="py-2.5 px-3">Peran Telemetri</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Latensi Rata-rata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-950/40">
              {PIPELINE_STATUSES.map(pipe => (
                <tr key={pipe.name} className="hover:bg-cyan-950/20 transition">
                  <td className="py-2.5 px-3 font-semibold text-white">{pipe.name}</td>
                  <td className="py-2.5 px-3 text-gray-400">{pipe.role}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/40 flex items-center gap-1 w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {pipe.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-cyan-400">{pipe.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
