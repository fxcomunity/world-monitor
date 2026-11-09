import { NavLink } from 'react-router-dom';
import {
  Globe,
  Map,
  BarChart2,
  CloudLightning,
  Leaf,
  Zap,
  Cpu,
  Truck,
  Flag,
  Database,
  Bell,
  Settings,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/',            label: 'Country Intel',    icon: Flag,           section: 'MONITOR' },
  { path: '/dashboard',  label: 'Global Dashboard', icon: Globe,          section: 'MONITOR' },
  { path: '/map',        label: 'Live World Map',   icon: Map,            section: 'MONITOR' },
  { path: '/geopolitik', label: 'Geopolitik',       icon: ShieldAlert,    section: 'MONITOR' },
  { path: '/ekonomi',    label: 'Ekonomi',          icon: BarChart2,      section: 'ANALITIK' },
  { path: '/bencana',    label: 'Bencana',          icon: CloudLightning, section: 'ANALITIK' },
  { path: '/lingkungan', label: 'Lingkungan',       icon: Leaf,           section: 'ANALITIK' },
  { path: '/energi',     label: 'Energi',           icon: Zap,            section: 'ANALITIK' },
  { path: '/teknologi',  label: 'Teknologi & Sains',icon: Cpu,            section: 'ANALITIK' },
  { path: '/transportasi',label: 'Transportasi',    icon: Truck,          section: 'ANALITIK' },
  { path: '/data',       label: 'Data Explorer',    icon: Database,       section: 'SISTEM' },
  { path: '/notifikasi', label: 'Notifikasi',       icon: Bell,           section: 'SISTEM' },
  { path: '/pengaturan', label: 'Pengaturan',       icon: Settings,       section: 'SISTEM' },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ mobileOpen = false, onCloseMobile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const sections = ['MONITOR', 'ANALITIK', 'SISTEM'] as const;

  const renderNavLinks = (isMobile = false) => (
    <nav className="flex-1 overflow-y-auto py-2 scrollbar-none">
      {sections.map(section => {
        const items = navItems.filter(n => n.section === section);
        return (
          <div key={section} className="mb-2">
            {(!collapsed || isMobile) && (
              <div className="px-4 pt-3 pb-1 text-gray-500 text-[10px] font-mono font-bold tracking-widest">
                {section}
              </div>
            )}
            {collapsed && !isMobile && <div className="border-t border-cyan-900/30 mx-2 my-2" />}
            {items.map(item => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (isMobile && onCloseMobile) onCloseMobile();
                  }}
                  title={collapsed && !isMobile ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 mx-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 group ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/40 shadow-sm shadow-cyan-950/50'
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                    } ${collapsed && !isMobile ? 'justify-center' : ''}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                      {(!collapsed || isMobile) && (
                        <span className="truncate">{item.label}</span>
                      )}
                      {(!collapsed || isMobile) && isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 flex-shrink-0" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ─── DESKTOP / TABLET SIDEBAR (md and up) ─── */}
      <aside
        className={`hidden md:flex flex-col bg-[#060D1F] border-r border-cyan-900/50 transition-all duration-300 ${
          collapsed ? 'w-14' : 'w-48 lg:w-56'
        } h-screen flex-shrink-0`}
      >
        {/* Logo Header */}
        <div className={`flex items-center border-b border-cyan-900/50 py-3 ${collapsed ? 'justify-center px-0' : 'px-4'}`}>
          {collapsed ? (
            <img
              src="/favicon.png"
              alt="World Monitor"
              className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]"
            />
          ) : (
            <img
              src="/logo.png"
              alt="World Monitor"
              className="h-10 w-auto object-contain drop-shadow-[0_0_10px_rgba(0,229,255,0.25)]"
            />
          )}
        </div>

        {/* Links */}
        {renderNavLinks(false)}

        {/* Collapse toggle */}
        <div className="border-t border-cyan-900/50 p-2">
          <button
            onClick={() => setCollapsed(c => !c)}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition text-xs ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <><ChevronLeft className="w-4 h-4" /><span>Ciutkan</span></>}
          </button>
          {!collapsed && (
            <div className="px-2 pb-1 mt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs font-mono">Sistem Online</span>
              </div>
              <div className="text-gray-600 text-[10px] font-mono mt-0.5">World Monitor · v1.0.0</div>
            </div>
          )}
        </div>
      </aside>

      {/* ─── MOBILE DRAWER (Below md) ─── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
          />

          {/* Slide-over Drawer */}
          <div className="relative w-72 max-w-[85vw] bg-[#060D1F] border-r border-cyan-800/60 h-full flex flex-col z-10 shadow-2xl">
            {/* Mobile Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-cyan-900/50">
              <img
                src="/logo.png"
                alt="World Monitor"
                className="h-8 w-auto object-contain"
              />
              <button
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg bg-black/40 border border-cyan-900/60 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Links */}
            {renderNavLinks(true)}

            {/* Footer */}
            <div className="p-4 border-t border-cyan-900/50 bg-black/40">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-emerald-400 font-bold">World Monitor Live</span>
              </div>
              <div className="text-[11px] text-gray-500 font-mono mt-0.5">Responsif untuk semua gawai</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
