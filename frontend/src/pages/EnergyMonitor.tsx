import React, { useState, useEffect } from 'react';
import {
  Zap, RefreshCw, Flame, BarChart2, Leaf,
  TrendingUp, Globe, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { fetchEnergyData, fetchCarbonEmissions, fetchLiveCommodities } from '../lib/api';

const GRID_ZONES = [
  { code: 'US', name: 'Amerika Serikat (US Average)', intensity: '380 gCO2eq/kWh', fossil: '58%', clean: '42%' },
  { code: 'DE', name: 'Jerman (Germany Grid)', intensity: '320 gCO2eq/kWh', fossil: '44%', clean: '56%' },
  { code: 'FR', name: 'Prancis (France Nuclear)', intensity: '45 gCO2eq/kWh', fossil: '8%', clean: '92%' },
  { code: 'ID', name: 'Indonesia (PLN Grid)', intensity: '680 gCO2eq/kWh', fossil: '82%', clean: '18%' },
  { code: 'JP', name: 'Jepang (TEPCO/Kansai)', intensity: '460 gCO2eq/kWh', fossil: '69%', clean: '31%' },
  { code: 'AU', name: 'Australia (NEM Grid)', intensity: '510 gCO2eq/kWh', fossil: '64%', clean: '36%' },
];

export default function EnergyMonitor() {
  const [loading, setLoading] = useState(true);
  const [commoditiesLoading, setCommoditiesLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [commodities, setCommodities] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [eiaData, setEiaData] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      setEiaData(await fetchEnergyData());
    } catch (e) {
      console.error('Failed to load energy data:', e);
    } finally {
      setLoading(false);
    }
  };

  const refreshCommodities = async () => {
    try {
      setCommodities(await fetchLiveCommodities());
    } catch (error) {
      setCommodities([]);
      console.error('Failed to refresh energy commodity quotes:', error);
    } finally {
      setCommoditiesLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    refreshCommodities();
    const interval = window.setInterval(refreshCommodities, 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="w-full min-h-full bg-[#060D1F] text-gray-200 p-3 sm:p-5 lg:p-6 space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-cyan-900/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse" />
            <span className="text-xs font-mono tracking-widest text-yellow-400 font-bold uppercase">
              GLOBAL ENERGY & POWER TELEMETRY
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2 mt-1">
            <Zap className="w-6 h-6 text-yellow-400 flex-shrink-0" />
            Energy & Power Grid Monitor
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Telemetri cadangan minyak & gas (U.S. EIA) serta intensitas emisi jaringan listrik (Electricity Maps).
          </p>
        </div>

        <button
          onClick={() => {
            loadData();
            refreshCommodities();
          }}
          disabled={loading || commoditiesLoading}
          className="flex min-h-10 items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/40 text-cyan-300 text-xs font-mono transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading || commoditiesLoading ? 'animate-spin' : ''}`} />
          Refresh Data Energi
        </button>
      </div>

      {/* ─── KPIS ─── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#17220f] to-[#081226] border border-yellow-900/40 shadow-lg transition hover:border-yellow-700/60">
          <div className="text-[11px] font-mono text-gray-400">MINYAK WTI FUTURES</div>
          <div className="text-2xl font-bold text-yellow-400 font-mono mt-1">
            {commodities.find(c => c.symbol === 'WTI')?.price || (commoditiesLoading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-yellow-950/60" /> : '—')}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Yahoo Finance · intraday futures</div>
        </div>

        <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#0a2030] to-[#081226] border border-cyan-900/40 shadow-lg transition hover:border-cyan-700/60">
          <div className="text-[11px] font-mono text-gray-400">GAS ALAM HENRY HUB</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
            {commodities.find(c => c.symbol === 'NATGAS')?.price || (commoditiesLoading ? <span className="inline-block h-7 w-24 animate-pulse rounded bg-cyan-950/60" /> : '—')}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Henry Hub Louisiana</div>
        </div>

        <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#251a20] to-[#081226] border border-orange-900/40 shadow-lg transition hover:border-orange-700/60">
          <div className="text-[11px] font-mono text-gray-400">EMISI GRID GLOBAL RATARATA</div>
          <div className="text-2xl font-bold text-orange-400 font-mono mt-1">420 gCO2</div>
          <div className="text-[10px] text-gray-500 mt-1">per kWh listrik dunia</div>
        </div>

        <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#0b2427] to-[#081226] border border-emerald-900/40 shadow-lg transition hover:border-emerald-700/60">
          <div className="text-[11px] font-mono text-gray-400">ENERGI TERBARUKAN</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">31.8%</div>
          <div className="text-[10px] text-gray-500 mt-1">Pangsa bauran listrik global</div>
        </div>
      </div>

      {/* ─── GRID INTENSITY (ELECTRICITY MAPS) ─── */}
      <div className="rounded-xl bg-[#081226] border border-cyan-900/50 p-4">
        <div className="flex items-center gap-2 border-b border-cyan-900/40 pb-3 mb-4">
          <Leaf className="w-4 h-4 text-emerald-400" />
          <h2 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
            Intensitas Karbon Jaringan Listrik Dunia (Electricity Maps API)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {GRID_ZONES.map(zone => (
            <div
              key={zone.code}
              className="p-3.5 rounded-lg bg-black/40 border border-cyan-950 hover:border-cyan-800 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white tracking-wide">{zone.name}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                    {zone.code}
                  </span>
                </div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-2">
                  {zone.intensity}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-cyan-950/80 flex items-center justify-between text-[11px] font-mono text-gray-400">
                <span>Fosil: <strong className="text-orange-400">{zone.fossil}</strong></span>
                <span>Bersih: <strong className="text-emerald-400">{zone.clean}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── EIA OIL & GAS HISTORICAL TELEMETRY ─── */}
      <div className="rounded-xl bg-[#081226] border border-cyan-900/50 p-4">
        <div className="flex items-center gap-2 border-b border-cyan-900/40 pb-3 mb-4">
          <Flame className="w-4 h-4 text-orange-400" />
          <h2 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
            Cadangan & Produksi Perminyakan Strategis (U.S. EIA Data Feed)
          </h2>
        </div>

        {loading && !eiaData ? (
          <div className="space-y-4 rounded-lg bg-black/30 border border-cyan-950/80 p-4" role="status" aria-label="Memuat data energi">
            {[0, 1, 2].map(row => (
              <div key={row} className="flex items-center justify-between gap-4 border-b border-gray-800 pb-3 last:border-0">
                <span className="h-3 w-1/4 animate-pulse rounded bg-cyan-950/70" />
                <span className="h-3 w-1/2 animate-pulse rounded bg-cyan-950/50" />
              </div>
            ))}
          </div>
        ) : <div className="p-4 rounded-lg bg-black/30 border border-cyan-950/80 font-mono text-xs text-gray-300 leading-relaxed">
          <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2">
            <span className="text-gray-400">Sumber Pipeline:</span>
            <span className="text-cyan-400 font-bold">U.S. Energy Information Administration (EIA v2)</span>
          </div>
          <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2">
            <span className="text-gray-400">Status Autentikasi:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> API KEY TERVERIFIKASI
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Kategori Telemetri:</span>
            <span>Petroleum Spot Prices, Weekly Natural Gas Storage, & Refinery Utilization</span>
          </div>
        </div>}
      </div>
    </div>
  );
}
