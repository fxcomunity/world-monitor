import React, { useCallback, useEffect, useState } from 'react';
import { Cpu, ExternalLink, Radio, RefreshCw } from 'lucide-react';
import { fetchTechnologyNews, TechnologyNewsItem } from '../lib/api';

const REFRESH_INTERVAL_MS = 60 * 1000;

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}

export default function TechMonitor() {
  const [articles, setArticles] = useState<TechnologyNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const latestArticles = await fetchTechnologyNews();
      setArticles(latestArticles);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load technology and science news:', err);
      setError(err instanceof Error ? err.message : 'Feed berita gagal dimuat.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNews();
    const interval = window.setInterval(() => void loadNews(), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [loadNews]);

  return (
    <div className="min-h-screen bg-[#060D1F] text-gray-200 p-4 lg:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-cyan-900/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span className="text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase">
              LIVE SCIENCE & TECHNOLOGY NEWS
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2 mt-1">
            <Cpu className="w-6 h-6 text-cyan-400" />
            Technology & Science Monitor
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Berita terbaru dari media global, diperbarui otomatis setiap menit. Waktu publikasi tetap mengikuti masing-masing sumber.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[10px] text-gray-500 font-mono">
            {lastUpdated ? `Diperbarui ${formatDate(lastUpdated.toISOString())} WIB` : 'Menunggu data'}
          </span>
          <button
            onClick={() => void loadNews()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/40 disabled:opacity-50 text-cyan-300 text-xs font-mono transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <section className="rounded-xl bg-[#081226] border border-cyan-900/50 p-4">
        <div className="flex items-center justify-between border-b border-cyan-900/40 pb-3 mb-4">
          <h2 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
            Feed Berita Terbaru
          </h2>
          <span className="text-[10px] font-mono text-cyan-400">
            {articles.length} ARTIKEL · LIVE
          </span>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-300">
            {error} Periksa koneksi lalu coba refresh.
          </div>
        )}

        {loading && articles.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-500 font-mono">Memuat berita terbaru...</p>
        ) : articles.length === 0 ? (
          <p className="py-8 text-center text-xs text-gray-500 font-mono">
            Belum ada berita untuk ditampilkan.
          </p>
        ) : (
          <div className="divide-y divide-cyan-950/60">
            {articles.map(article => (
              <article key={article.id} className="py-4 first:pt-1 last:pb-1">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start justify-between gap-4"
                >
                  <h3 className="text-sm font-semibold text-gray-100 group-hover:text-cyan-300 transition">
                    {article.title}
                  </h3>
                  <ExternalLink className="w-4 h-4 shrink-0 text-cyan-500/70 group-hover:text-cyan-300" />
                </a>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono text-gray-500">
                  <span>{article.source}</span>
                  {article.country && <span>{article.country}</span>}
                  <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)} WIB</time>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
