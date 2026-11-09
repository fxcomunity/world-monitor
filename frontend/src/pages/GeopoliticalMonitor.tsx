import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, RefreshCw, Sparkles, Globe, MapPin,
  ExternalLink, AlertTriangle, Layers, Radio
} from 'lucide-react';
import { fetchGeopoliticalEvents, GeopoliticalEvent, runAIAnalysis } from '../lib/api';
import { ListSkeleton, ValueSkeleton } from '../components/MonitorSkeleton';

export default function GeopoliticalMonitor() {
  const [events, setEvents] = useState<GeopoliticalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState<string>('');
  const [filterSource, setFilterSource] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchGeopoliticalEvents();
      setEvents(data);
    } catch (err) {
      console.error('Error loading geopolitical events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 90000); // 1.5 menit
    return () => clearInterval(interval);
  }, []);

  const handleRunAI = async () => {
    setAiLoading(true);
    setAiReport(null);
    try {
      const eventSamples = events.slice(0, 10).map(e => `[${e.source}] ${e.title}`).join('\n');
      const prompt = `Data Intelijen Konflik & Krisis Terkini (GDELT & UN ReliefWeb):\n${eventSamples}

Instruksi Analisis:
1. Identifikasi 3 titik konflik / hotspot geopolitik paling berisiko saat ini.
2. Dampak potensial terhadap stabilitas rute pasokan global dan harga energi.
3. Kesimpulan Indeks Ketegangan Geopolitik Global (Skala 1-100 dan status). Berikan format singkat dan tajam.`;

      const res = await runAIAnalysis(prompt);
      if (res.success && res.text) {
        setAiReport(res.text);
        setAiProvider(res.provider || 'AI Intelligence');
      } else {
        setAiReport(`Gagal memuat analisis AI: ${res.error || 'Terjadi kesalahan sistem'}`);
      }
    } catch (e: unknown) {
      setAiReport(`Error: ${(e as Error).message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const filteredEvents = filterSource === 'ALL'
    ? events
    : events.filter(e => e.source.toLowerCase().includes(filterSource.toLowerCase()));

  return (
    <div className="w-full min-h-full bg-[#060D1F] text-gray-200 p-3 sm:p-5 lg:p-6 space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-cyan-900/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase">
              GEOPOLITICAL THREAT INTELLIGENCE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2 mt-1">
            <ShieldAlert className="w-6 h-6 text-cyan-400 flex-shrink-0" />
            Geopolitical & Conflict Radar
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Agregasi insiden militer, sanksi internasional, & laporan krisis PBB via GDELT Project v2 & UN ReliefWeb.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex min-h-10 items-center gap-2 px-3 py-2 rounded-lg bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/40 text-cyan-300 text-xs font-mono transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>

          <button
            onClick={handleRunAI}
            disabled={aiLoading}
            className="flex min-h-10 items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-950/50 transition"
          >
            <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
            {aiLoading ? 'Menganalisis...' : 'AI Geopolitical Briefing'}
          </button>
        </div>
      </div>

      {/* ─── AI BRIEFING ─── */}
      {aiReport && (
        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/40 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase">
                AI Situation Assessment · {aiProvider}
              </span>
            </div>
            <button
              onClick={() => setAiReport(null)}
              className="text-xs text-gray-500 hover:text-gray-300 font-mono"
            >
              [Tutup]
            </button>
          </div>
          <div className="text-xs text-gray-300 leading-relaxed whitespace-pre-line font-mono">
            {aiReport}
          </div>
        </div>
      )}

      {/* ─── KPIS ─── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#0a1934] to-[#081226] border border-cyan-900/40 shadow-lg transition hover:border-cyan-700/60">
          <div className="text-[11px] font-mono text-gray-400">TOTAL EVENT TERPANTAU</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">{loading && events.length === 0 ? <ValueSkeleton /> : events.length}</div>
          <div className="text-[10px] text-gray-500 mt-1">GDELT + UN ReliefWeb</div>
        </div>

        <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#251519] to-[#081226] border border-red-900/40 shadow-lg transition hover:border-red-700/60">
          <div className="text-[11px] font-mono text-gray-400">KONFLIK & MILITER (GDELT)</div>
          <div className="text-2xl font-bold text-red-400 font-mono mt-1">
            {loading && events.length === 0 ? <ValueSkeleton /> : events.filter(e => e.source.includes('GDELT')).length}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Insiden bersenjata & protes</div>
        </div>

        <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#251a20] to-[#081226] border border-orange-900/40 shadow-lg transition hover:border-orange-700/60">
          <div className="text-[11px] font-mono text-gray-400">KRISIS PBB (RELIEFWEB)</div>
          <div className="text-2xl font-bold text-orange-400 font-mono mt-1">
            {loading && events.length === 0 ? <ValueSkeleton /> : events.filter(e => e.source.includes('ReliefWeb')).length}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Zona darurat kemanusiaan</div>
        </div>

        <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#25220f] to-[#081226] border border-yellow-900/40 shadow-lg transition hover:border-yellow-700/60">
          <div className="text-[11px] font-mono text-gray-400">INDEKS KETEGANGAN GLOBAL</div>
          <div className="text-2xl font-bold text-yellow-400 font-mono mt-1">MODERAT (62/100)</div>
          <div className="text-[10px] text-gray-500 mt-1">Stabilisasi regional</div>
        </div>
      </div>

      {/* ─── EVENT LIST ─── */}
      <div className="rounded-xl bg-[#081226] border border-cyan-900/50 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-cyan-900/40 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h3 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
              Live Feed Insiden & Krisis Geopolitik Dunia
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {['ALL', 'GDELT', 'ReliefWeb'].map(src => (
              <button
                key={src}
                onClick={() => setFilterSource(src)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition ${
                  filterSource === src
                    ? 'bg-cyan-500 text-black font-bold'
                    : 'bg-black/40 text-gray-400 hover:text-white'
                }`}
              >
                {src}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
          {loading && filteredEvents.length === 0 ? (
            <ListSkeleton rows={6} />
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16 text-gray-500 text-xs font-mono">
              Tidak ada event ditemukan.
            </div>
          ) : (
            filteredEvents.map(evt => (
              <div
                key={evt.id}
                className="p-3.5 rounded-lg bg-black/30 border border-cyan-950 hover:border-cyan-800 transition flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      evt.source.includes('GDELT')
                        ? 'bg-red-950 text-red-400 border border-red-800/40'
                        : 'bg-orange-950 text-orange-400 border border-orange-800/40'
                    }`}>
                      {evt.source}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">
                      {new Date(evt.date).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-gray-200 mt-1.5">{evt.title}</div>
                  {evt.lat && evt.lng && (
                    <div className="text-[10px] text-cyan-600 font-mono mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Koordinat Wilayah: [{evt.lat.toFixed(2)}, {evt.lng.toFixed(2)}]
                    </div>
                  )}
                </div>

                {evt.url && (
                  <a
                    href={evt.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 px-3 py-1.5 rounded bg-cyan-950/40 border border-cyan-800/40 self-start md:self-center"
                  >
                    <span>Sumber Berita</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
