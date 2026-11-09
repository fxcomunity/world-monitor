import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, RefreshCw, DollarSign,
  ArrowUpRight, ArrowDownRight, Layers, BarChart2,
  Percent, Globe, ShieldCheck, Wallet, ArrowRightLeft,
  Search, Activity
} from 'lucide-react';
import {
  fetchExchangeRates,
  fetchIntradayExchangeRate,
  fetchGlobalInflation,
  fetchLiveCommodities,
  IntradayExchangeRatePoint,
  LiveInflationRecord
} from '../lib/api';
import { ListSkeleton, ValueSkeleton } from '../components/MonitorSkeleton';

interface LiveCommodityItem {
  name: string;
  symbol: string;
  price: string;
  unit: string;
  date: string;
  source: string;
}

const CURRENCY_DIRECTORY = [
  { code: 'IDR', name: 'Rupiah Indonesia', symbol: 'Rp' },
  { code: 'EUR', name: 'Euro Uni Eropa', symbol: '€' },
  { code: 'GBP', name: 'Pound Inggris', symbol: '£' },
  { code: 'JPY', name: 'Yen Jepang', symbol: '¥' },
  { code: 'CNY', name: 'Yuan Tiongkok', symbol: '¥' },
  { code: 'SGD', name: 'Dolar Singapura', symbol: 'S$' },
  { code: 'AUD', name: 'Dolar Australia', symbol: 'A$' },
  { code: 'CHF', name: 'Franc Swiss', symbol: 'CHF' },
  { code: 'CAD', name: 'Dolar Kanada', symbol: 'C$' },
  { code: 'HKD', name: 'Dolar Hong Kong', symbol: 'HK$' },
  { code: 'SAR', name: 'Riyal Arab Saudi', symbol: 'SR' },
  { code: 'KRW', name: 'Won Korea Selatan', symbol: '₩' },
  { code: 'INR', name: 'Rupee India', symbol: '₹' },
  { code: 'MYR', name: 'Ringgit Malaysia', symbol: 'RM' },
  { code: 'THB', name: 'Baht Thailand', symbol: '฿' },
  { code: 'BRL', name: 'Real Brasil', symbol: 'R$' },
  { code: 'ZAR', name: 'Rand Afrika Selatan', symbol: 'R' },
  { code: 'NZD', name: 'Dolar Selandia Baru', symbol: 'NZ$' },
  { code: 'AED', name: 'Dirham UEA', symbol: 'AED' },
  { code: 'TRY', name: 'Lira Turki', symbol: '₺' },
];

export default function EconomicMonitor() {
  const [rates, setRates] = useState<Record<string, number>>({});
  const [quoteTimestamps, setQuoteTimestamps] = useState<Record<string, number>>({});
  const [inflationList, setInflationList] = useState<LiveInflationRecord[]>([]);
  const [commodities, setCommodities] = useState<LiveCommodityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [commoditiesLoading, setCommoditiesLoading] = useState(true);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [lastSync, setLastSync] = useState('');
  const [searchCur, setSearchCur] = useState('');
  const [trendCurrency, setTrendCurrency] = useState('IDR');
  const [intradayRates, setIntradayRates] = useState<IntradayExchangeRatePoint[]>([]);
  const [intradayLoading, setIntradayLoading] = useState(true);
  const [intradayError, setIntradayError] = useState<string | null>(null);
  
  // Converter State
  const [convertAmount, setConvertAmount] = useState<number>(100);
  const [sourceCur, setSourceCur] = useState('USD');
  const [targetCur, setTargetCur] = useState('IDR');

  const loadData = async () => {
    setLoading(true);
    try {
      setInflationList(await fetchGlobalInflation());
    } catch (err) {
      setInflationList([]);
      console.error('Failed to load annual inflation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshCommodities = async () => {
    try {
      setCommodities(await fetchLiveCommodities());
    } catch (error) {
      setCommodities([]);
      console.error('Failed to refresh live commodity quotes:', error);
    } finally {
      setCommoditiesLoading(false);
    }
  };

  const refreshRates = async () => {
    try {
      const result = await fetchExchangeRates('USD');
      if (!result?.conversion_rates || Object.keys(result.conversion_rates).length === 0) {
        throw new Error('Sumber kurs referensi tidak mengembalikan data.');
      }
      setRates(result.conversion_rates);
      setQuoteTimestamps(result.quote_timestamps);
      setLastSync(new Date().toLocaleTimeString('id-ID'));
    } catch (error) {
      setRates({});
      setQuoteTimestamps({});
      setLastSync('');
      console.error('Failed to refresh exchange rates:', error);
    } finally {
      setRatesLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = window.setInterval(loadData, 30 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    refreshCommodities();
    const interval = window.setInterval(refreshCommodities, 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    let requestInFlight = false;
    const updateIntraday = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      setIntradayLoading(true);
      setIntradayError(null);
      try {
        const points = await fetchIntradayExchangeRate(trendCurrency);
        if (!active) return;
        if (points.length === 0) throw new Error('Belum ada kutipan intraday terbaru.');
        setIntradayRates(points);
        setRates(current => ({
          ...current,
          [trendCurrency]: points[points.length - 1].rate,
        }));
        setQuoteTimestamps(current => ({
          ...current,
          [trendCurrency]: points[points.length - 1].timestamp,
        }));
      } catch (error) {
        if (!active) return;
        console.error(`Failed to load live USD/${trendCurrency} quotes:`, error);
        setIntradayRates([]);
        setIntradayError(error instanceof Error ? error.message : 'Kutipan real-time gagal dimuat.');
      } finally {
        requestInFlight = false;
        if (active) setIntradayLoading(false);
      }
    };

    updateIntraday();
    const interval = window.setInterval(updateIntraday, 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [trendCurrency]);

  useEffect(() => {
    refreshRates();
    const interval = window.setInterval(refreshRates, 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Konversi kalkulator real-time
  const sourceRate = sourceCur === 'USD' ? 1 : (rates[sourceCur] ?? null);
  const targetRate = targetCur === 'USD' ? 1 : (rates[targetCur] ?? null);
  const convertedResult = sourceRate !== null && targetRate !== null
    ? (convertAmount / sourceRate) * targetRate
    : null;

  const filteredCurrencies = CURRENCY_DIRECTORY.filter(c =>
    c.code.toLowerCase().includes(searchCur.toLowerCase()) ||
    c.name.toLowerCase().includes(searchCur.toLowerCase())
  );
  const intradayValues = intradayRates.map(point => point.rate);
  const intradayChangePercent = intradayValues.length > 1 && intradayValues[0] !== 0
    ? ((intradayValues[intradayValues.length - 1] - intradayValues[0]) / intradayValues[0]) * 100
    : null;
  const intradayMin = intradayValues.length ? Math.min(...intradayValues) : 0;
  const intradayMax = intradayValues.length ? Math.max(...intradayValues) : 1;
  const intradayRange = intradayMax - intradayMin || 1;
  const chartPoints = intradayRates.map((point, index) => ({
    ...point,
    x: 32 + (index / Math.max(1, intradayRates.length - 1)) * 576,
    y: 180 - ((point.rate - intradayMin) / intradayRange) * 145,
  }));
  const chartPath = chartPoints.map((point, index) =>
    `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`
  ).join(' ');
  const chartAreaPath = chartPoints.length
    ? `${chartPath} L 608 190 L 32 190 Z`
    : '';
  const latestIntradayPoint = intradayRates[intradayRates.length - 1];
  const formatQuoteTime = (timestamp: number) => new Date(timestamp * 1000)
    .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

  return (
    <div className="w-full min-h-full bg-[#030712] text-white font-mono flex flex-col">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-[#040d21] border-b border-cyan-900/40 sticky top-0 z-30 flex-shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00e5ff] flex-shrink-0" />
          <div>
            <h1 className="text-xs sm:text-sm font-bold tracking-widest text-white uppercase flex flex-wrap items-center gap-2">
              <span>GLOBAL FINANCIAL & ECONOMIC INTELLIGENCE</span>
              <span className="text-[10px] text-emerald-400 border border-emerald-800/80 px-1.5 py-0.5 rounded bg-emerald-950/60 font-bold">
                USD/{trendCurrency} · LIVE INTRADAY
              </span>
            </h1>
            <div className="text-[11px] text-gray-400">
              Papan FX dan grafik diperbarui tiap menit · kutipan lebih tua dari 15 menit disembunyikan
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <div className="text-left sm:text-right">
            <div className="text-xs text-cyan-300 font-bold">
              {new Date().toLocaleTimeString('id-ID', { hour12: false })} WIB
            </div>
            <div className="text-[10px] text-gray-500">
              {ratesLoading ? 'MEMUAT SNAPSHOT KURS...' : `SNAPSHOT KURS: ${lastSync || '—'}`}
            </div>
          </div>
          <button
            onClick={() => {
              loadData();
              refreshCommodities();
              refreshRates();
            }}
            disabled={loading || commoditiesLoading || ratesLoading}
            className="flex min-h-10 items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 hover:border-cyan-400 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || commoditiesLoading || ratesLoading ? 'animate-spin' : ''}`} />
            SINKRONISASI
          </button>
        </div>
      </div>

      {/* ── CONTENT CONTAINER ── */}
      <div className="p-3 sm:p-5 lg:p-6 space-y-6 flex-1">
        {/* ── TOP KPI CARDS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* KPI 1: USD / IDR */}
          <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#0b2427] to-[#06122b]/80 border border-emerald-900/50 shadow-lg relative transition hover:border-emerald-700/70">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span className="font-bold tracking-wider">KURS TERBARU USD / IDR</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-emerald-400 mb-1">
              {rates['IDR'] ? `Rp ${Math.round(rates['IDR']).toLocaleString('id-ID')}` : ratesLoading ? <ValueSkeleton className="h-8 w-32" /> : '—'}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span className="text-emerald-400 font-medium">Yahoo Finance · live</span>
              <span className="text-gray-500">1 USD = Rp {rates['IDR'] ? Math.round(rates['IDR']).toLocaleString('id-ID') : '--'}</span>
            </div>
          </div>

          {/* KPI 2: USD / EUR */}
          <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#0a1934] to-[#06122b]/80 border border-cyan-900/50 shadow-lg relative transition hover:border-cyan-700/70">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span className="font-bold tracking-wider">KURS TERBARU USD / EUR</span>
              <DollarSign className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-cyan-400 mb-1">
              {rates['EUR'] ? `€ ${rates['EUR'].toFixed(4)}` : ratesLoading ? <ValueSkeleton className="h-8 w-24" /> : '—'}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span className="text-cyan-400 font-medium">Uni Eropa</span>
              <span className="text-gray-500">1 USD = €{rates['EUR'] ? rates['EUR'].toFixed(4) : '--'}</span>
            </div>
          </div>

          {/* KPI 3: USD / CNY */}
          <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#251a20] to-[#06122b]/80 border border-amber-900/50 shadow-lg relative transition hover:border-amber-700/70">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span className="font-bold tracking-wider">KURS TERBARU USD / CNY</span>
              <DollarSign className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-bold text-amber-400 mb-1">
              {rates['CNY'] ? `¥ ${rates['CNY'].toFixed(4)}` : ratesLoading ? <ValueSkeleton className="h-8 w-24" /> : '—'}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span className="text-amber-400 font-medium">Yuan Tiongkok</span>
              <span className="text-gray-500">Intraday market quote</span>
            </div>
          </div>

          {/* KPI 4: USD / JPY */}
          <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#171b36] to-[#06122b]/80 border border-indigo-900/50 shadow-lg relative transition hover:border-indigo-700/70">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span className="font-bold tracking-wider">KURS TERBARU USD / JPY</span>
              <DollarSign className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-3xl font-bold text-indigo-300 mb-1">
              {rates['JPY'] ? `¥ ${rates['JPY'].toFixed(2)}` : ratesLoading ? <ValueSkeleton className="h-8 w-24" /> : '—'}
            </div>
            <div className="text-[11px] text-gray-400 flex items-center justify-between">
              <span className="text-indigo-400 font-medium">Yen Jepang</span>
              <span className="text-gray-500">Intraday market quote</span>
            </div>
          </div>
        </div>

        <section className="rounded-2xl bg-[#06122b]/60 border border-cyan-900/40 shadow-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-900/30 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <div>
                <h2 className="font-bold text-sm tracking-wider text-white uppercase">Tren Kurs Intraday</h2>
                <p className="text-[10px] text-gray-500 mt-1">
                  Harga pasar USD/{trendCurrency} · interval 1 menit · Yahoo Finance
                  {latestIntradayPoint && ` · update ${formatQuoteTime(latestIntradayPoint.timestamp)} WIB`}
                </p>
                {!intradayLoading && intradayChangePercent !== null && (
                  <div className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold tabular-nums ${
                    intradayChangePercent > 0
                      ? 'border-emerald-800/60 bg-emerald-950/40 text-emerald-300'
                      : intradayChangePercent < 0
                        ? 'border-rose-800/60 bg-rose-950/40 text-rose-300'
                        : 'border-gray-700 bg-gray-900/50 text-gray-300'
                  }`}>
                    {intradayChangePercent >= 0
                      ? <TrendingUp className="h-3 w-3" aria-hidden="true" />
                      : <TrendingDown className="h-3 w-3" aria-hidden="true" />}
                    <span>
                      {intradayChangePercent > 0 ? 'Naik' : intradayChangePercent < 0 ? 'Turun' : 'Tetap'}{' '}
                      {Math.abs(intradayChangePercent).toLocaleString('id-ID', { maximumFractionDigits: 3 })}% hari ini
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="trend-currency">Pilih mata uang</label>
              <select
                id="trend-currency"
                value={trendCurrency}
                onChange={event => setTrendCurrency(event.target.value)}
                className="bg-[#030919] border border-cyan-900/60 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                {CURRENCY_DIRECTORY.map(currency => (
                  <option key={currency.code} value={currency.code}>{currency.code}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full min-h-0 overflow-hidden rounded-lg" aria-label={`Grafik USD ke ${trendCurrency}`}>
            {intradayLoading ? (
              <div className="h-full rounded-lg bg-cyan-950/20 animate-pulse" role="status" aria-label="Memuat grafik kurs" />
            ) : intradayError ? (
              <div className="h-full flex items-center justify-center px-4 text-center text-xs text-amber-300">{intradayError}</div>
            ) : intradayRates.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-500">Belum ada kutipan intraday terbaru untuk {trendCurrency}.</div>
            ) : (
              <div className="h-full flex flex-col">
                <svg
                  viewBox="0 0 640 210"
                  preserveAspectRatio="none"
                  role="img"
                  aria-label={`Kurs intraday USD ke ${trendCurrency}, ${intradayRates.length} titik data`}
                  className="block h-full min-h-0 w-full flex-1 overflow-hidden"
                >
                  <defs>
                    <linearGradient id="currency-history-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[35, 108, 180].map(y => (
                    <line key={y} x1="32" x2="608" y1={y} y2={y} stroke="#164e63" strokeDasharray="4 5" />
                  ))}
                  <path d={chartAreaPath} fill="url(#currency-history-fill)" />
                  <path d={chartPath} fill="none" stroke="#22d3ee" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                  {chartPoints.map(point => (
                    <circle key={point.timestamp} cx={point.x} cy={point.y} r="2" fill="#67e8f9">
                      <title>{new Date(point.timestamp * 1000).toLocaleString('id-ID')}: {point.rate.toLocaleString('id-ID', { maximumFractionDigits: 4 })} {trendCurrency} per USD</title>
                    </circle>
                  ))}
                  <text x="32" y="18" fill="#94a3b8" fontSize="10">
                    {intradayMax.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                  </text>
                  <text x="32" y="204" fill="#94a3b8" fontSize="10">
                    {intradayMin.toLocaleString('id-ID', { maximumFractionDigits: 2 })}
                  </text>
                </svg>
                <div className="flex justify-between pl-8 pr-1 text-[10px] text-gray-500">
                  <span>{formatQuoteTime(intradayRates[0].timestamp)} WIB</span>
                  <span>{formatQuoteTime(intradayRates[intradayRates.length - 1].timestamp)} WIB</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── SECTION 2: FOREX LIVE BOARD & CONVERTER ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Multi-Currency Rates Table (2 Cols) */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[#06122b]/60 border border-cyan-900/40 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-900/30 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm tracking-wider text-white uppercase">
                  PAPAN NILAI TUKAR MATA UANG LIVE (BASIS: 1 USD)
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari kode / negara..."
                  value={searchCur}
                  onChange={e => setSearchCur(e.target.value)}
                  className="bg-[#030919] border border-cyan-900/60 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 w-48"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-cyan-900/40 text-gray-400 uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Mata Uang</th>
                    <th className="py-2.5 px-3">Negara / Wilayah</th>
                    <th className="py-2.5 px-3 text-right">Nilai Per 1 USD</th>
                    <th className="py-2.5 px-3 text-right">Nilai Dalam IDR</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-950/50">
                  {filteredCurrencies.map(c => {
                    const rateVal = rates[c.code];
                    const idrVal = rates['IDR'] && rateVal ? (rates['IDR'] / rateVal) : 0;
                    const quoteTime = quoteTimestamps[c.code];
                    const quoteIsLive = quoteTime !== undefined && Date.now() / 1000 - quoteTime < 15 * 60;
                    return (
                      <tr key={c.code} className="hover:bg-cyan-950/30 transition">
                        <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950 border border-cyan-800 text-cyan-400 font-bold">
                            {c.code}
                          </span>
                          <span>{c.symbol}</span>
                        </td>
                        <td className="py-3 px-3 text-gray-300 font-medium">
                          {c.name}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-cyan-300 tabular-nums">
                          {rateVal
                            ? (rateVal > 100 ? rateVal.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : rateVal.toFixed(4))
                            : ratesLoading ? <ValueSkeleton className="h-3 w-16" /> : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-400 tabular-nums">
                          {idrVal ? `Rp ${Math.round(idrVal).toLocaleString('id-ID')}` : '--'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                            quoteIsLive
                              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                              : 'bg-gray-900/60 border-gray-700 text-gray-500'
                          }`}>
                            {quoteIsLive ? `LIVE ${formatQuoteTime(quoteTime)} WIB` : 'TIDAK TERSEDIA'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Currency Converter & Quick Stats */}
          <div className="space-y-6">
            {/* Converter Card */}
            <div className="p-5 rounded-2xl bg-[#06122b]/60 border border-cyan-900/40 shadow-xl space-y-4">
              <div className="flex items-center gap-2 border-b border-cyan-900/30 pb-3">
                <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm tracking-wider text-white uppercase">
                  KALKULATOR KONVERSI VALAS REAL-TIME
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-gray-400 block mb-1">Jumlah Nominal</label>
                  <input
                    type="number"
                    value={convertAmount}
                    onChange={e => setConvertAmount(Number(e.target.value) || 0)}
                    className="w-full bg-[#030919] border border-cyan-900/60 rounded-lg px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-400 block mb-1">Dari</label>
                    <select
                      value={sourceCur}
                      onChange={e => setSourceCur(e.target.value)}
                      className="w-full bg-[#030919] border border-cyan-900/60 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-400"
                    >
                      <option value="USD">USD - Dolar AS</option>
                      {CURRENCY_DIRECTORY.map(c => (
                        <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Ke</label>
                    <select
                      value={targetCur}
                      onChange={e => setTargetCur(e.target.value)}
                      className="w-full bg-[#030919] border border-cyan-900/60 rounded-lg px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-400"
                    >
                      <option value="IDR">IDR - Rupiah</option>
                      <option value="USD">USD - Dolar AS</option>
                      {CURRENCY_DIRECTORY.map(c => (
                        <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Calculation Result */}
                <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 mt-4 text-center">
                  <div className="text-[11px] text-gray-400 mb-1">Hasil Konversi Kurs Live:</div>
                  <div className="text-xl font-bold text-cyan-300">
                    {convertedResult === null
                      ? 'Kutipan live belum tersedia'
                      : `${convertedResult.toLocaleString('id-ID', { maximumFractionDigits: 2 })} ${targetCur}`}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">
                    {convertedResult !== null && sourceRate !== null && targetRate !== null
                      ? `1 ${sourceCur} = ${((1 / sourceRate) * targetRate).toLocaleString('id-ID', { maximumFractionDigits: 4 })} ${targetCur}`
                      : 'Menunggu kutipan terbaru dari sumber pasar.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Market Status Card */}
            <div className="p-5 rounded-2xl bg-[#06122b]/60 border border-cyan-900/40 shadow-xl space-y-3">
              <div className="flex items-center gap-2 border-b border-cyan-900/30 pb-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-xs tracking-wider text-white uppercase">
                  STATUS SESI PASAR FINANSIAL
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Sesi New York (NYSE / NASDAQ)</span>
                  <span className="text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-[10px]">
                    BUKA
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Sesi London (LSE)</span>
                  <span className="text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800 text-[10px]">
                    BUKA
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Sesi Tokyo (TSE)</span>
                  <span className="text-gray-500 font-bold px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-[10px]">
                    TUTUP
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Sesi Jakarta (BEI)</span>
                  <span className="text-gray-500 font-bold px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-[10px]">
                    TUTUP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 3: INFLASI TAHUNAN & KUTIPAN KOMODITAS INTRADAY ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* World Bank Live Inflation Rates */}
          <div className="p-5 rounded-2xl bg-[#06122b]/60 border border-cyan-900/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-900/30 pb-3">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm tracking-wider text-white uppercase">
                  TINGKAT INFLASI TAHUNAN GLOBAL (WORLD BANK)
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold border border-emerald-900/60 px-2 py-0.5 rounded bg-emerald-950/40">
                DATA TAHUNAN
              </span>
            </div>

            <div className="space-y-2.5">
              {inflationList.length > 0 ? (
                inflationList.map(item => (
                  <div key={item.code} className="flex items-center justify-between p-3 rounded-xl bg-[#030919] border border-cyan-950 hover:border-cyan-900 transition text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-800 text-cyan-400">
                        {item.code}
                      </span>
                      <div>
                        <div className="text-white font-medium">{item.name}</div>
                        <div className="text-[10px] text-gray-500">Periode World Bank: {item.year}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-cyan-300">{item.inflationYoY}% YoY</div>
                      <div className="text-[10px] text-gray-400">Indeks Harga Konsumen</div>
                    </div>
                  </div>
                ))
              ) : loading ? (
                <ListSkeleton rows={5} />
              ) : (
                <div className="text-xs text-gray-500 py-4 text-center">Data inflasi belum tersedia.</div>
              )}
            </div>
          </div>

          {/* Intraday commodity futures */}
          <div className="p-5 rounded-2xl bg-[#06122b]/60 border border-cyan-900/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-900/30 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm tracking-wider text-white uppercase">
                  HARGA FUTURES KOMODITAS · LIVE INTRADAY
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold border border-emerald-900/60 px-2 py-0.5 rounded bg-emerald-950/40">
                UPDATE 1 MENIT
              </span>
            </div>

            <div className="space-y-2.5">
              {commodities.length > 0 ? (
                commodities.map(com => (
                  <div key={com.symbol} className="flex items-center justify-between p-3 rounded-xl bg-[#030919] border border-cyan-950 hover:border-cyan-900 transition text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 border border-cyan-800 text-cyan-400">
                        {com.symbol}
                      </span>
                      <div>
                        <div className="text-white font-medium">{com.name}</div>
                        <div className="text-[10px] text-gray-500">
                          {com.unit} · Kutipan {formatQuoteTime(Date.parse(com.date) / 1000)} WIB
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-400">{com.price}</div>
                      <div className="text-[10px] text-gray-400">{com.source}</div>
                    </div>
                  </div>
                ))
              ) : commoditiesLoading ? (
                <ListSkeleton rows={3} />
              ) : (
                <div className="text-xs text-gray-500 py-4 text-center">Data komoditas belum tersedia.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
