import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AdminProfileButton from './components/AdminProfileButton';
import RatingFeedbackModal, { FeedbackHeaderWidget } from './components/RatingFeedbackModal';
import WebsiteChatWidget from './components/WebsiteChatWidget';
import Footer from './components/Footer';
import { isAdminAuthenticated } from './lib/auth';
import { Menu } from 'lucide-react';

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleOpen = () => setRatingModalOpen(true);
    window.addEventListener('open-rating-modal', handleOpen);
    return () => window.removeEventListener('open-rating-modal', handleOpen);
  }, []);

  useEffect(() => {
    const checkMaintenance = async () => {
      const isAdmin = isAdminAuthenticated();
      if (isAdmin || location.pathname.startsWith('/auth/admin') || location.pathname === '/maintenance') {
        return;
      }

      // 1. Cek local storage dulu
      let isMaint = localStorage.getItem('wm_maintenance_mode') === 'true';

      // 2. Cek status live dari server (agar browser lain seperti Brave / HP langsung terpengaruh)
      try {
        const res = await fetch('/api/maintenance', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.active === 'boolean') {
            isMaint = data.active;
            localStorage.setItem('wm_maintenance_mode', String(data.active));
            if (data.title) localStorage.setItem('wm_maintenance_title', data.title);
            if (data.message) localStorage.setItem('wm_maintenance_msg', data.message);
            if (data.endTime) localStorage.setItem('wm_maintenance_end', String(data.endTime));
          }
        }
      } catch {
        // network fallback
      }

      // Jika maintenance aktif, langsung tendang ke halaman /maintenance
      if (isMaint) {
        navigate('/maintenance', { replace: true });
      }
    };

    checkMaintenance();
  }, [location.pathname, navigate]);

  return (
    <div className="flex min-h-[100dvh] h-[100dvh] w-full bg-[#060D1F] text-white overflow-hidden">
      {/* Sidebar (Desktop Collapsible & Mobile Slide-over Drawer) */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Top Header Bar — Menampilkan status & Tombol Profile Admin di Pojok Kanan Atas */}
        <header className="flex items-center justify-between px-4 py-2.5 bg-[#060D1F] border-b border-cyan-900/50 z-30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 hover:text-white transition"
              aria-label="Buka Menu Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <img
              src="/logo.png"
              alt="World Monitor"
              className="md:hidden h-7 w-auto object-contain"
            />
            <div className="hidden md:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] font-mono text-gray-400 tracking-wider">WORLD_MONITOR_OS // SYSTEM_ACTIVE</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Fitur Suka & Rating Bintang 1-5 di Header Atas */}
            <FeedbackHeaderWidget onClick={() => setRatingModalOpen(true)} />

            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/40 border border-cyan-900/40 text-[10px] font-mono text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ONLINE</span>
            </div>
            {/* Tombol Profil Admin di Sudut Kanan Atas */}
            <AdminProfileButton />
          </div>
        </header>
        
        {/* Banner Notifikasi Mode Pemeliharaan (Jika diaktifkan oleh Admin) */}
        {localStorage.getItem('wm_maintenance_mode') === 'true' && (
          <div className="bg-red-950/90 border-b border-red-600/70 px-4 py-2 flex flex-wrap items-center justify-between text-xs font-mono text-red-200 z-20 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span className="font-bold text-red-300 uppercase">MODE PEMELIHARAAN AKTIF:</span>
              <span className="text-gray-200">{localStorage.getItem('wm_maintenance_msg') || 'Sistem sedang dalam proses pemeliharaan berkala.'}</span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/maintenance"
                className="text-[11px] underline text-cyan-300 hover:text-white"
                target="_blank"
                rel="noreferrer"
              >
                Lihat Halaman Countdown Publik ↗
              </a>
              <span className="text-[10px] text-red-400 bg-black/60 px-2 py-0.5 rounded border border-red-900 font-bold">
                ADMIN OVERRIDE
              </span>
            </div>
          </div>
        )}

        {/* Scrollable Main Content Container — SEMUA HALAMAN BISA DI-SCROLL LANCAR */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 scroll-smooth w-full overscroll-contain flex flex-col justify-between">
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
          {location.pathname !== '/map' && location.pathname !== '/' && <Footer />}
        </main>

        {/* Modal Suka & Rating 1-5 Bintang & Komentar */}
        <RatingFeedbackModal
          isOpen={ratingModalOpen}
          onClose={() => setRatingModalOpen(false)}
        />

        {location.pathname !== '/maintenance' && <WebsiteChatWidget />}
      </div>
    </div>
  );
}
