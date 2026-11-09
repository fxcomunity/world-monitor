import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  HelpCircle,
  Shield,
  GitPullRequest,
  Globe,
  ExternalLink,
  X,
  Heart,
  Github,
  CheckCircle2,
  ChevronDown,
  Copy,
  Check,
  Search,
  MessageCircle,
  type LucideIcon,
} from 'lucide-react';

type ModalTab = 'FAQ' | 'POLICY' | 'CONTRIBUTE';

const REPO_URL = 'https://github.com/fxcomunity/world-monitor';
const VERSION = import.meta.env.VITE_APP_VERSION ?? '2.0';

const TABS: {
  id: ModalTab;
  hash: string;
  icon: LucideIcon;
  iconColor: string;
  tabLabel: string;
  title: string;
  active: string;
}[] = [
  {
    id: 'FAQ',
    hash: '#faq',
    icon: HelpCircle,
    iconColor: 'text-cyan-400',
    tabLabel: 'Pertanyaan (FAQ)',
    title: 'FAQ — Pertanyaan yang Sering Diajukan',
    active: 'border-cyan-400 text-cyan-300',
  },
  {
    id: 'POLICY',
    hash: '#policy',
    icon: Shield,
    iconColor: 'text-emerald-400',
    tabLabel: 'Kebijakan & Ketentuan',
    title: 'Kebijakan Privasi & Ketentuan Layanan',
    active: 'border-emerald-400 text-emerald-300',
  },
  {
    id: 'CONTRIBUTE',
    hash: '#contribute',
    icon: GitPullRequest,
    iconColor: 'text-amber-400',
    tabLabel: 'Cara Berkontribusi',
    title: 'Panduan Kontribusi Open Source',
    active: 'border-amber-400 text-amber-300',
  },
];

const FAQS = [
  {
    q: 'Apa itu World Monitor?',
    a: 'World Monitor adalah platform situational awareness intelijen global real-time yang memvisualisasikan data bencana NASA EONET, gempa bumi USGS, pergerakan udara ADS-B, kurs mata uang dunia, kualitas udara atmosfer Open-Meteo, radar Doppler Windy, serta analitik AI.',
  },
  {
    q: 'Dari mana sumber data platform diperoleh?',
    a: 'Seluruh informasi berasal dari sumber data terbuka (open data) institusi resmi internasional seperti NASA, USGS Seismology, World Bank Open Data, OpenSky Network, Alpha Vantage, dan PBB OCHA ReliefWeb.',
  },
  {
    q: 'Bagaimana cara kerja identitas Anonim (1 HP = 1 ID)?',
    a: 'Sistem menggunakan teknik device hardware fingerprinting yang konsisten di semua browser pada perangkat yang sama (Chrome, Edge, Firefox, Brave). Tidak ada nama atau nomor telepon pribadi yang diminta. Setiap perangkat mendapatkan nomor identitas tetap seperti Anonim100, Anonim1212 untuk memberikan ulasan dan rating.',
  },
  {
    q: 'Bagaimana arsitektur AI Multi-Provider berjalan?',
    a: 'Kami mengadopsi failover otomatis: OpenRouter (Primary #1) sebagai gateway utama tercepat, didukung backup berturut-turut oleh Google Gemini (#2), DeepSeek (#3), OpenAI (#4), Groq (#5), dan Mistral (#6). Jika satu AI mengalami kendala atau kehabisan kuota, sistem langsung berpindah ke cadangan.',
  },
  {
    q: 'Apakah World Monitor menyimpan informasi lokasi pribadi saya?',
    a: 'Tidak. Kami tidak melacak koordinat GPS pribadi pengguna. Peta 3D Globe hanya memetakan insiden anomali alam, seismik, dan data publik.',
  },
];

const GIT_STEPS: { text: string; cmd?: string }[] = [
  { text: 'Fork repositori ke akun GitHub Anda sendiri.' },
  {
    text: 'Clone hasil fork:',
    cmd: 'git clone https://github.com/your-username/world-monitor.git',
  },
  { text: 'Buat branch baru:', cmd: 'git checkout -b feature/nama-fitur' },
  { text: 'Install dependencies di folder frontend, lalu jalankan:', cmd: 'npm run dev' },
];

const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

const focusRing =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400';

const ANIM_CSS = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes wm-fade { from { opacity: 0 } to { opacity: 1 } }
  @keyframes wm-rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
  @keyframes wm-contact-in { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
  .wm-fade { animation: wm-fade .18s ease-out }
  .wm-rise { animation: wm-rise .22s cubic-bezier(.2,.8,.2,1) }
  .wm-contact-in { animation: wm-contact-in .35s ease-out both }
  .wm-contact-delay { animation-delay: .08s }
}`;

const tabFromHash = (): ModalTab | null =>
  typeof window === 'undefined'
    ? null
    : TABS.find((t) => t.hash === window.location.hash.toLowerCase())?.id ?? null;

/* ─── Tombol copy command ─── */
function CopyCmd({ cmd }: { cmd: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard diblok */
    }
  };

  return (
    <div className="mt-1.5 flex items-stretch rounded-lg overflow-hidden border border-cyan-950 bg-black/60">
      <code className="flex-1 px-2.5 py-1.5 text-cyan-300 overflow-x-auto whitespace-nowrap">
        {cmd}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Tersalin' : `Salin perintah: ${cmd}`}
        className={`px-2.5 border-l border-cyan-950 text-gray-400 hover:text-white hover:bg-white/10 transition ${focusRing}`}
      >
        {copied ? (
          <Check className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
}

export default function Footer() {
  // Init dari hash biar link /#faq langsung buka modal
  const [activeModal, setActiveModal] = useState<ModalTab | null>(tabFromHash);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [query, setQuery] = useState('');

  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const uid = useId();
  const titleId = `${uid}-title`;

  const activeTab = TABS.find((t) => t.id === activeModal);

  const openModal = (tab: ModalTab) => {
    if (!activeModal) lastFocused.current = document.activeElement as HTMLElement;
    setActiveModal(tab);
  };

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setQuery('');
    lastFocused.current?.focus();
  }, []);

  // Sinkron URL hash <-> modal
  useEffect(() => {
    const onHash = () => setActiveModal(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const { pathname, search, hash } = window.location;
    if (activeTab) {
      if (hash.toLowerCase() !== activeTab.hash) {
        window.history.replaceState(null, '', `${pathname}${search}${activeTab.hash}`);
      }
    } else if (TABS.some((t) => t.hash === hash.toLowerCase())) {
      window.history.replaceState(null, '', `${pathname}${search}`);
    }
  }, [activeTab]);

  // ESC, focus trap, scroll lock
  useEffect(() => {
    if (!activeModal) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const items = dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [activeModal, closeModal]);

  const isOpen = activeModal !== null;
  useEffect(() => {
    if (isOpen) dialogRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [activeModal]);

  // Arrow-key navigasi antar tab (pola ARIA tabs)
  const onTabKey = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === activeModal);
    let next = -1;
    if (e.key === 'ArrowRight') next = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setActiveModal(TABS[next].id);
    document.getElementById(`${uid}-tab-${TABS[next].id}`)?.focus();
  };

  const filteredFaqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.map((f, idx) => ({ ...f, idx })).filter(
      (f) => !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q),
    );
  }, [query]);

  const searching = query.trim().length > 0;

  const modal =
    activeModal && activeTab ? (
      <div
        className="wm-fade fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="wm-rise w-full max-w-2xl bg-[#081226] border border-cyan-500/40 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] outline-none"
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-cyan-900/50 bg-[#040916] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <activeTab.icon className={`w-5 h-5 shrink-0 ${activeTab.iconColor}`} />
              <h2 id={titleId} className="font-bold text-white text-sm truncate">
                {activeTab.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={closeModal}
              aria-label="Tutup"
              className={`p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition ${focusRing}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Info World Monitor"
            onKeyDown={onTabKey}
            className="flex border-b border-cyan-950 bg-[#050D1F] px-4 pt-2 gap-2 text-xs font-mono overflow-x-auto"
          >
            {TABS.map((t) => {
              const selected = activeModal === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`${uid}-tab-${t.id}`}
                  aria-selected={selected}
                  aria-controls={`${uid}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveModal(t.id)}
                  className={`px-3 py-2 border-b-2 font-bold transition whitespace-nowrap ${focusRing} ${
                    selected ? t.active : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t.tabLabel}
                </button>
              );
            })}
          </div>

          {/* Body */}
          <div
            ref={bodyRef}
            role="tabpanel"
            id={`${uid}-panel`}
            aria-labelledby={`${uid}-tab-${activeModal}`}
            className="p-5 overflow-y-auto space-y-4 text-xs font-mono text-gray-300 leading-relaxed"
          >
            {/* FAQ */}
            {activeModal === 'FAQ' && (
              <div className="space-y-2.5">
                <label className="relative block">
                  <span className="sr-only">Cari pertanyaan</span>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Cari pertanyaan..."
                    className={`w-full pl-9 pr-3 py-2 rounded-lg bg-black/50 border border-cyan-950 focus:border-cyan-500/60 placeholder:text-gray-600 text-gray-200 outline-none ${focusRing}`}
                  />
                </label>

                {filteredFaqs.length === 0 && (
                  <div className="p-4 rounded-xl bg-black/40 border border-cyan-950 text-gray-500 text-center">
                    Tidak ada hasil untuk "{query.trim()}". Coba kata kunci lain, atau{' '}
                    <a
                      href={`${REPO_URL}/issues`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-300 underline"
                    >
                      tanya lewat GitHub Issues
                    </a>
                    .
                  </div>
                )}

                {filteredFaqs.map((item) => {
                  const open = searching || openFaq === item.idx;
                  return (
                    <div
                      key={item.q}
                      className={`rounded-xl bg-black/40 border transition-colors ${
                        open ? 'border-cyan-700/60' : 'border-cyan-950'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => !searching && setOpenFaq(open ? null : item.idx)}
                        aria-expanded={open}
                        aria-controls={`${uid}-faq-${item.idx}`}
                        className={`w-full flex items-start gap-2 p-3.5 text-left font-bold text-cyan-300 rounded-xl ${focusRing}`}
                      >
                        <span className="text-cyan-500">Q{item.idx + 1}.</span>
                        <span className="flex-1">{item.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 shrink-0 mt-0.5 text-cyan-500 transition-transform ${
                            open ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {open && (
                        <div
                          id={`${uid}-faq-${item.idx}`}
                          className="px-3.5 pb-3.5 pl-[2.1rem] text-gray-400 text-[11px]"
                        >
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* POLICY */}
            {activeModal === 'POLICY' && (
              <div className="space-y-4 text-[11px]">
                <div className="p-3.5 rounded-xl bg-black/40 border border-emerald-950/80 space-y-2">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    1. Kebijakan Privasi (Zero Personal Tracking)
                  </div>
                  <p className="text-gray-400">
                    Platform World Monitor berkomitmen penuh pada privasi pengguna. Kami tidak menjual data pengguna, tidak memasang tracker iklan invasif, dan tidak mengumpulkan informasi identitas pribadi (seperti KTP, nama lengkap, atau alamat rumah). Identitas perangkat hanya dihitung secara matematis untuk menjamin keaslian rating suka 1-5 bintang.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-cyan-950 space-y-2">
                  <div className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    2. Penggunaan Data Terbuka & Lisensi MIT
                  </div>
                  <p className="text-gray-400">
                    Perangkat lunak ini dirilis di bawah Lisensi MIT multibahasa (11 bahasa). Anda berhak menggunakan, memodifikasi, dan mempelajari kode sumber secara gratis sesuai syarat dan ketentuan lisensi yang disertakan dalam repositori.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-amber-950/80 space-y-2">
                  <div className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    3. Penafian Tanggung Jawab (Disclaimer Situasional)
                  </div>
                  <p className="text-gray-400">
                    Visualisasi peta dan peringatan bencana disediakan untuk tujuan kesadaran situasional (situational awareness) dan penelitian. Dalam kondisi darurat bencana alam riil, selalu ikuti arahan dan instruksi resmi dari otoritas pertahanan sipil setempat seperti BNPB, BMKG, USGS, atau badan penanggulangan bencana nasional.
                  </p>
                </div>
              </div>
            )}

            {/* CONTRIBUTE */}
            {activeModal === 'CONTRIBUTE' && (
              <div className="space-y-4 text-[11px]">
                <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-black/50 border border-cyan-800/60 space-y-2">
                  <div className="font-bold text-white text-xs flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-400 fill-red-400" />
                    Selamat Datang Kontributor Open Source!
                  </div>
                  <p className="text-gray-300">
                    World Monitor dibangun secara kolaboratif oleh komunitas pengembang global. Kontribusi dalam bentuk penambahan sensor data baru, perbaikan bug, terjemahan bahasa, maupun optimalisasi grafis 3D Globe sangat kami hargai.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-cyan-400 uppercase text-xs">
                    Langkah Berkontribusi via GitHub:
                  </div>
                  <ol className="list-decimal pl-5 space-y-2.5 text-gray-400 marker:text-cyan-600">
                    <li>
                      Kunjungi repositori resmi:{' '}
                      <a
                        href={REPO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-300 underline font-bold"
                      >
                        github.com/fxcomunity/world-monitor
                      </a>
                    </li>
                    {GIT_STEPS.map((s) => (
                      <li key={s.text}>
                        {s.text}
                        {s.cmd && <CopyCmd cmd={s.cmd} />}
                      </li>
                    ))}
                    <li>
                      Commit dengan pesan rapi, lalu buka Pull Request (PR) ke branch{' '}
                      <code className="text-emerald-400 font-bold">main</code>.
                    </li>
                  </ol>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-cyan-950 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white">Butuh Bantuan atau Mau Lapor Bug?</div>
                    <div className="text-[10px] text-gray-500">
                      Buat issue baru di GitHub Issues kami
                    </div>
                  </div>
                  <a
                    href={`${REPO_URL}/issues`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`shrink-0 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs transition ${focusRing}`}
                  >
                    Buka Issue
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3 border-t border-cyan-900/40 bg-[#040916] flex items-center justify-between text-[11px] text-gray-500">
            <span>World Monitor Community · Jack AI</span>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-gray-600">Esc untuk tutup</span>
              <button
                type="button"
                onClick={closeModal}
                className={`px-3 py-1 rounded bg-black/60 border border-gray-700 text-gray-300 hover:text-white transition ${focusRing}`}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    ) : null;

  return (
    <>
      <style>{ANIM_CSS}</style>

      <footer className="relative z-20 mt-auto w-full border-t border-cyan-900/50 bg-gradient-to-b from-[#081226] to-[#030712] px-4 py-8 text-gray-400 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <section
            aria-labelledby="wm-contact-title"
            className="grid w-full gap-5 rounded-2xl border border-cyan-900/50 bg-[#06101f]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.2)] sm:p-5 lg:grid-cols-[minmax(190px,0.7fr)_2fr] lg:items-center"
          >
            <div>
              <h2 id="wm-contact-title" className="text-xs font-bold tracking-[0.18em] text-cyan-300 uppercase">Kontak Person</h2>
              <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-gray-400">
                Butuh bantuan atau ingin memberi masukan? Hubungi tim World Monitor.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { name: 'Mohammad Varrel Khairul Ilham', role: 'Agent', phone: '+62 858-8235-9569', href: 'https://wa.me/6285882359569' },
                { name: 'Muhammad Rizki Sumantri', role: 'Developer', phone: '+62 895-4041-47521', href: 'https://wa.me/62895404147521' },
              ].map((contact, index) => (
                <a
                  key={contact.name}
                  href={contact.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Hubungi ${contact.name} melalui WhatsApp`}
                  className={`wm-contact-in ${index ? 'wm-contact-delay' : ''} group flex min-w-0 items-center gap-3 rounded-xl border border-cyan-900/50 bg-[#081226] p-3 transition-colors hover:border-cyan-500/60 hover:bg-cyan-950/30`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-800/60 bg-emerald-950/50 text-emerald-300 group-hover:text-white">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-gray-100">{contact.name}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-gray-400">{contact.role} · WhatsApp</span>
                    <span className="mt-0.5 block text-[10px] tabular-nums text-gray-500">{contact.phone}</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-cyan-500/70 group-hover:text-cyan-300" aria-hidden="true" />
                </a>
              ))}
            </div>
          </section>

          <div className="flex w-full flex-col items-center justify-between gap-5 border-t border-cyan-900/30 pt-5 md:flex-row">
          {/* Logo & Copyright */}
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/logo.png"
              alt="World Monitor"
              className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]"
            />
            <div>
              <div className="text-white font-bold tracking-wider flex items-center gap-2">
                <span>WORLD MONITOR</span>
                <span className="text-[10px] text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-1.5 py-0.5 rounded font-mono">
                  v{VERSION}
                </span>
              </div>
              <div className="text-[11px] leading-relaxed text-gray-500">
                © {new Date().getFullYear()} World Monitor Platform · Lisensi Terbuka MIT (11 Bahasa)
              </div>
            </div>
          </div>

          {/* Navigasi Footer */}
          <nav
            aria-label="Footer"
            className="flex flex-wrap items-center justify-center gap-2 text-xs sm:gap-3"
          >
            <button
              type="button"
              onClick={() => openModal('FAQ')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-cyan-950/60 border border-cyan-900/40 hover:border-cyan-500/60 text-gray-300 hover:text-cyan-300 transition cursor-pointer ${focusRing}`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>FAQ</span>
            </button>

            <button
              type="button"
              onClick={() => openModal('POLICY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-cyan-950/60 border border-cyan-900/40 hover:border-cyan-500/60 text-gray-300 hover:text-cyan-300 transition cursor-pointer ${focusRing}`}
            >
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kebijakan & Privasi</span>
            </button>

            <button
              type="button"
              onClick={() => openModal('CONTRIBUTE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-700/60 hover:border-cyan-400 text-cyan-300 hover:text-white transition cursor-pointer font-bold shadow-sm ${focusRing}`}
            >
              <GitPullRequest className="w-3.5 h-3.5 text-amber-400" />
              <span>Kontribusi</span>
            </button>

            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-black/80 border border-gray-800 hover:border-gray-600 text-gray-400 hover:text-white transition ${focusRing}`}
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 text-gray-600" aria-hidden="true" />
            </a>
          </nav>

          {/* Sistem Status */}
          <div
            role="status"
            className="flex items-center gap-2 rounded-full border border-emerald-900/50 bg-emerald-950/30 px-3 py-2 text-[10px] font-mono text-emerald-300"
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 rounded-full bg-emerald-400 motion-safe:animate-pulse shadow-[0_0_6px_#10b981]"
            />
            <span>SISTEM ONLINE</span>
          </div>
          </div>
        </div>
      </footer>

      {/* Portal biar modal nggak ketimpa stacking context parent */}
      {modal && createPortal(modal, document.body)}
    </>
  );
}