import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame, Activity, CloudLightning, ShieldAlert,
  Play, RefreshCw, Radio, Sparkles, Filter, Video, AlertTriangle,
  ExternalLink, Layers, Search,
  Newspaper, Tv, Clock, Globe2
} from 'lucide-react';
import {
  fetchDisasters,
  fetchEarthquakes,
  runAIAnalysis,
  fetchYouTubeLiveDisasters,
  fetchYouTubeDisasterNews,
  YouTubeLiveItem
} from '../lib/api';
import { ListSkeleton, ValueSkeleton } from '../components/MonitorSkeleton';

interface DisasterEvent {
  id: string;
  title: string;
  category: string;
  date: string | null;
  lat: number | null;
  lng: number | null;
  source: string;
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

interface ActiveStream {
  id: string;
  title: string;
  channel: string;
  embedUrl: string;
  youtubeWatch: string;
  badge: string;
  desc: string;
  isLive: boolean;
}

export default function DisasterMonitor() {
  const [disasters, setDisasters] = useState<DisasterEvent[]>([]);
  const [quakes, setQuakes] = useState<QuakeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [minMagnitude, setMinMagnitude] = useState<number>(4.5);

  // Video / Radar mode
  const [feedMode, setFeedMode] = useState<'YOUTUBE' | 'WINDY'>('WINDY');
  const [activeStream, setActiveStream] = useState<ActiveStream | null>(null);
  const [customYtId, setCustomYtId] = useState('');

  // Tab: Siaran Langsung (Live) vs Berita Bencana (News)
  const [videoTab, setVideoTab] = useState<'LIVE' | 'NEWS'>('LIVE');

  // YouTube Data API v3 State
  const [liveVideos, setLiveVideos] = useState<YouTubeLiveItem[]>([]);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [newsVideos, setNewsVideos] = useState<YouTubeLiveItem[]>([]);
  const [loadingYt, setLoadingYt] = useState(false);
  const [ytTopic, setYtTopic] = useState('earthquake natural disaster live stream');
  const [newsTopic, setNewsTopic] = useState('natural disaster earthquake volcano eruption breaking news');
  // AI Analysis State
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProvider, setAiProvider] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [disasterData, quakeData] = await Promise.all([
        fetchDisasters(),
        fetchEarthquakes(),
      ]);
      setDisasters(disasterData);
      setQuakes(quakeData);
    } catch (err) {
      console.error('Error loading disaster data:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchYouTube = useCallback(async (query: string) => {
    setLoadingYt(true);
    try {
      const items = await fetchYouTubeLiveDisasters(query);
      setLiveVideos(items);
      setLiveError(null);
    } catch (err) {
      console.error('Failed to search YouTube live:', err);
      setLiveVideos([]);
      setLiveError(err instanceof Error ? err.message : 'Gagal memeriksa siaran langsung.');
    } finally {
      setLoadingYt(false);
    }
  }, []);

  const searchDisasterNews = async (query: string) => {
    setLoadingYt(true);
    try {
      const news = await fetchYouTubeDisasterNews(query);
      setNewsVideos(news);
    } catch (err) {
      console.error('Failed to fetch disaster news:', err);
    } finally {
      setLoadingYt(false);
    }
  };

  useEffect(() => {
    loadData();
    searchDisasterNews(newsTopic);
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    searchYouTube(ytTopic);
    const interval = setInterval(() => searchYouTube(ytTopic), 60000);
    return () => clearInterval(interval);
  }, [searchYouTube, ytTopic]);

  useEffect(() => {
    if (activeStream?.isLive && !liveVideos.some(video => video.id === activeStream.id)) {
      setActiveStream(null);
      setFeedMode('WINDY');
    }
  }, [activeStream, liveVideos]);

  const handleRunAI = async () => {
    setAiLoading(true);
    setAiReport(null);
    try {
      const prompt = `Data Bencana Terkini:
Jumlah Gempa Signifikan M4.5+: ${quakes.length} kejadian.
Gempa Terkuat: ${quakes[0]?.title || 'N/A'}.
Bencana Alam NASA EONET Aktif: ${disasters.length} kejadian, meliputi kebakaran hutan, siklon, badai, dan erupsi.
Contoh event: ${disasters.slice(0, 6).map(d => `${d.category}: ${d.title}`).join('; ')}.

Instruksi: Berikan ringkasan situasi darurat bencana global saat ini (Situational Awareness Briefing) dalam 3 paragraf padat:
1. Analisis aktivitas seismik dunia terkini.
2. Analisis anomali iklim dan cuaca ekstrem.
3. Rekomendasi mitigasi dan tingkat ancaman global (SKALA: RENDAH / WASPADA / KRITIS).`;

      const res = await runAIAnalysis(prompt);
      if (res.success && res.text) {
        setAiReport(res.text);
        setAiProvider(res.provider || 'AI Multi-Provider');
      } else {
        setAiReport(`Gagal memuat analisis AI: ${res.error || 'Terjadi kesalahan sistem'}`);
      }
    } catch (e: unknown) {
      setAiReport(`Error: ${(e as Error).message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSetCustomYoutube = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customYtId.trim()) return;

    let videoId = customYtId.trim();
    if (videoId.includes('v=')) {
      videoId = videoId.split('v=')[1]?.split('&')[0] || videoId;
    } else if (videoId.includes('youtu.be/')) {
      videoId = videoId.split('youtu.be/')[1]?.split('?')[0] || videoId;
    }

    setActiveStream({
      id: videoId,
      title: `Siaran Khusus (ID: ${videoId})`,
      channel: 'Custom Video Stream',
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1`,
      youtubeWatch: `https://www.youtube.com/watch?v=${videoId}`,
      badge: 'CUSTOM',
      desc: 'Video atau siaran langsung pilihan pengguna yang disematkan ke monitor.',
      isLive: false,
    });
    setFeedMode('YOUTUBE');
  };

  const filteredDisasters = selectedCategory === 'ALL'
    ? disasters
    : disasters.filter(d => d.category.toLowerCase().includes(selectedCategory.toLowerCase()));

  const filteredQuakes = quakes.filter(q => q.magnitude >= minMagnitude);

  return (
    <div className="w-full min-h-full bg-[#060D1F] text-gray-200 p-3 sm:p-5 lg:p-6 space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-cyan-900/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono tracking-widest text-red-400 font-bold uppercase">
              EARLY WARNING TELEMETRY
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2 mt-1">
            <ShieldAlert className="w-6 h-6 text-red-400 flex-shrink-0" />
            Disaster & Seismic Monitor
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Integrasi satelit NASA EONET v3, seismograf USGS (130+ gempa aktif), & YouTube Data API v3 video berita bencana.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/40 text-cyan-300 text-xs font-mono transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Telemetri
          </button>

          <button
            onClick={handleRunAI}
            disabled={aiLoading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-xs font-semibold shadow-lg shadow-red-950/50 transition"
          >
            <Sparkles className={`w-3.5 h-3.5 ${aiLoading ? 'animate-spin' : ''}`} />
            {aiLoading ? 'Menganalisis...' : 'AI Disaster Briefing'}
          </button>
        </div>
      </div>

      {/* ─── AI SITUATION BRIEFING ─── */}
      {aiReport && (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/40 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-mono font-bold text-orange-300 uppercase">
                AI Threat Assessment · {aiProvider}
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

      {/* ─── TAB SWITCHER: LIVE STREAMS VS BERITA BENCANA ─── */}
      <div className="p-3 sm:p-4 rounded-xl bg-[#081226] border border-cyan-900/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVideoTab('LIVE')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                videoTab === 'LIVE'
                  ? 'bg-red-600 text-white shadow-md shadow-red-950'
                  : 'bg-black/40 text-gray-400 hover:text-white border border-cyan-900/40'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-red-300 animate-pulse" />
              <span>🔴 Siaran Langsung Live 24/7</span>
            </button>

            <button
              onClick={() => setVideoTab('NEWS')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                videoTab === 'NEWS'
                  ? 'bg-cyan-600 text-black shadow-md shadow-cyan-950'
                  : 'bg-black/40 text-gray-400 hover:text-white border border-cyan-900/40'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span>📰 Berita Video Bencana Terkini</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-emerald-400 flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
              <Radio className="w-3 h-3" /> Pemeriksaan live tiap 60 detik
            </span>
          </div>
        </div>

        {/* Filter chips sesuai tab yang aktif */}
        {videoTab === 'LIVE' ? (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono text-gray-400 mr-1 uppercase">Topik Live:</span>
            {[
              { label: 'Gempa Bumi Live', q: 'earthquake live stream seismic' },
              { label: 'Erupsi Gunung Berapi', q: 'volcano eruption live stream' },
              { label: 'Badai & Siklon Tropis', q: 'severe weather hurricane radar live' },
              { label: 'NASA Orbit Luar Angkasa', q: 'nasa earth from space live stream' },
              { label: 'Breaking Crisis News', q: 'breaking news crisis live stream' },
            ].map(top => (
              <button
                key={top.label}
                onClick={() => {
                  setYtTopic(top.q);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition flex items-center gap-1 ${
                  ytTopic === top.q
                    ? 'bg-red-600 text-white font-bold'
                    : 'bg-black/40 text-gray-400 hover:text-white border border-cyan-950'
                }`}
              >
                <span>{top.label}</span>
                {loadingYt && ytTopic === top.q && <RefreshCw className="w-3 h-3 animate-spin" />}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-mono text-gray-400 mr-1 uppercase">Topik Berita:</span>
            {[
              { label: 'Semua Berita Bencana', q: 'natural disaster earthquake volcano eruption breaking news' },
              { label: 'Gempa & Tsunami Terkini', q: 'earthquake tsunami news alert update' },
              { label: 'Banjir & Tanah Longsor', q: 'severe flood flash flood landslide disaster news' },
              { label: 'Erupsi & Gunung Api', q: 'volcano eruption ash explosion news report' },
              { label: 'Siklon & Tornado', q: 'tornado hurricane typhoon storm damage news' },
            ].map(top => (
              <button
                key={top.label}
                onClick={() => {
                  setNewsTopic(top.q);
                  searchDisasterNews(top.q);
                }}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition flex items-center gap-1 ${
                  newsTopic === top.q
                    ? 'bg-cyan-500 text-black font-bold'
                    : 'bg-black/40 text-gray-400 hover:text-white border border-cyan-950'
                }`}
              >
                <span>{top.label}</span>
                {loadingYt && newsTopic === top.q && <RefreshCw className="w-3 h-3 animate-spin" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── MAIN PLAYER & STREAM SELECTOR ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Display Player */}
        <div className="lg:col-span-2 rounded-xl border border-cyan-900/50 bg-[#030816] overflow-hidden shadow-2xl flex flex-col">
          <div className="relative pt-[56.25%] bg-black w-full">
            {feedMode === 'WINDY' ? (
              <iframe
                src="https://embed.windy.com/embed2.html?lat=-2.5&lon=118.0&zoom=4&level=surface&overlay=radar&product=radar&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1"
                title="Live Weather & Disaster Satellite Radar"
                className="absolute inset-0 w-full h-full border-0"
                allow="geolocation"
              />
            ) : activeStream ? (
              <iframe
                src={activeStream.embedUrl}
                title={activeStream.title}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-gray-400">
                Pilih siaran langsung yang masih aktif dari daftar.
              </div>
            )}
          </div>

          <div className="p-3 bg-[#081226] border-t border-cyan-900/40 flex flex-wrap items-center justify-between gap-2">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  feedMode === 'WINDY' ? 'bg-cyan-600 text-black' : 'bg-red-600 text-white'
                }`}>
                  {feedMode === 'WINDY' ? 'LIVE SATELIT RADAR' : activeStream?.badge || 'YOUTUBE'}
                </span>
                <span className="text-xs font-semibold text-white truncate">
                  {feedMode === 'WINDY' ? 'Radar Interaktif Cuaca, Badai Tropis, & Curah Hujan Global' : activeStream?.title || 'Belum ada siaran dipilih'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                {feedMode === 'WINDY' ? 'Data Doppler radar real-time dari stasiun meteorologi dunia bebas blokir.' : activeStream?.desc || 'Siaran yang tidak lagi live otomatis dihapus dari daftar.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setFeedMode(m => m === 'WINDY' ? 'YOUTUBE' : 'WINDY')}
                className="px-2.5 py-1.5 rounded text-xs font-mono bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 hover:text-white transition"
              >
                Ganti ke: {feedMode === 'WINDY' ? 'Video Player' : 'Windy Radar'}
              </button>

              {feedMode === 'YOUTUBE' && activeStream?.youtubeWatch && (
                <a
                  href={activeStream.youtubeWatch}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-950/40 px-2.5 py-1.5 rounded border border-red-800/40 transition"
                >
                  <span>Buka di YT</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stream List / Video News Selector */}
        <div className="space-y-3 flex flex-col min-h-[500px] lg:min-h-0">
          <div className="text-xs font-mono text-gray-400 flex items-center justify-between px-1">
            <span>{videoTab === 'LIVE' ? 'Pilih Siaran Langsung (Live):' : 'Berita Video Terkini (YouTube):'}</span>
            <span className="text-[10px] text-cyan-400 font-bold">
              {videoTab === 'LIVE'
                ? `${liveVideos.length} Stream Aktif`
                : `${newsVideos.length} Berita Baru`}
            </span>
          </div>

          {/* List Video Cards with Scroll */}
          <div className="space-y-2 overflow-y-auto max-h-[380px] pr-1 overscroll-contain">
            {videoTab === 'LIVE' ? (
              liveVideos.length === 0 ? (
                loadingYt ? <ListSkeleton rows={3} /> : (
                  <div className="text-center py-10 text-gray-500 text-xs font-mono">
                    {liveError || 'Tidak ada siaran langsung aktif saat ini.'}
                  </div>
                )
              ) : (
                liveVideos.map(v => {
                  const videoId = v.id;
                  const isSelected = feedMode === 'YOUTUBE' && activeStream?.id === videoId;
                  return (
                  <button
                    key={videoId}
                    onClick={() => {
                      setActiveStream({
                        id: videoId,
                        title: v.title,
                        channel: v.channel || 'YouTube Live',
                        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1`,
                        youtubeWatch: `https://www.youtube.com/watch?v=${videoId}`,
                        badge: '🔴 LIVE YT',
                        desc: 'Siaran langsung terdeteksi oleh YouTube Data API.',
                        isLive: true,
                      });
                      setFeedMode('YOUTUBE');
                    }}
                    className={`w-full p-2.5 rounded-lg border text-left transition flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-950/40'
                        : 'bg-[#081226] border-cyan-900/40 hover:border-cyan-700/60 text-gray-400'
                    }`}
                  >
                    {v.thumbnail ? (
                      <img
                        src={v.thumbnail}
                        alt={v.title}
                        className="w-16 h-11 object-cover rounded bg-black flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-11 rounded bg-black/60 flex items-center justify-center text-red-500 flex-shrink-0">
                        <Play className="w-4 h-4 fill-current" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/50 text-red-400 border border-red-900/50">
                          LIVE
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-mono text-cyan-400 font-bold">
                            DIPUTAR
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-white mt-1 line-clamp-1">{v.title}</div>
                      <div className="text-[10px] text-gray-400 truncate mt-0.5">{v.channel}</div>
                    </div>
                  </button>
                  );
                })
              )
            ) : (
              newsVideos.length === 0 ? (
                loadingYt ? <ListSkeleton rows={3} /> : (
                  <div className="text-center py-10 text-gray-500 text-xs font-mono">
                    Belum ada berita video bencana untuk ditampilkan.
                  </div>
                )
              ) : (
                newsVideos.map(n => {
                  const isSelected = feedMode === 'YOUTUBE' && activeStream?.id === n.id;
                  return (
                    <button
                      key={n.id}
                      onClick={() => {
                        setActiveStream({
                          id: n.id,
                          title: n.title,
                          channel: n.channel,
                          embedUrl: `https://www.youtube-nocookie.com/embed/${n.id}?autoplay=1&mute=1&playsinline=1`,
                          youtubeWatch: `https://www.youtube.com/watch?v=${n.id}`,
                          badge: '📰 BERITA',
                          desc: `Dipublikasikan pada: ${new Date(n.publishedAt).toLocaleString('id-ID')}`,
                          isLive: false,
                        });
                        setFeedMode('YOUTUBE');
                      }}
                      className={`w-full p-2.5 rounded-lg border text-left transition flex items-start gap-2.5 ${
                        isSelected
                          ? 'bg-cyan-950/40 border-cyan-400 shadow-md shadow-cyan-950/40'
                          : 'bg-[#081226] border-cyan-900/40 hover:border-cyan-700/60 text-gray-400'
                      }`}
                    >
                      <img
                        src={n.thumbnail}
                        alt={n.title}
                        className="w-16 h-11 object-cover rounded bg-black flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/50 text-cyan-400 border border-cyan-900/50">
                            BERITA TERKINI
                          </span>
                          {isSelected && (
                            <span className="text-[10px] font-mono text-cyan-400 font-bold">
                              DIPUTAR
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-white mt-1 line-clamp-1">{n.title}</div>
                        <div className="text-[10px] text-gray-400 truncate mt-0.5">{n.channel}</div>
                      </div>
                    </button>
                  );
                })
              )
            )}
          </div>

          {/* Form input link sendiri */}
          <form onSubmit={handleSetCustomYoutube} className="p-3 rounded-lg bg-[#081226] border border-cyan-900/40 space-y-1.5">
            <div className="text-[11px] font-mono text-gray-300 font-bold">
              Paste Link Video / Live YouTube Sendiri:
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="youtube.com/watch?v=..."
                value={customYtId}
                onChange={e => setCustomYtId(e.target.value)}
                className="flex-1 px-2.5 py-1.5 rounded bg-black/50 border border-cyan-900/50 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-mono transition"
              >
                Play
              </button>
            </div>
          </form>

          {/* ─── MINI RADAR & QUICK QUAKE SUMMARY (fills empty space) ─── */}
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            {/* Windy Mini Radar */}
            <div className="rounded-lg border border-cyan-900/40 overflow-hidden bg-black/30 flex-shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#081226] border-b border-cyan-900/30">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider">Live Weather Radar</span>
              </div>
              <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                <iframe
                  src="https://embed.windy.com/embed2.html?lat=0&lon=110&zoom=3&level=surface&overlay=radar&product=radar&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1"
                  title="Mini Weather Radar"
                  className="absolute inset-0 w-full h-full border-0"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Quick Latest Quakes Mini Feed */}
            <div className="rounded-lg border border-cyan-900/40 bg-[#081226] flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-cyan-900/30 flex-shrink-0">
                <Activity className="w-3.5 h-3.5 text-red-400" />
                <span className="text-[10px] font-mono font-bold text-red-300 uppercase tracking-wider">Gempa Terkini</span>
                <span className="ml-auto text-[9px] font-mono text-gray-500">{filteredQuakes.length} aktif</span>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-1.5">
                {filteredQuakes.slice(0, 8).map(q => (
                  <div key={q.id} className="flex items-center gap-2 p-1.5 rounded bg-black/30 border border-cyan-950/60 hover:border-cyan-800/40 transition">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex-shrink-0 ${
                      q.magnitude >= 6.0 ? 'bg-red-600 text-white'
                      : q.magnitude >= 5.0 ? 'bg-orange-500 text-black'
                      : 'bg-emerald-600 text-white'
                    }`}>M{q.magnitude.toFixed(1)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-gray-300 truncate">{q.place}</div>
                      <div className="text-[9px] text-gray-500 font-mono">{new Date(q.time).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                ))}
                {filteredQuakes.length === 0 && loading ? <ListSkeleton rows={3} /> : filteredQuakes.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-[10px] font-mono">Tidak ada data gempa</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MID SECTION: STATS COUNTERS ─── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <div className="min-w-0 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#251519] to-[#081226] border border-red-900/40 shadow-lg transition hover:border-red-700/60">
          <div className="text-[11px] font-mono text-gray-400">GEMPA AKTIF (USGS)</div>
          <div className="text-xl sm:text-2xl font-bold text-red-400 font-mono mt-1 flex items-center justify-between">
            {loading && quakes.length === 0 ? <ValueSkeleton /> : quakes.length}
            <Activity className="w-5 h-5 text-red-500/50" />
          </div>
          <div className="text-[10px] text-gray-500 mt-1">7 hari terakhir (M4.5+)</div>
        </div>

        <div className="min-w-0 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#251a14] to-[#081226] border border-orange-900/40 shadow-lg transition hover:border-orange-700/60">
          <div className="text-[11px] font-mono text-gray-400">BENCANA AKTIF (NASA)</div>
          <div className="text-xl sm:text-2xl font-bold text-orange-400 font-mono mt-1 flex items-center justify-between">
            {loading && disasters.length === 0 ? <ValueSkeleton /> : disasters.length}
            <Flame className="w-5 h-5 text-orange-500/50" />
          </div>
          <div className="text-[10px] text-gray-500 mt-1">EONET v3 real-time</div>
        </div>

        <div className="min-w-0 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#25220f] to-[#081226] border border-yellow-900/40 shadow-lg transition hover:border-yellow-700/60">
          <div className="text-[11px] font-mono text-gray-400">GEMPA TERBESAR</div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-400 font-mono mt-1 flex items-center justify-between">
            {loading && quakes.length === 0 ? <ValueSkeleton /> : `M ${quakes[0]?.magnitude.toFixed(1) || '0.0'}`}
            <AlertTriangle className="w-5 h-5 text-yellow-500/50" />
          </div>
          <div className="text-[10px] text-gray-500 mt-1 truncate">{quakes[0]?.place || 'Belum ada data'}</div>
        </div>

        <div className="min-w-0 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-[#0b2420] to-[#081226] border border-emerald-900/40 shadow-lg transition hover:border-emerald-700/60">
          <div className="text-[11px] font-mono text-gray-400">STATUS MONITOR</div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono mt-1 flex items-center justify-between">
            ONLINE
            <Radio className="w-5 h-5 text-emerald-500/50" />
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Sensor seismik sinkron</div>
        </div>
      </div>

      {/* ─── DATA TABLES SECTION: USGS QUAKES & NASA DISASTERS ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: USGS Earthquake Feed */}
        <div className="rounded-xl bg-[#081226] border border-cyan-900/50 p-3 sm:p-4 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-cyan-900/40 pb-3 mb-3 gap-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-red-400 flex-shrink-0" />
              <h3 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
                Aktivitas Seismik Dunia (USGS Live · {filteredQuakes.length} Gempa)
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
              <span className="text-gray-400 text-[10px] mr-1">Filter:</span>
              {[4.5, 5.0, 5.5, 6.0, 7.0].map(m => (
                <button
                  key={m}
                  onClick={() => setMinMagnitude(m)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                    minMagnitude === m
                      ? 'bg-red-500 text-white font-bold'
                      : 'bg-black/40 text-gray-400 hover:text-gray-200 border border-cyan-950'
                  }`}
                >
                  M{m}+
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[420px] space-y-2 pr-1 overscroll-contain">
            {loading && quakes.length === 0 ? (
              <ListSkeleton rows={6} />
            ) : filteredQuakes.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs font-mono">
                Tidak ada gempa M{minMagnitude}+ dalam database periode ini.
              </div>
            ) : (
              filteredQuakes.map(q => (
                <div
                  key={q.id}
                  className="p-2.5 rounded-lg bg-black/30 border border-cyan-950 hover:border-cyan-800 transition flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`px-2 py-1 rounded font-mono font-bold text-xs flex-shrink-0 ${
                        q.magnitude >= 7.0
                          ? 'bg-red-600 text-white'
                          : q.magnitude >= 6.0
                          ? 'bg-orange-500 text-black'
                          : q.magnitude >= 5.0
                          ? 'bg-yellow-500 text-black'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      M {q.magnitude.toFixed(1)}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-200 truncate">{q.place}</div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5 truncate">
                        {new Date(q.time).toLocaleString('id-ID')} · [{q.lat.toFixed(2)}, {q.lng.toFixed(2)}]
                      </div>
                    </div>
                  </div>
                  <a
                    href={`https://earthquake.usgs.gov/earthquakes/eventpage/${q.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-mono text-cyan-400 hover:underline px-2 py-1 bg-cyan-950/40 rounded border border-cyan-900/40 whitespace-nowrap flex-shrink-0"
                  >
                    DETAIL
                  </a>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: NASA EONET Disaster Events */}
        <div className="rounded-xl bg-[#081226] border border-cyan-900/50 p-3 sm:p-4 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-cyan-900/40 pb-3 mb-3 gap-2">
            <div className="flex items-center gap-2">
              <CloudLightning className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <h3 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
                Bencana & Kebakaran Aktif (NASA EONET · {filteredDisasters.length} Event)
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-1 text-xs font-mono">
              <Filter className="w-3 h-3 text-gray-500 mr-0.5" />
              {['ALL', 'Wildfires', 'Storms', 'Volcanoes', 'Floods'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                    selectedCategory === cat
                      ? 'bg-orange-500 text-black font-bold'
                      : 'bg-black/40 text-gray-400 hover:text-gray-200 border border-cyan-950'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[420px] space-y-2 pr-1 overscroll-contain">
            {loading && disasters.length === 0 ? (
              <ListSkeleton rows={6} />
            ) : filteredDisasters.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs font-mono">
                Tidak ada data bencana untuk kategori ini.
              </div>
            ) : (
              filteredDisasters.map(d => (
                <div
                  key={d.id}
                  className="p-2.5 rounded-lg bg-black/30 border border-cyan-950 hover:border-cyan-800 transition flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-orange-950 text-orange-400 border border-orange-800/40">
                        {d.category.toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        {d.date ? new Date(d.date).toLocaleDateString('id-ID') : 'Aktif'}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-gray-200 mt-1 truncate">{d.title}</div>
                    {d.lat && d.lng && (
                      <div className="text-[10px] text-cyan-600 font-mono mt-0.5">
                        Koordinat: {d.lat.toFixed(2)}, {d.lng.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 bg-black/40 px-2 py-1 rounded flex-shrink-0">
                    NASA LIVE
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
