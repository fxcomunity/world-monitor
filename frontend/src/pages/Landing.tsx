import { useNavigate } from 'react-router-dom';
import { Globe, ShieldAlert, BarChart2, CloudLightning, Leaf, Zap, Cpu, Truck, Flag, ArrowRight } from 'lucide-react';
import { FeedbackHeroBadge } from '../components/RatingFeedbackModal';
import Footer from '../components/Footer';

const modules = [
  { path: '/dashboard',   label: 'Global Dashboard',  icon: Globe,           desc: 'Ringkasan kondisi dunia',         color: 'border-cyan-700 hover:border-cyan-500 text-cyan-400' },
  { path: '/map',         label: 'Live World Map',    icon: Globe,           desc: 'Peta interaktif real-time',        color: 'border-blue-700 hover:border-blue-500 text-blue-400' },
  { path: '/',            label: 'Country Intel',     icon: Flag,            desc: 'Kecerdasan negara & stabilitas',   color: 'border-purple-700 hover:border-purple-500 text-purple-400' },
  { path: '/geopolitik',  label: 'Geopolitik',        icon: ShieldAlert,     desc: 'Konflik & hubungan diplomatik',    color: 'border-orange-700 hover:border-orange-500 text-orange-400' },
  { path: '/ekonomi',     label: 'Ekonomi',           icon: BarChart2,       desc: 'GDP, inflasi, nilai tukar',        color: 'border-green-700 hover:border-green-500 text-green-400' },
  { path: '/bencana',     label: 'Bencana',           icon: CloudLightning,  desc: 'Gempa, banjir, badai, kebakaran', color: 'border-red-700 hover:border-red-500 text-red-400' },
  { path: '/lingkungan',  label: 'Lingkungan',        icon: Leaf,            desc: 'Iklim, emisi CO₂, kualitas udara',color: 'border-emerald-700 hover:border-emerald-500 text-emerald-400' },
  { path: '/energi',      label: 'Energi',            icon: Zap,             desc: 'Minyak, gas, terbarukan',          color: 'border-yellow-700 hover:border-yellow-500 text-yellow-400' },
  { path: '/teknologi',   label: 'Teknologi & Sains', icon: Cpu,             desc: 'AI, antariksa, semikonduktor',     color: 'border-pink-700 hover:border-pink-500 text-pink-400' },
  { path: '/transportasi',label: 'Transportasi',      icon: Truck,           desc: 'Penerbangan, pelayaran, pelabuhan',color: 'border-indigo-700 hover:border-indigo-500 text-indigo-400' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-full bg-[#0A0F24] text-white font-mono">
      {/* Hero */}
      <div className="relative px-4 sm:px-10 pt-8 sm:pt-14 pb-8 sm:pb-10 border-b border-cyan-900/40 overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-bold tracking-widest">SISTEM AKTIF · DATA REAL-TIME</span>
            </div>
            {/* Fitur Suka Bintang 1-5 & Komentar Anonim */}
            <FeedbackHeroBadge onClick={() => window.dispatchEvent(new CustomEvent('open-rating-modal'))} />
          </div>
          <div className="mb-4">
            <img
              src="/logo.png"
              alt="World Monitor — Real-Time Global Insights"
              className="h-12 sm:h-16 md:h-20 w-auto object-contain drop-shadow-[0_0_20px_rgba(0,229,255,0.3)]"
            />
          </div>
          <p className="text-gray-400 text-xs sm:text-sm max-w-xl leading-relaxed mb-6">
            Platform pemantauan kondisi global — mengumpulkan, menganalisis, dan memvisualisasikan
            informasi dari seluruh penjuru dunia secara real-time.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-lg transition">
              Buka Dashboard <ArrowRight className="w-3 h-3" />
            </button>
            <button onClick={() => navigate('/map')}
              className="flex items-center gap-2 px-4 sm:px-5 py-2 border border-cyan-800 hover:border-cyan-600 text-cyan-400 text-xs font-bold rounded-lg transition">
              Live World Map <Globe className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 sm:px-10 py-6 border-b border-cyan-900/30">
        {[
          { label: 'Negara Dipantau', value: '195', color: 'text-cyan-400' },
          { label: 'Sumber Data Aktif', value: '12', color: 'text-green-400' },
          { label: 'Pembaruan/Jam', value: '3.600+', color: 'text-yellow-400' },
          { label: 'Event Dipantau', value: '50+', color: 'text-red-400' },
        ].map((s, i) => (
          <div key={i} className="text-center p-2 rounded bg-black/20 border border-cyan-950 sm:border-0 sm:bg-transparent">
            <div className={`text-xl sm:text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-[11px] sm:text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Module Grid */}
      <div className="px-4 sm:px-10 py-8">
        <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-4">MODUL TERSEDIA</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {modules.map((m, i) => {
            const Icon = m.icon;
            return (
              <button
                key={i}
                onClick={() => navigate(m.path)}
                className={`flex items-start gap-3 p-3.5 sm:p-4 bg-[#0D1530] border rounded-lg text-left transition group ${m.color}`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-bold mb-0.5 group-hover:text-cyan-300 transition">{m.label}</div>
                  <div className="text-gray-500 text-xs leading-snug">{m.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-700 group-hover:text-cyan-400 transition flex-shrink-0 mt-0.5" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Data sources */}
      <div className="px-4 sm:px-10 pb-8">
        <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-4">SUMBER DATA TERINTEGRASI</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'NASA EONET', type: 'Bencana', color: 'border-red-800 text-red-400' },
            { name: 'USGS', type: 'Gempa', color: 'border-orange-800 text-orange-400' },
            { name: 'World Bank', type: 'Ekonomi', color: 'border-green-800 text-green-400' },
            { name: 'MapTiler', type: 'Peta', color: 'border-blue-800 text-blue-400' },
            { name: 'Yahoo Finance', type: 'Forex & Futures', color: 'border-yellow-800 text-yellow-400' },
            { name: 'Alpha Vantage', type: 'Saham', color: 'border-purple-800 text-purple-400' },
            { name: 'Open-Meteo', type: 'Cuaca', color: 'border-cyan-800 text-cyan-400' },
            { name: 'OpenAQ', type: 'Kualitas Udara', color: 'border-emerald-800 text-emerald-400' },
            { name: 'OpenSky', type: 'Penerbangan', color: 'border-indigo-800 text-indigo-400' },
            { name: 'ReliefWeb', type: 'Kemanusiaan', color: 'border-pink-800 text-pink-400' },
            { name: 'GDACS', type: 'Bencana Global', color: 'border-red-800 text-red-300' },
          ].map((src, i) => (
            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 bg-[#0D1530] border rounded text-xs ${src.color}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span className="font-bold">{src.name}</span>
              <span className="text-gray-600">·</span>
              <span className="text-gray-500">{src.type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Komprehensif (FAQ, Kebijakan & Privasi, Panduan Kontribusi) */}
      <Footer />
    </div>
  );
}
