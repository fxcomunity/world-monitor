import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Cpu,
  Globe2,
  Newspaper,
  Radio,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { fetchTechnologyNews, TechnologyNewsItem } from '../lib/api';

const REFRESH_INTERVAL_MS = 60 * 1000;

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Waktu tidak tersedia';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

function getTopic(title: string): string {
  if (/\b(space|NASA|astronomy|satellite|planet|moon|rocket|mars)\b/i.test(title)) return 'Antariksa';
  if (/\b(AI|artificial intelligence|robot|machine learning)\b/i.test(title)) return 'Kecerdasan buatan';
  if (/\b(health|medical|gene|climate|environment|energy|physics|biology)\b/i.test(title)) return 'Sains';
  if (/\b(semiconductor|chip|software|computer|cyber|technology|tech)\b/i.test(title)) return 'Teknologi';
  return 'Riset & inovasi';
}

function NewsSkeleton() {
  return (
    <div aria-label="Memuat berita" aria-busy="true">
      <div className="mb-5 h-56 animate-pulse rounded-2xl border border-cyan-900/40 bg-gradient-to-br from-cyan-950/50 to-[#0b1428]" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="min-h-52 animate-pulse rounded-2xl border border-cyan-900/30 bg-[#0a1428] p-5"
          >
            <div className="mb-5 h-5 w-24 rounded bg-cyan-950/70" />
            <div className="mb-2 h-4 rounded bg-slate-800/80" />
            <div className="mb-2 h-4 w-4/5 rounded bg-slate-800/80" />
            <div className="mt-8 h-3 w-2/3 rounded bg-slate-800/60" />
          </div>
        ))}
      </div>
    </div>
  );
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

  const leadArticle = articles[0];
  const remainingArticles = articles.slice(1);

  return (
    <div className="min-h-full bg-[#060D1F] px-4 py-6 text-gray-200 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-7 sm:space-y-9">
        <section className="relative isolate overflow-hidden rounded-3xl border border-cyan-900/50 bg-gradient-to-br from-[#0d1d37] via-[#0a1429] to-[#101027] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.2)] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-36 left-1/3 -z-10 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-700/40 bg-cyan-950/50 px-3 py-1.5">
                <Radio className="h-3.5 w-3.5 animate-pulse text-cyan-300" />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200 sm:text-xs">
                  World Monitor · Intelligence desk
                </span>
              </div>

              <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                Technology &amp; Science
                <span className="mt-1 block bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                  Monitor
                </span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Ikuti perkembangan sains, antariksa, dan teknologi dari berbagai media global dalam satu feed.
                Berita diperbarui otomatis; waktu publikasi mengikuti masing-masing sumber.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
              <div className="flex items-center gap-2 text-xs text-slate-400 sm:text-sm">
                <span className={`h-2 w-2 rounded-full ${error ? 'bg-amber-400' : 'bg-emerald-400'} ${loading ? 'animate-pulse' : ''}`} />
                <span>
                  {lastUpdated
                    ? `Diperbarui ${formatDate(lastUpdated.toISOString())} WIB`
                    : loading ? 'Mengambil berita terbaru' : 'Menunggu pembaruan'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => void loadNews()}
                disabled={loading}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-700/60 bg-cyan-950/60 px-4 text-sm font-semibold text-cyan-100 transition hover:border-cyan-400/70 hover:bg-cyan-900/50 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Memuat...' : 'Perbarui berita'}
              </button>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-2 border-t border-white/10 pt-5">
            {[
              { label: 'Sains & riset', icon: Sparkles },
              { label: 'Antariksa', icon: Globe2 },
              { label: 'Teknologi', icon: Cpu },
            ].map(({ label, icon: Icon }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-slate-300"
              >
                <Icon className="h-3.5 w-3.5 text-cyan-300" />
                {label}
              </span>
            ))}
          </div>
        </section>

        <section aria-labelledby="latest-news-heading">
          <div className="mb-5 flex flex-col gap-3 border-b border-cyan-900/40 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">
                <Newspaper className="h-3.5 w-3.5" />
                Global news desk
              </div>
              <h2 id="latest-news-heading" className="text-xl font-bold text-white sm:text-2xl">
                Feed berita terbaru
              </h2>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-900/50 bg-[#0a1428] px-3 py-1.5 text-xs font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              {articles.length} artikel
              <span className="text-slate-600">·</span>
              <span className="text-cyan-300">Live feed</span>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-700/40 bg-amber-950/25 p-4 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between"
            >
              <span>
                {error}
                {articles.length > 0 && ' Menampilkan berita yang sudah dimuat sebelumnya.'}
              </span>
              <button
                type="button"
                onClick={() => void loadNews()}
                disabled={loading}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-700/50 px-3 text-xs font-semibold hover:bg-amber-900/40 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Coba lagi
              </button>
            </div>
          )}

          {loading && articles.length === 0 ? (
            <NewsSkeleton />
          ) : articles.length === 0 ? (
            <div className="rounded-2xl border border-cyan-900/40 bg-[#0a1428] px-5 py-14 text-center">
              <Newspaper className="mx-auto h-8 w-8 text-slate-600" />
              <p className="mt-3 text-sm text-slate-300">Belum ada berita untuk ditampilkan.</p>
              <p className="mt-1 text-xs text-slate-500">Coba muat ulang feed beberapa saat lagi.</p>
            </div>
          ) : (
            <>
              {leadArticle && (
                <a
                  href={leadArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative mb-6 grid overflow-hidden rounded-2xl border border-cyan-800/40 bg-gradient-to-br from-[#10233d] via-[#0c192e] to-[#11162c] p-5 transition hover:border-cyan-500/60 hover:shadow-[0_16px_50px_rgba(8,145,178,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060D1F] sm:p-7 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center lg:gap-8 lg:p-8"
                >
                  <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full border border-cyan-500/10 sm:right-8 sm:top-1/2 sm:-translate-y-1/2" />
                  <div className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full border border-cyan-500/10 sm:right-16 sm:top-1/2 sm:-translate-y-1/2" />

                  <div className="relative">
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-cyan-400/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-200">
                        Sorotan terbaru
                      </span>
                      <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-slate-300">
                        {getTopic(leadArticle.title)}
                      </span>
                    </div>
                    <h3 className="max-w-4xl text-xl font-bold leading-snug text-white transition group-hover:text-cyan-100 sm:text-2xl lg:text-3xl">
                      {leadArticle.title}
                    </h3>
                    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                      <span className="font-semibold text-slate-200">{leadArticle.source}</span>
                      {leadArticle.country && <span>{leadArticle.country}</span>}
                      <time dateTime={leadArticle.publishedAt}>{formatDate(leadArticle.publishedAt)} WIB</time>
                    </div>
                  </div>

                  <div className="relative mt-6 hidden h-36 items-center justify-center lg:mt-0 lg:flex">
                    <div className="absolute h-32 w-32 rounded-full bg-cyan-400/10 blur-2xl" />
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-cyan-300/20 bg-cyan-950/60 shadow-[0_0_50px_rgba(34,211,238,0.12)]">
                      <Cpu className="h-11 w-11 text-cyan-300" strokeWidth={1.3} />
                    </div>
                    <ArrowUpRight className="absolute right-2 top-2 h-5 w-5 text-cyan-300/70 transition group-hover:-translate-y-1 group-hover:translate-x-1" />
                  </div>
                  <span className="sr-only">Buka artikel di tab baru</span>
                </a>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                {remainingArticles.map((article, index) => (
                  <a
                    key={article.id}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-52 flex-col rounded-2xl border border-cyan-900/50 bg-gradient-to-b from-[#0c172d] to-[#091225] p-5 transition hover:-translate-y-0.5 hover:border-cyan-700/70 hover:from-[#0e1b33] hover:to-[#0a162b] hover:shadow-lg hover:shadow-cyan-950/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060D1F] sm:p-6"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="inline-flex max-w-[75%] items-center gap-1.5 truncate rounded-full border border-cyan-900/50 bg-cyan-950/40 px-2.5 py-1 text-[10px] font-semibold text-cyan-200">
                        <Sparkles className="h-3 w-3 shrink-0" />
                        {getTopic(article.title)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-600">
                        {String(index + 2).padStart(2, '0')}
                        <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-cyan-300" />
                      </span>
                    </div>

                    <h3 className="line-clamp-3 text-[15px] font-semibold leading-6 text-slate-100 transition group-hover:text-cyan-200 sm:text-base sm:leading-7">
                      {article.title}
                    </h3>

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-white/5 pt-4 text-[10px] text-slate-500 sm:text-xs">
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-400">{article.source}</span>
                      <time className="shrink-0 tabular-nums" dateTime={article.publishedAt}>
                        {formatDate(article.publishedAt)} WIB
                      </time>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
