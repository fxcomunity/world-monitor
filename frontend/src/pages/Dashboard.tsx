import React, { useState, useEffect } from 'react';
import {
  RefreshCw, TrendingUp, TrendingDown, DollarSign,
  Activity, ShieldAlert, BarChart3, Flame,
  ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';
import {
  fetchDisasters,
  fetchEarthquakes,
  fetchExchangeRates,
  fetchGlobalGDP,
  fetchLiveCommodities,
  categoryToIcon,
  LiveGDPRecord
} from '../lib/api';
import { ListSkeleton, TableSkeleton, ValueSkeleton } from '../components/MonitorSkeleton';

interface DisasterEvent {
  id: string;
  title: string;
  category: string;
  date: string | null;
  lat: number | null;
  lng: number | null;
}

interface QuakeEvent {
  id: string;
  title: string;
  magnitude: number;
  place: string;
  time: string;
  lat: number;
  lng: number;
}

interface LiveCommodityItem {
  name: string;
  symbol: string;
  price: string;
  unit: string;
  date: string;
  source: string;
}

export default function StatisticsDashboard() {
  const [time, setTime] = useState(new Date());
  const [disasters, setDisasters] = useState<DisasterEvent[]>([]);
  const [quakes, setQuakes] = useState<QuakeEvent[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [gdpList, setGdpList] = useState<LiveGDPRecord[]>([]);
  const [commodities, setCommodities] = useState<LiveCommodityItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastSync, setLastSync] = useState<string>('');

  // Clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load latest available feed data; each provider keeps its own update cadence.
  const loadStats = async () => {
    setLoading(true);
    try {
      const [disRes, quakeRes, gdpRes] = await Promise.allSettled([
        fetchDisasters(),
        fetchEarthquakes(),
        fetchGlobalGDP(),
      ]);

      if (disRes.status === 'fulfilled') setDisasters(disRes.value);
      if (quakeRes.status === 'fulfilled') setQuakes(quakeRes.value);
      if (gdpRes.status === 'fulfilled' && gdpRes.value?.length) {
        setGdpList(gdpRes.value);
      }
      setLastSync(new Date().toLocaleTimeString('id-ID'));
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    let active = true;
    const refreshRates = async () => {
      try {
        const result = await fetchExchangeRates('USD');
        if (active) setRates(result.conversion_rates);
      } catch (error) {
        if (!active) return;
        console.error('Failed to refresh dashboard currency quotes:', error);
        setRates({});
      }
    };

    refreshRates();
    const interval = window.setInterval(refreshRates, 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const refreshCommodities = async () => {
      try {
        const result = await fetchLiveCommodities();
        if (active) setCommodities(result);
      } catch (error) {
        if (!active) return;
        console.error('Failed to refresh dashboard commodity quotes:', error);
        setCommodities([]);
      }
    };

    refreshCommodities();
    const interval = window.setInterval(refreshCommodities, 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  // Hitung distribusi kategori bencana NASA EONET
  const categoryCount: Record<string, number> = {};
  disasters.forEach(d => {
    categoryCount[d.category] = (categoryCount[d.category] || 0) + 1;
  });
  const categoryList = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
  const totalDisasters = disasters.length || 1;

  // Hitung metrik gempa USGS real-time
  const avgQuakeMag = quakes.length
    ? (quakes.reduce((sum, q) => sum + q.magnitude, 0) / quakes.length).toFixed(2)
    : '0';
  const highestQuake = quakes.length
    ? Math.max(...quakes.map(q => q.magnitude)).toFixed(1)
    : '0';

  const keyCurrencies = [
    { code: 'IDR', name: 'Rupiah Indonesia' },
    { code: 'EUR', name: 'Euro Uni Eropa' },
    { code: 'GBP', name: 'Pound Sterling' },
    { code: 'JPY', name: 'Yen Jepang' },
    { code: 'CNY', name: 'Yuan Tiongkok' },
    { code: 'SGD', name: 'Dolar Singapura' },
    { code: 'AUD', name: 'Dolar Australia' },
    { code: 'CHF', name: 'Franc Swiss' },
  ];

  const maxGdp = gdpList.length > 0 ? Math.max(...gdpList.map(g => g.gdpTrillion)) : 30;

  return (
    <div className="w-full min-h-full bg-[#030712] text-white font-mono flex flex-col">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 bg-[#040d21] border-b border-cyan-900/40 sticky top-0 z-30 flex-shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00e5ff] flex-shrink-0" />
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-widest text-white uppercase flex flex-wrap items-center gap-2">
              <span>GLOBAL STATISTICAL INTELLIGENCE</span>
              <span className="text-[10px] text-emerald-400 border border-emerald-800/80 px-1.5 py-0.5 rounded bg-emerald-950/60 font-bold">
                FEED LIVE & RILIS TERBARU
              </span>
            </h1>
            <div className="text-[11px] text-gray-400">
              Pusat Analisis Metrik Ekonomi, Seismik USGS, Bencana NASA EONET, & Valas Dunia
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <div className="text-left sm:text-right">
            <div className="text-xs text-cyan-300 tabular-nums font-bold">
              {time.toLocaleTimeString('id-ID', { hour12: false })} WIB
            </div>
            <div className="text-[10px] text-gray-500">
              {loading ? 'SINKRONISASI DATA REAL-TIME...' : `TERAKHIR DIPERBARUI: ${lastSync}`}
            </div>
          </div>
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex min-h-10 items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 hover:border-cyan-400 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            REFRESH METRIK
          </button>
        </div>
      </div>

      {/* ── Main Statistical Content ── */}
      <div className="p-3 sm:p-5 lg:p-6 space-y-6 flex-1">
        {/* ── SECTION 1: KEY PERFORMANCE INDICATORS (KPI CARDS) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* KPI 1 */}
          <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#0a1934] to-[#06122b]/80 border border-cyan-900/50 shadow-lg relative overflow-hidden transition hover:border-cyan-700/70">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span className="font-bold tracking-wider">TOTAL INSIDEN AKTIF</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-1">
              {loading && disasters.length === 0 && quakes.length === 0
                ? <ValueSkeleton className="h-8 w-14" />
                : disasters.length + quakes.length}
            </div>
            <div className="text-[11px] text-cyan-400 flex items-center justify-between">
              <span>NASA EONET: {disasters.length}</span>
              <span>USGS Seismik: {quakes.length}</span>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#251a20] to-[#06122b]/80 border border-amber-900/50 shadow-lg relative overflow-hidden transition hover:border-amber-700/70">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span className="font-bold tracking-wider">AKTIVITAS SEISMIK M5+</span>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-amber-400 mb-1">
              {loading && quakes.length === 0
                ? <ValueSkeleton className="h-8 w-14" />
                : <>{quakes.length} <span className="text-xs text-gray-400 font-normal">Gempa (7 Hari)</span></>}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>Max: M{highestQuake}</span>
              <span>Rata-rata: M{avgQuakeMag}</span>
            </div>
          </div>

          {/* KPI 3 */}
          <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#0b2427] to-[#06122b]/80 border border-emerald-900/50 shadow-lg relative overflow-hidden transition hover:border-emerald-700/70">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span className="font-bold tracking-wider">KURS LIVE USD / IDR</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-emerald-400 mb-1">
              {rates['IDR'] ? `Rp ${Math.round(rates['IDR']).toLocaleString('id-ID')}` : loading ? <ValueSkeleton className="h-8 w-32" /> : '—'}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span className="text-emerald-400 font-bold">Yahoo Finance · intraday</span>
              <span>USD Base</span>
            </div>
          </div>

          {/* KPI 4 */}
          <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#171b36] to-[#06122b]/80 border border-indigo-900/50 shadow-lg relative overflow-hidden transition hover:border-indigo-700/70">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span className="font-bold tracking-wider">KURS EURO (USD / EUR)</span>
              <DollarSign className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-bold text-indigo-300 mb-1">
              {rates['EUR'] ? `€ ${rates['EUR'].toFixed(4)}` : loading ? <ValueSkeleton className="h-8 w-24" /> : '—'}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span>Kutipan pasar intraday</span>
              <span className="text-indigo-400">Pasar Valas Global</span>
            </div>
          </div>
        </div>

        {/* ── SECTION 2: EKONOMI & NILAI TUKAR GLOBAL ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Latest annual GDP data from World Bank */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[#06122b]/60 border border-cyan-900/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-900/30 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm tracking-wider text-white uppercase">
                  PDB EKONOMI GLOBAL (USD TRILIUN) — DATA TERBARU WORLD BANK
                </span>
              </div>
              <span className="text-[11px] text-emerald-400 font-bold border border-emerald-900/60 px-2 py-0.5 rounded bg-emerald-950/40">
                TAHUNAN · UPDATE API
              </span>
            </div>

            <div className="space-y-3">
              {gdpList.length > 0 ? (
                gdpList.map((item) => (
                  <div key={item.code} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-800 text-cyan-400">
                          {item.code}
                        </span>
                        <span className="text-white font-medium">{item.name}</span>
                        <span className="text-[10px] text-gray-500">Tahun {item.year}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white text-right">${item.gdpTrillion} Triliun</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-2 rounded-full bg-gray-800/80 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
                        style={{ width: `${Math.min(100, (item.gdpTrillion / maxGdp) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : loading ? (
                <ListSkeleton rows={5} />
              ) : (
                <div className="text-xs text-gray-500 py-4 text-center">Data PDB belum tersedia.</div>
              )}
            </div>
            <div className="border-t border-cyan-900/30 pt-3 text-[10px] text-gray-500">
              PDB adalah data tahunan, bukan real-time. Ditampilkan berdasarkan tahun terakhir yang tersedia dari World Bank per negara.
              {lastSync && <span> Sinkronisasi API: {lastSync}.</span>}
            </div>
          </div>

          {/* Nilai Tukar Valuta Asing (Live Kurs) */}
          <div className="p-5 rounded-2xl bg-[#06122b]/60 border border-cyan-900/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-900/30 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-sm tracking-wider text-white uppercase">
                  KURS MATA UANG (USD BASE)
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">UPDATE 1 MENIT</span>
            </div>

            <div className="space-y-2.5">
              {keyCurrencies.map((c) => {
                const val = rates[c.code];
                return (
                  <div
                    key={c.code}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-black/30 border border-white/5 text-xs hover:border-cyan-500/40 transition"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="text-cyan-400 font-bold">{c.code}</span>
                        <span className="text-[10px] text-gray-500">({c.name})</span>
                      </div>
                    </div>
                    <div className="text-right font-bold text-emerald-400">
                      {val ? (
                        c.code === 'IDR' || c.code === 'JPY'
                          ? Math.round(val).toLocaleString('id-ID')
                          : val.toFixed(4)
                      ) : loading ? (
                        <ValueSkeleton className="h-3 w-16" />
                      ) : (
                        '--'
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SECTION 3: HARGA KOMODITAS REAL-TIME & BENCANA ALAM ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Komoditas Pasar Real-Time (Alpha Vantage) */}
          <div className="p-5 rounded-2xl bg-[#06122b]/60 border border-cyan-900/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-900/30 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm tracking-wider text-white uppercase">
                  FUTURES KOMODITAS · LIVE INTRADAY
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold border border-emerald-900/60 px-2 py-0.5 rounded bg-emerald-950/40">
                UPDATE 1 MENIT
              </span>
            </div>

            <div className="space-y-3">
              {commodities.length > 0 ? (
                commodities.map((com) => (
                  <div
                    key={com.symbol}
                    className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 text-xs"
                  >
                    <div>
                      <div className="text-white font-bold flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-950 border border-cyan-800 text-cyan-400 font-bold">
                          {com.symbol}
                        </span>
                        <span>{com.name}</span>
                      </div>
                      <div className="text-gray-500 text-[10px]">
                        {com.unit} · {new Date(com.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white text-sm">{com.price}</div>
                      <div className="text-[10px] text-emerald-400 font-bold">
                        {com.source}
                      </div>
                    </div>
                  </div>
                ))
              ) : loading ? (
                <ListSkeleton rows={3} />
              ) : (
                <div className="text-xs text-gray-500 py-4 text-center">Data komoditas belum tersedia.</div>
              )}
            </div>
          </div>

          {/* Distribusi Kategori Bencana Alam (NASA EONET) */}
          <div className="p-5 rounded-2xl bg-[#06122b]/60 border border-cyan-900/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-900/30 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span className="font-bold text-sm tracking-wider text-white uppercase">
                  DISTRIBUSI BENCANA ALAM AKTIF (NASA EONET)
                </span>
              </div>
              <span className="text-[11px] text-rose-400 font-bold">TOTAL: {disasters.length}</span>
            </div>

            <div className="space-y-3">
              {loading && categoryList.length === 0 ? <ListSkeleton rows={4} /> : categoryList.slice(0, 6).map(([cat, count]) => {
                const pct = Math.round((count / totalDisasters) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-300 font-medium">{cat}</span>
                      <span className="font-bold text-white">{count} kasus ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── SECTION 4: DAFTAR SEISMIK GEMPA USGS M5+ REAL-TIME ── */}
        <div className="p-5 rounded-2xl bg-[#06122b]/60 border border-cyan-900/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-900/30 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-sm tracking-wider text-white uppercase">
                LOG AKTIVITAS SEISMIK GEMPA BUMI SIGNIFICANT M5+ (USGS REAL-TIME)
              </span>
            </div>
            <span className="text-[11px] text-amber-400 font-bold">{quakes.length} INSIDEN TERCATAT</span>
          </div>

          <div className="overflow-x-auto">
            {loading && quakes.length === 0 ? <TableSkeleton rows={6} columns={5} /> : (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-cyan-900/40 text-gray-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Magnitudo</th>
                  <th className="py-2.5 px-3">Lokasi Pusat Gempa</th>
                  <th className="py-2.5 px-3">Waktu Kejadian (UTC)</th>
                  <th className="py-2.5 px-3 text-right">Koordinat (Lat, Lng)</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-950/50">
                {quakes.slice(0, 10).map((q) => (
                  <tr key={q.id} className="hover:bg-cyan-950/30 transition">
                    <td className="py-2.5 px-3 font-bold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          q.magnitude >= 6.5
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        M{q.magnitude.toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-200 font-medium">{q.place}</td>
                    <td className="py-2.5 px-3 text-gray-400 text-[11px]">
                      {new Date(q.time).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-400 font-mono text-[11px]">
                      {q.lat.toFixed(2)}°, {q.lng.toFixed(2)}°
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 font-bold">
                        VERIFIKASI USGS
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
