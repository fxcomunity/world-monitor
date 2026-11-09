import React, { useState, useEffect } from 'react';
import {
  Shield, Server, Lock, Cpu, Database, Terminal,
  HardDrive, Key, Power, User, Settings, Save,
  CheckCircle2, AlertCircle, Wrench, Clock, Globe,
  Eye, EyeOff, LayoutTemplate, Palette, Star, MessageSquare,
  ThumbsUp, Smartphone, Monitor, RefreshCw
} from 'lucide-react';
import { isAdminAuthenticated, removeAdminCookie } from '../lib/auth';

interface MaintenanceSettingsResponse {
  active: boolean;
  title: string;
  message: string;
  endTime: number;
  durationHours: number;
  contactEmail: string;
  whatsappNumber: string;
  logoType: string;
  backgroundStyle: string;
  glowColor: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'MAINTENANCE' | 'SECURITY' | 'PROFILE' | 'API_KEYS' | 'FEEDBACK'>('OVERVIEW');

  // Profile Settings State (Bisa Ganti Nama, Email, Password)
  const [adminName, setAdminName] = useState(() => localStorage.getItem('wm_admin_name') || 'Admin Jack');
  const [adminEmail, setAdminEmail] = useState(() => localStorage.getItem('wm_admin_email') || 'admin@jack-ai.my.id');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Maintenance Page Customization State (Bisa Edit Tampilan Maintenance)
  const [maintenanceMode, setMaintenanceMode] = useState(() => localStorage.getItem('wm_maintenance_mode') === 'true');
  const [maintenanceTitle, setMaintenanceTitle] = useState(() => localStorage.getItem('wm_maintenance_title') || 'Lagi Maintenance');
  const [maintenanceMessage, setMaintenanceMessage] = useState(() => localStorage.getItem('wm_maintenance_msg') || 'Kami lagi upgrade sistem telemetri & keamanan biar makin kenceng dan stabil. Bentar lagi balik kok!');
  const [maintenanceDurationHours, setMaintenanceDurationHours] = useState(
    () => localStorage.getItem('wm_maintenance_duration_hours') || '2',
  );
  const [maintenanceTheme, setMaintenanceTheme] = useState(() => localStorage.getItem('wm_maintenance_theme') || 'CYBER_DARK');
  const [maintenanceContact, setMaintenanceContact] = useState(() => localStorage.getItem('wm_maintenance_contact') || 'admin@jack-ai.my.id');
  const [maintenanceWhatsapp, setMaintenanceWhatsapp] = useState(() => localStorage.getItem('wm_maintenance_wa') || '+62 812-3456-7890');
  const [maintenanceLogoType, setMaintenanceLogoType] = useState(() => localStorage.getItem('wm_maintenance_logo') || 'SHIELD');
  const [maintenanceBgColor, setMaintenanceBgColor] = useState(() => localStorage.getItem('wm_maintenance_bg') || '#030816');
  const [maintenanceGlowColor, setMaintenanceGlowColor] = useState(() => localStorage.getItem('wm_maintenance_glow') || '#00e5ff');
  const [maintenanceSaveMsg, setMaintenanceSaveMsg] = useState('');
  const [maintenanceSaveError, setMaintenanceSaveError] = useState('');
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  const [ddosThreshold, setDdosThreshold] = useState('100 req/min');
  const [logs, setLogs] = useState([
    { id: 1, time: '14:28:11', ip: '114.124.20.15', event: 'ADMIN_SESSION_ACTIVE', status: 'SUCCESS' },
    { id: 2, time: '14:15:30', ip: '185.220.101.5', event: 'BLOCKED_SQL_INJECTION', status: 'BLOCKED' },
    { id: 3, time: '13:50:22', ip: '45.154.255.89', event: 'BLOCKED_XSS_PAYLOAD', status: 'BLOCKED' },
    { id: 4, time: '13:12:05', ip: '103.111.20.4', event: 'API_DISASTER_SYNC', status: 'SUCCESS' },
  ]);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      window.location.href = '/auth/admin';
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadMaintenanceSettings = async () => {
      try {
        const response = await fetch('/api/maintenance', { cache: 'no-store' });
        const data = await response.json() as {
          active?: boolean;
          title?: string;
          message?: string;
          endTime?: number;
          durationHours?: number;
          contactEmail?: string;
          whatsappNumber?: string;
          logoType?: string;
          backgroundStyle?: string;
          glowColor?: string;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error || 'Gagal memuat pengaturan maintenance dari database.');
        if (cancelled) return;

        setMaintenanceMode(data.active === true);
        if (data.title !== undefined) setMaintenanceTitle(data.title);
        if (data.message !== undefined) setMaintenanceMessage(data.message);
        if (data.durationHours !== undefined) setMaintenanceDurationHours(String(data.durationHours));
        if (data.contactEmail !== undefined) setMaintenanceContact(data.contactEmail);
        if (data.whatsappNumber !== undefined) setMaintenanceWhatsapp(data.whatsappNumber);
        if (data.logoType !== undefined) setMaintenanceLogoType(data.logoType);
        if (data.backgroundStyle !== undefined) setMaintenanceBgColor(data.backgroundStyle);
        if (data.glowColor !== undefined) setMaintenanceGlowColor(data.glowColor);

        localStorage.setItem('wm_maintenance_mode', String(data.active === true));
        if (data.title !== undefined) localStorage.setItem('wm_maintenance_title', data.title);
        if (data.message !== undefined) localStorage.setItem('wm_maintenance_msg', data.message);
        if (data.endTime !== undefined) localStorage.setItem('wm_maintenance_end', String(data.endTime));
        if (data.durationHours !== undefined) {
          localStorage.setItem('wm_maintenance_duration_hours', String(data.durationHours));
        }
        if (data.contactEmail !== undefined) localStorage.setItem('wm_maintenance_contact', data.contactEmail);
        if (data.whatsappNumber !== undefined) localStorage.setItem('wm_maintenance_wa', data.whatsappNumber);
        if (data.logoType !== undefined) localStorage.setItem('wm_maintenance_logo', data.logoType);
        if (data.backgroundStyle !== undefined) localStorage.setItem('wm_maintenance_bg', data.backgroundStyle);
        if (data.glowColor !== undefined) localStorage.setItem('wm_maintenance_glow', data.glowColor);
      } catch (error) {
        if (!cancelled) {
          setMaintenanceSaveError(
            error instanceof Error ? error.message : 'Gagal memuat pengaturan maintenance.',
          );
        }
      }
    };

    loadMaintenanceSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  // Feedback State
  const [adminFeedbacks, setAdminFeedbacks] = useState<any[]>([]);
  const [feedbackStats, setFeedbackStats] = useState({ averageRating: 5.0, totalRatings: 0 });

  const loadAdminFeedbacks = async () => {
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) {
        const d = await res.json();
        setAdminFeedbacks(d.feedbacks || []);
        setFeedbackStats({
          averageRating: d.averageRating || 5.0,
          totalRatings: d.totalRatings || 0,
        });
      }
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadAdminFeedbacks();
  }, []);

  const handleLogout = () => {
    removeAdminCookie();
    window.location.href = '/auth/admin';
  };

  // Simpan Profil Admin
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    if (newPassword) {
      if (newPassword.length < 6) {
        setProfileErrorMsg('Password baru minimal 6 karakter.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setProfileErrorMsg('Konfirmasi password baru tidak cocok.');
        return;
      }
      localStorage.setItem('wm_admin_pass', newPassword);
    }

    localStorage.setItem('wm_admin_name', adminName);
    localStorage.setItem('wm_admin_email', adminEmail);
    localStorage.setItem('wm_admin_user', adminEmail);
    setProfileSuccessMsg('Profil dan kredensial admin berhasil diperbarui!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setProfileSuccessMsg(''), 4000);
  };

  // Toggle Maintenance & Simpan Kustomisasi Tampilan Maintenance
  const handleSaveMaintenanceSettings = async (modeToggle?: boolean) => {
    const nextMode = modeToggle !== undefined ? modeToggle : maintenanceMode;
    const durationHours = Number.parseFloat(maintenanceDurationHours);
    if (!Number.isFinite(durationHours) || durationHours <= 0 || durationHours > 720) {
      setMaintenanceSaveError('Durasi harus lebih dari 0 dan maksimal 720 jam.');
      return;
    }
    const targetEnd = Date.now() + durationHours * 60 * 60 * 1000;
    setMaintenanceSaving(true);
    setMaintenanceSaveMsg('');
    setMaintenanceSaveError('');

    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: nextMode,
          title: maintenanceTitle,
          message: maintenanceMessage,
          endTime: targetEnd,
          durationHours,
          contactEmail: maintenanceContact,
          whatsappNumber: maintenanceWhatsapp,
          logoType: maintenanceLogoType,
          backgroundStyle: maintenanceBgColor,
          glowColor: maintenanceGlowColor,
        }),
      });
      const result = await response.json() as {
        success?: boolean;
        status?: MaintenanceSettingsResponse;
        error?: string;
      };
      if (!response.ok || !result.success || !result.status) {
        throw new Error(result.error || 'Pengaturan maintenance gagal disimpan ke database.');
      }

      const saved = result.status;
      setMaintenanceMode(saved.active);
      setMaintenanceTitle(saved.title);
      setMaintenanceMessage(saved.message);
      setMaintenanceDurationHours(String(saved.durationHours));
      setMaintenanceContact(saved.contactEmail);
      setMaintenanceWhatsapp(saved.whatsappNumber);
      setMaintenanceLogoType(saved.logoType);
      setMaintenanceBgColor(saved.backgroundStyle);
      setMaintenanceGlowColor(saved.glowColor);
      localStorage.setItem('wm_maintenance_mode', String(saved.active));
      localStorage.setItem('wm_maintenance_title', saved.title);
      localStorage.setItem('wm_maintenance_msg', saved.message);
      localStorage.setItem('wm_maintenance_theme', maintenanceTheme);
      localStorage.setItem('wm_maintenance_contact', saved.contactEmail);
      localStorage.setItem('wm_maintenance_wa', saved.whatsappNumber);
      localStorage.setItem('wm_maintenance_logo', saved.logoType);
      localStorage.setItem('wm_maintenance_bg', saved.backgroundStyle);
      localStorage.setItem('wm_maintenance_glow', saved.glowColor);
      localStorage.setItem('wm_maintenance_end', String(saved.endTime));
      localStorage.setItem('wm_maintenance_duration_hours', String(saved.durationHours));
      setMaintenanceSaveMsg('Pengaturan maintenance berhasil disimpan ke database.');
      setTimeout(() => setMaintenanceSaveMsg(''), 4000);
    } catch (error) {
      setMaintenanceSaveError(
        error instanceof Error ? error.message : 'Pengaturan maintenance gagal disimpan.',
      );
    } finally {
      setMaintenanceSaving(false);
    }
  };

  const handleSimulateBlock = () => {
    const randomIP = `${Math.floor(Math.random() * 200) + 20}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    setLogs(prev => [
      {
        id: Date.now(),
        time: new Date().toLocaleTimeString('id-ID'),
        ip: randomIP,
        event: 'BLOCKED_SUSPICIOUS_PROBE',
        status: 'BLOCKED',
      },
      ...prev,
    ]);
  };

  return (
    <div className="min-h-screen w-full bg-[#030816] text-gray-200 font-mono flex flex-col">
      {/* ─── DEDICATED ADMIN TOPBAR (STANDALONE TANPA SIDEBAR MONITOR) ─── */}
      <header className="px-4 sm:px-6 py-2.5 bg-[#060D1F] border-b border-cyan-900/50 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img
            src="/admin-shield-logo.png"
            alt="Admin Security Shield"
            className="w-10 h-10 object-contain drop-shadow-[0_0_12px_rgba(0,229,255,0.6)]"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs font-bold tracking-widest text-white uppercase">PANEL ADMIN RESMI</span>
            </div>
            <div className="text-[10px] text-gray-400">World Monitor Control Center · v1.2</div>
          </div>
        </div>

        {/* Action Buttons: Kembali ke Web Utama & Logout */}
        <div className="flex items-center gap-2">
          <a
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 hover:text-white text-xs font-bold transition shadow-sm"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Web Utama (Monitoring)</span>
          </a>

          <a
            href="/dashboard"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/40 border border-cyan-900/40 text-gray-300 hover:text-white text-xs transition"
          >
            <span>Dashboard Pengguna</span>
          </a>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-800/60 text-red-300 hover:text-white text-xs font-bold transition"
          >
            <Power className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* ─── ADMIN BODY CONTENT (FULL WIDTH TANPA SIDEBAR CIUT) ─── */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Admin Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-900/40 pb-4">
          <div className="flex items-center gap-3">
            <img
              src="/admin-shield-logo.png"
              alt="Admin Shield"
              className="w-12 h-12 object-contain drop-shadow-[0_0_15px_rgba(0,229,255,0.7)] flex-shrink-0"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide">
                Admin Master Control Panel
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Admin: <span className="text-cyan-300 font-bold">{adminName}</span> ({adminEmail}) · Sesi Cookie: 7 Hari
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className={`px-2.5 py-1 rounded-full font-bold border flex items-center gap-1.5 ${
              maintenanceMode
                ? 'bg-red-950 text-red-300 border-red-800'
                : 'bg-emerald-950 text-emerald-300 border-emerald-800'
            }`}>
              <span className={`w-2 h-2 rounded-full ${maintenanceMode ? 'bg-red-500 animate-ping' : 'bg-emerald-400'}`} />
              {maintenanceMode ? 'MAINTENANCE AKTIF' : 'SYSTEM ONLINE'}
            </span>
          </div>
        </div>

        {/* ─── TAB NAVIGATION KHUSUS PANEL ADMIN ─── */}
        <div className="flex flex-wrap items-center gap-2 border-b border-cyan-900/40 pb-2">
          {[
            { id: 'OVERVIEW', label: 'Ringkasan Sistem', icon: Server },
            { id: 'MAINTENANCE', label: 'Pengaturan Maintenance & Edit Tampilan', icon: Wrench },
            { id: 'PROFILE', label: 'Profil & Ganti Password Admin', icon: User },
            { id: 'SECURITY', label: 'Keamanan & Proteksi Serangan', icon: Lock },
            { id: 'API_KEYS', label: 'Status API Gateway', icon: Key },
            { id: 'FEEDBACK', label: 'Ulasan & Rating Pengunjung', icon: Star },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                  activeTab === tab.id
                    ? 'bg-cyan-600 text-black shadow-md shadow-cyan-950'
                    : 'bg-[#081226] text-gray-400 hover:text-white border border-cyan-900/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: OVERVIEW ─── */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-xl bg-[#081226] border border-cyan-900/40 space-y-1">
                <div className="text-[11px] text-gray-400 flex items-center justify-between">
                  <span>EDGE WORKER</span>
                  <Server className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-lg sm:text-xl font-bold text-emerald-400">OPERATIONAL</div>
                <div className="text-[10px] text-gray-500">Cloudflare Edge Engine</div>
              </div>

              <div className="p-4 rounded-xl bg-[#081226] border border-cyan-900/40 space-y-1">
                <div className="text-[11px] text-gray-400 flex items-center justify-between">
                  <span>DDoS FIREWALL</span>
                  <Lock className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-lg sm:text-xl font-bold text-cyan-400">ACTIVE L3/L4/L7</div>
                <div className="text-[10px] text-gray-500">WAF + XSS Sanitizer</div>
              </div>

              <div className="p-4 rounded-xl bg-[#081226] border border-cyan-900/40 space-y-1">
                <div className="text-[11px] text-gray-400 flex items-center justify-between">
                  <span>STATUS MAINTENANCE</span>
                  <Wrench className="w-4 h-4 text-amber-400" />
                </div>
                <div className={`text-lg sm:text-xl font-bold ${maintenanceMode ? 'text-red-400' : 'text-emerald-400'}`}>
                  {maintenanceMode ? 'SEDANG AKTIF' : 'NORMAL (OFF)'}
                </div>
                <div className="text-[10px] text-gray-500">Bisa diubah di tab Maintenance</div>
              </div>

              <div className="p-4 rounded-xl bg-[#081226] border border-cyan-900/40 space-y-1">
                <div className="text-[11px] text-gray-400 flex items-center justify-between">
                  <span>AKUN SUPERADMIN</span>
                  <User className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-sm font-bold text-purple-300 truncate">{adminName}</div>
                <div className="text-[10px] text-gray-500 truncate">{adminEmail}</div>
              </div>
            </div>

            {/* Live Security Audit Stream */}
            <div className="p-4 rounded-xl bg-[#081226] border border-cyan-900/40">
              <div className="flex items-center justify-between mb-3 border-b border-cyan-900/40 pb-2">
                <span className="text-xs font-bold text-white uppercase flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Live Security Audit Stream
                </span>
                <button
                  onClick={handleSimulateBlock}
                  className="text-[10px] px-2 py-1 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 hover:text-white transition"
                >
                  + Uji Deteksi Serangan
                </button>
              </div>
              <div className="space-y-2 overflow-y-auto max-h-56 text-xs">
                {logs.map(l => (
                  <div key={l.id} className="flex items-center justify-between p-2 rounded bg-black/40 border border-cyan-950">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-500">{l.time}</span>
                      <span className="text-cyan-300 font-bold">{l.ip}</span>
                      <span className="text-gray-300 text-[11px]">{l.event}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      l.status === 'BLOCKED' ? 'bg-red-950 text-red-400 border border-red-900' : 'bg-emerald-950 text-emerald-400 border border-emerald-900'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: MAINTENANCE & EDIT TAMPILAN PAGE ─── */}
        {activeTab === 'MAINTENANCE' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Editor Maintenance */}
            <div className="p-5 rounded-xl bg-[#081226] border border-cyan-900/40 space-y-4">
              <div className="flex items-center justify-between border-b border-cyan-900/40 pb-3">
                <span className="text-sm font-bold text-white uppercase flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-cyan-400" />
                  Kontrol & Editor Halaman Maintenance
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  maintenanceMode ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}>
                  {maintenanceMode ? 'AKTIF' : 'TIDAK AKTIF'}
                </span>
              </div>

              {maintenanceSaveMsg && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{maintenanceSaveMsg}</span>
                </div>
              )}
              {maintenanceSaveError && (
                <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{maintenanceSaveError}</span>
                </div>
              )}

              {/* Toggle Switch */}
              <div className="p-3.5 rounded-lg bg-black/40 border border-cyan-950 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Status Saklar Maintenance</div>
                  <div className="text-[11px] text-gray-400">
                    {maintenanceMode ? 'Semua browser publik akan diarahkan ke halaman countdown.' : 'Website berjalan normal untuk semua pengguna.'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={maintenanceSaving}
                  onClick={() => handleSaveMaintenanceSettings(!maintenanceMode)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait ${
                    maintenanceMode
                      ? 'bg-red-600 text-white shadow-lg shadow-red-950'
                      : 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{maintenanceMode ? 'Matikan Maintenance' : 'Nyalakan Maintenance'}</span>
                </button>
              </div>

              {/* Form Input Kustomisasi Tampilan */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 uppercase">Judul Utama Halaman:</label>
                  <input
                    type="text"
                    value={maintenanceTitle}
                    onChange={e => setMaintenanceTitle(e.target.value)}
                    placeholder="Lagi Maintenance"
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-cyan-900/50 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 uppercase">Pesan Penjelasan Kepada Pengunjung:</label>
                  <textarea
                    rows={3}
                    value={maintenanceMessage}
                    onChange={e => setMaintenanceMessage(e.target.value)}
                    placeholder="Tulis alasan maintenance..."
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-cyan-900/50 text-xs text-gray-200 focus:outline-none focus:border-cyan-400 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-gray-400 uppercase">Estimasi Durasi Maintenance (jam):</label>
                  <input
                    type="number"
                    min="0.1"
                    max="720"
                    step="0.1"
                    value={maintenanceDurationHours}
                    onChange={e => setMaintenanceDurationHours(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/50 border border-cyan-900/50 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 uppercase">Email Kontak:</label>
                    <input
                      type="text"
                      value={maintenanceContact}
                      onChange={e => setMaintenanceContact(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-black/50 border border-cyan-900/50 text-xs text-gray-300 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-gray-400 uppercase">Nomor WhatsApp Dukungan:</label>
                    <input
                      type="text"
                      value={maintenanceWhatsapp}
                      onChange={e => setMaintenanceWhatsapp(e.target.value)}
                      placeholder="+62 812-xxxx-xxxx"
                      className="w-full px-3 py-2 rounded-lg bg-black/50 border border-cyan-900/50 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Pilih Logo / Ikon Maintenance */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] text-gray-400 uppercase">Pilih Logo / Ikon Di Atas Judul:</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'SHIELD', label: 'Perisai Biru', desc: 'Official Shield' },
                      { id: 'WRENCH', label: 'Kunci Pas', desc: 'Repair Pulse' },
                      { id: 'ALERT', label: 'Segitiga Awas', desc: 'Warning Alert' },
                      { id: 'SERVER', label: 'Server Edge', desc: 'System Core' },
                    ].map(lg => (
                      <button
                        key={lg.id}
                        type="button"
                        onClick={() => setMaintenanceLogoType(lg.id)}
                        className={`p-2 rounded-lg border text-center transition ${
                          maintenanceLogoType === lg.id
                            ? 'bg-cyan-950/80 border-cyan-400 shadow-md shadow-cyan-950 text-white'
                            : 'bg-black/40 border-cyan-900/40 text-gray-400 hover:text-white'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{lg.label}</div>
                        <div className="text-[9px] text-gray-500">{lg.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pilih Warna Tema Background */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] text-gray-400 uppercase">Pilih Tema Warna Background:</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {[
                      { name: 'Cyber Dark', bg: '#030816', glow: '#00e5ff' },
                      { name: 'Deep Navy', bg: '#060e24', glow: '#3b82f6' },
                      { name: 'Midnight Purple', bg: '#0d0720', glow: '#a855f7' },
                      { name: 'Obsidian Red', bg: '#180407', glow: '#ef4444' },
                      { name: 'Dark Emerald', bg: '#03140e', glow: '#10b981' },
                    ].map(theme => (
                      <button
                        key={theme.name}
                        type="button"
                        onClick={() => {
                          setMaintenanceBgColor(theme.bg);
                          setMaintenanceGlowColor(theme.glow);
                        }}
                        className={`p-2 rounded-lg border text-center transition flex flex-col items-center gap-1 ${
                          maintenanceBgColor === theme.bg
                            ? 'border-cyan-400 shadow-md bg-white/10'
                            : 'border-cyan-900/40 bg-black/40 hover:border-gray-500'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full border border-white/30" style={{ backgroundColor: theme.glow }} />
                        <span className="text-[10px] text-gray-300 font-bold leading-tight">{theme.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={maintenanceSaving}
                  onClick={() => handleSaveMaintenanceSettings()}
                  className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs tracking-wide transition flex items-center justify-center gap-2 mt-2 shadow-lg shadow-cyan-950/50 disabled:opacity-50 disabled:cursor-wait"
                >
                  <Save className="w-4 h-4" />
                  <span>{maintenanceSaving ? 'Menyimpan...' : 'Simpan Perubahan Tampilan Maintenance'}</span>
                </button>
              </div>
            </div>

            {/* Live Preview Halaman Maintenance */}
            <div className="p-5 rounded-xl bg-[#081226] border border-cyan-900/40 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-cyan-900/40 pb-3 mb-3">
                  <span className="text-xs font-bold text-white uppercase flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-cyan-400" />
                    Live Preview Tampilan Maintenance
                  </span>
                  <a
                    href="/maintenance"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-cyan-400 hover:underline"
                  >
                    Buka Halaman Penuh ↗
                  </a>
                </div>

                {/* Preview Box Miniatur Dinamis */}
                <div
                  className="rounded-xl border border-cyan-900/60 p-6 text-center space-y-4 shadow-inner transition-colors duration-300"
                  style={{ backgroundColor: maintenanceBgColor }}
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
                    {maintenanceLogoType === 'SHIELD' ? (
                      <img src="/admin-shield-logo.png" alt="Shield Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(0,229,255,0.7)]" />
                    ) : maintenanceLogoType === 'ALERT' ? (
                      <Shield className="w-8 h-8 text-amber-400 animate-pulse" />
                    ) : maintenanceLogoType === 'SERVER' ? (
                      <Server className="w-8 h-8 text-cyan-400" />
                    ) : (
                      <Wrench className="w-8 h-8 text-cyan-400 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{maintenanceTitle}</div>
                    <div className="text-xs text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">{maintenanceMessage}</div>
                  </div>

                  {/* Countdown Preview */}
                  <div className="flex justify-center gap-2 pt-2">
                    {['02 JAM', '00 MENIT', '00 DETIK'].map(box => (
                      <div key={box} className="px-3 py-2 rounded-lg bg-black/60 border border-cyan-900/50 text-xs font-bold text-cyan-300">
                        {box}
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex flex-col items-center gap-1 text-[10px] text-gray-400">
                    <div>Email: <span className="text-cyan-300">{maintenanceContact}</span></div>
                    {maintenanceWhatsapp && (
                      <div className="text-emerald-400 font-bold">WhatsApp: {maintenanceWhatsapp}</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-900/30 text-[11px] text-cyan-400/80">
                💡 Tip: Setiap perubahan judul, teks penjelasan, atau durasi yang kamu simpan akan langsung terlihat oleh semua pengunjung di halaman <code>/maintenance</code>.
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 3: PROFIL ADMIN & GANTI PASSWORD ─── */}
        {activeTab === 'PROFILE' && (
          <div className="max-w-2xl mx-auto p-6 rounded-xl bg-[#081226] border border-cyan-900/40 space-y-5">
            <div className="border-b border-cyan-900/40 pb-3">
              <h2 className="text-base font-bold text-white uppercase flex items-center gap-2">
                <User className="w-5 h-5 text-cyan-400" />
                Pengaturan Akun & Password Admin
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Ubah nama profil, email login admin, dan perbarui password admin.
              </p>
            </div>

            {profileSuccessMsg && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Nama Admin */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 uppercase">Nama Lengkap / Panggilan Admin:</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg bg-black/50 border border-cyan-900/50 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Email Admin */}
              <div className="space-y-1.5">
                <label className="text-[11px] text-gray-400 uppercase">Email Login Admin:</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg bg-black/50 border border-cyan-900/50 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Divider Password */}
              <div className="pt-2 border-t border-cyan-900/30">
                <div className="text-xs font-bold text-cyan-400 uppercase mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Ganti Password (Kosongkan jika tidak ingin ganti)
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-gray-400 uppercase">Password Baru:</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Minimal 6 karakter..."
                        className="w-full px-3 pr-10 py-2.5 rounded-lg bg-black/50 border border-cyan-900/50 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] text-gray-400 uppercase">Konfirmasi Password Baru:</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang password baru..."
                      className="w-full px-3 py-2.5 rounded-lg bg-black/50 border border-cyan-900/50 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs tracking-wide transition shadow-lg shadow-cyan-950/60 flex items-center justify-center gap-2 mt-4"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Akun & Password</span>
              </button>
            </form>
          </div>
        )}

        {/* ─── TAB 4: SECURITY ─── */}
        {activeTab === 'SECURITY' && (
          <div className="p-5 rounded-xl bg-[#081226] border border-cyan-900/40 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Sistem Keamanan Aktif
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-black/40 border border-cyan-950 space-y-1">
                <div className="text-cyan-300 font-bold">1. Content Security Policy (CSP)</div>
                <div className="text-gray-400 text-[11px]">Hanya mengizinkan frame dari YouTube dan radar Windy resmi.</div>
                <div className="text-emerald-400 text-[10px] font-bold">STATUS: ENFORCED</div>
              </div>
              <div className="p-3.5 rounded-lg bg-black/40 border border-cyan-950 space-y-1">
                <div className="text-cyan-300 font-bold">2. Anti-XSS & SQL Injection Filter</div>
                <div className="text-gray-400 text-[11px]">Membersihkan otomatis script tag, payload serangan, dan query injection.</div>
                <div className="text-emerald-400 text-[10px] font-bold">STATUS: ACTIVE</div>
              </div>
              <div className="p-3.5 rounded-lg bg-black/40 border border-cyan-950 space-y-1">
                <div className="text-cyan-300 font-bold">3. Sesi Cookie Aman 7 Hari</div>
                <div className="text-gray-400 text-[11px]">Token disimpan dengan atribut SameSite=Lax dan Secure HTTPS.</div>
                <div className="text-emerald-400 text-[10px] font-bold">STATUS: 7 DAYS PERSISTENT</div>
              </div>
              <div className="p-3.5 rounded-lg bg-black/40 border border-cyan-950 space-y-1">
                <div className="text-cyan-300 font-bold">4. L7 Rate Limiting & Anti-Brute Force</div>
                <div className="text-gray-400 text-[11px]">Jeda respon buatan pada percobaan login gagal untuk mencegah peretasan.</div>
                <div className="text-emerald-400 text-[10px] font-bold">STATUS: ENABLED</div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: API KEYS ─── */}
        {activeTab === 'API_KEYS' && (
          <div className="p-5 rounded-xl bg-[#081226] border border-cyan-900/40 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              Status Pipeline API Telemetri
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { name: 'NASA EONET v3', type: 'Public Satelit', status: 'ONLINE', quota: 'Unlimited' },
                { name: 'USGS Earthquake Hazards', type: 'Public Seismik', status: 'ONLINE', quota: 'Unlimited' },
                { name: 'YouTube Data API v3', type: 'API Key Live Search', status: 'ACTIVE', quota: '10,000 unit/hari' },
                { name: 'ExchangeRate Currency', type: 'API Key Valas', status: 'ONLINE', quota: '1,500 req/bulan' },
                { name: 'Open-Meteo Air Quality', type: 'Public Sensor AQI', status: 'ONLINE', quota: 'Unlimited' },
                { name: 'AI Multi-Provider Gateway', type: 'Auto-Failover 6 Provider', status: 'ONLINE', quota: 'Tier 1' },
              ].map(api => (
                <div key={api.name} className="flex items-center justify-between p-2.5 rounded bg-black/40 border border-cyan-950">
                  <div>
                    <div className="text-white font-bold">{api.name}</div>
                    <div className="text-[10px] text-gray-500">{api.type}</div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-400 border border-emerald-900">
                    {api.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── TAB 6: FEEDBACK & RATINGS PENGUNJUNG ─── */}
        {activeTab === 'FEEDBACK' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#081226] border border-cyan-900/40 text-center">
                <div className="text-[11px] text-gray-400 uppercase font-mono">Rata-Rata Kepuasan</div>
                <div className="text-3xl font-extrabold text-amber-400 mt-1 flex items-center justify-center gap-1">
                  <Star className="w-6 h-6 fill-amber-400" />
                  <span>{feedbackStats.averageRating.toFixed(1)} / 5.0</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono mt-1">Berdasarkan suara pengunjung publik</div>
              </div>

              <div className="p-4 rounded-xl bg-[#081226] border border-cyan-900/40 text-center">
                <div className="text-[11px] text-gray-400 uppercase font-mono">Total Pemberi Suka</div>
                <div className="text-3xl font-extrabold text-cyan-300 mt-1">
                  {feedbackStats.totalRatings}
                </div>
                <div className="text-[10px] text-emerald-400 font-mono mt-1">Sistem 1 HP = 1 ID Unik Konsisten</div>
              </div>

              <div className="p-4 rounded-xl bg-[#081226] border border-cyan-900/40 flex items-center justify-center">
                <button
                  type="button"
                  onClick={loadAdminFeedbacks}
                  className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-bold transition flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Ulasan Real-Time</span>
                </button>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#081226] border border-cyan-900/40 space-y-4">
              <div className="flex items-center justify-between border-b border-cyan-900/40 pb-3">
                <h3 className="text-sm font-bold text-white uppercase flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-cyan-400" />
                  Daftar Feedback & Komentar Anonim
                </h3>
                <span className="text-xs text-gray-400 font-mono">{adminFeedbacks.length} data tersimpan</span>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {adminFeedbacks.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-black/30 border border-cyan-950 text-gray-500 font-mono space-y-2">
                    <MessageSquare className="w-8 h-8 text-gray-600 mx-auto opacity-40" />
                    <div className="text-sm text-gray-400 font-bold">Belum Ada Ulasan Pengunjung</div>
                    <div className="text-xs text-gray-500 max-w-md mx-auto">
                      Sistem bersih tanpa data fiktif. Ulasan asli pengunjung publik dengan ID unik (contoh: Anonim100) akan otomatis muncul di sini secara real-time.
                    </div>
                  </div>
                ) : (
                  adminFeedbacks.map(f => (
                    <div key={f.id} className="p-3 rounded-lg bg-black/40 border border-cyan-950 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-cyan-300">{f.authorName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-gray-400 font-mono">
                            ID: #{f.deviceId}
                          </span>
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            {f.deviceType === 'mobile' ? <Smartphone className="w-3 h-3 text-cyan-500" /> : <Monitor className="w-3 h-3 text-blue-500" />}
                            {f.deviceType}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(st => (
                            <Star
                              key={st}
                              className={`w-3 h-3 ${st <= f.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-700'}`}
                            />
                          ))}
                        </div>
                      </div>
                      {f.comment && (
                        <p className="text-xs text-gray-300 font-sans mt-0.5">{f.comment}</p>
                      )}
                      <div className="text-[9px] text-gray-600 font-mono text-right">
                        {new Date(f.createdAt).toLocaleString('id-ID')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
