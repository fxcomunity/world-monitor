import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wind, RefreshCw, MapPin, AlertTriangle, TrendingUp, Navigation, Info,
  Gauge, Globe2, ShieldCheck, Activity,
} from 'lucide-react';
import { fetchAirQualityLive } from '../lib/api';
import { ListSkeleton } from '../components/MonitorSkeleton';

// ─── AQI Helpers ──────────────────────────────────────────────────────────────
function aqiLevel(aqi: number): { label: string; color: string; bg: string } {
  if (aqi <= 50)  return { label: 'Baik',            color: '#00e400', bg: 'rgba(0,228,0,0.15)' };
  if (aqi <= 100) return { label: 'Sedang',          color: '#ffff00', bg: 'rgba(255,255,0,0.15)' };
  if (aqi <= 150) return { label: 'Tidak Sehat*',    color: '#ff7e00', bg: 'rgba(255,126,0,0.15)' };
  if (aqi <= 200) return { label: 'Tidak Sehat',     color: '#ff0000', bg: 'rgba(255,0,0,0.15)' };
  if (aqi <= 300) return { label: 'Sangat Berbahaya', color: '#8f3f97', bg: 'rgba(143,63,151,0.15)' };
  return           { label: 'Berbahaya',              color: '#7e0023', bg: 'rgba(126,0,35,0.15)' };
}

// Kota-kota sampling untuk perbandingan real-time
const CITIES_SAMPLE = [
  { name: 'Jakarta',     lat: -6.2088,  lng: 106.8456, country: 'Indonesia' },
  { name: 'Beijing',     lat: 39.9042,  lng: 116.4074, country: 'China'     },
  { name: 'New Delhi',   lat: 28.6139,  lng: 77.2090,  country: 'India'     },
  { name: 'London',      lat: 51.5074,  lng: -0.1278,  country: 'UK'        },
  { name: 'Los Angeles', lat: 34.0522,  lng: -118.2437,country: 'USA'       },
  { name: 'Chiang Mai',  lat: 18.7883,  lng: 98.9853,  country: 'Thailand'  },
  { name: 'Tokyo',       lat: 35.6762,  lng: 139.6503, country: 'Japan'     },
  { name: 'Sydney',      lat: -33.8688, lng: 151.2093, country: 'Australia' },
  { name: 'Riyadh',      lat: 24.7136,  lng: 46.6753,  country: 'Saudi'     },
  { name: 'Nairobi',     lat: -1.2921,  lng: 36.8219,  country: 'Kenya'     },
  { name: 'São Paulo',   lat: -23.5505, lng: -46.6333, country: 'Brasil'    },
  { name: 'Paris',       lat: 48.8566,  lng: 2.3522,   country: 'France'    },
];

interface CityData {
  name: string;
  lat: number;
  lng: number;
  country: string;
  aqi: number;
  pm25: number;
  pm10: number;
  o3: number;
}

export default function Environment() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  const [cities, setCities]           = useState<CityData[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [mapReady, setMapReady]       = useState(false);
  const [lastUpdate, setLastUpdate]   = useState('');
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [mapError, setMapError]       = useState<string | null>(null);

  // ── Siapkan data kota terkini dari Open-Meteo Air Quality API ────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const readings = await fetchAirQualityLive(CITIES_SAMPLE);
      const data = CITIES_SAMPLE.flatMap((city, index): CityData[] => {
        const reading = readings[index];
        if (!reading || typeof reading.us_aqi !== 'number' || !Number.isFinite(reading.us_aqi)) {
          return [];
        }
        return [{
          ...city,
          aqi: Math.round(reading.us_aqi),
          pm25: Number((reading.pm2_5 ?? 0).toFixed(1)),
          pm10: Number((reading.pm10 ?? 0).toFixed(1)),
          o3: Number((reading.ozone ?? 0).toFixed(1)),
        }];
      });

      data.sort((a, b) => b.aqi - a.aqi);
      setCities(data);
      setSelectedCity(current => data.find(city => city.name === current?.name) || data[0] || null);
      if (data.length === 0) {
        setLoadError('Belum ada pembacaan kualitas udara yang valid dari Open-Meteo.');
      } else {
        const observedTimes = readings
          .map(reading => reading?.time)
          .filter((time): time is string => Boolean(time))
          .sort();
        const observedAt = observedTimes[observedTimes.length - 1];
        setLastUpdate(observedAt
          ? new Date(`${observedAt}Z`).toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' })
          : '—');
      }
    } catch (err) {
      console.error('Error fetching real-time air quality:', err);
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat data kualitas udara.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ── Init MapLibre dengan heatmap ───────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (!mapContainerRef.current || !mounted) return;

      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://tiles.openfreemap.org/styles/dark',
        center: [20, 20],
        zoom: 1.8,
        attributionControl: { compact: true },
      });

      map.on('error', event => {
        const message = event.error?.message || 'Peta tidak dapat memuat sebagian data.';
        console.error('Environment map error:', message);
        if (mounted) setMapError(message);
      });

      map.on('style.load', () => {
        if (!mounted) return;
        mapRef.current = map;
        setMapError(null);

        // ── Tambah titik kota dari data aktual setelah peta siap ──────────
        map.addSource('city-points', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });

        map.addLayer({
          id: 'city-circles',
          type: 'circle',
          source: 'city-points',
          paint: {
            'circle-radius': 6,
            'circle-color': [
              'step', ['get', 'aqi'],
              '#00e400', 50,
              '#ffff00', 100,
              '#ff7e00', 150,
              '#ff0000', 200,
              '#8f3f97', 300,
              '#7e0023',
            ],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.95,
          },
          minzoom: 1,
        });

        map.addLayer({
          id: 'city-labels',
          type: 'symbol',
          source: 'city-points',
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Regular'],
            'text-size': 10,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
          },
          paint: {
            'text-color': '#e2e8f0',
            'text-halo-color': '#000000',
            'text-halo-width': 1,
          },
          minzoom: 2,
        });

        // ── Popup saat klik kota ──────────────────────────────────────────
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          className: 'wm-popup',
          offset: 12,
        });

        map.on('click', 'city-circles', e => {
          const props = e.features?.[0]?.properties;
          if (!props) return;
          const lvl = aqiLevel(props.aqi);
          popup.setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family:monospace;font-size:11px;min-width:160px;">
                <div style="font-weight:bold;color:#e2e8f0;margin-bottom:4px;">
                  [LOKASI] ${props.name}, ${props.country}
                </div>
                <div style="color:${lvl.color};font-weight:bold;font-size:14px;">AQI: ${props.aqi}</div>
                <div style="color:${lvl.color};">${lvl.label}</div>
                <div style="color:#9ca3af;margin-top:4px;">PM2.5: ${props.pm25} µg/m³</div>
                <div style="color:#6b7280;font-size:10px;margin-top:2px;">Sumber: Open-Meteo Air Quality Live</div>
              </div>
            `)
            .addTo(map);

          // Update panel kanan
          setCities(currentCities => {
            const found = currentCities.find(c => c.name === props.name);
            if (found) setSelectedCity(found);
            return currentCities;
          });
        });

        map.on('mouseenter', 'city-circles', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'city-circles', () => { map.getCanvas().style.cursor = ''; popup.remove(); });

        setMapReady(true);
      });
    };

    init();
    return () => {
      mounted = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const source = mapRef.current?.getSource('city-points');
    if (!mapReady || !source) return;
    source.setData({
      type: 'FeatureCollection',
      features: cities.map(city => ({
        type: 'Feature',
        properties: { name: city.name, country: city.country, aqi: city.aqi, pm25: city.pm25 },
        geometry: { type: 'Point', coordinates: [city.lng, city.lat] },
      })),
    });
  }, [cities, mapReady]);

  // ── Fly to kota saat diklik di panel ──────────────────────────────────────
  const flyToCity = (city: CityData) => {
    setSelectedCity(city);
    mapRef.current?.flyTo({ center: [city.lng, city.lat], zoom: 7, speed: 1.4, curve: 1.2 });
  };

  const currentLevel = selectedCity ? aqiLevel(selectedCity.aqi) : null;
  const averageAqi = cities.length
    ? Math.round(cities.reduce((total, city) => total + city.aqi, 0) / cities.length)
    : null;
  const unhealthyCities = cities.filter(city => city.aqi > 100).length;
  const cleanestCity = cities[cities.length - 1] || null;

  return (
    <div className="w-full min-h-[calc(100vh-51px)] bg-[#050B18] text-white font-mono flex flex-col lg:h-[calc(100vh-51px)] lg:min-h-[700px]">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 bg-[#060D1F] border-b border-cyan-900/50 flex-shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <Wind className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-wider text-white uppercase flex flex-wrap items-center gap-2">
              <span>MONITOR KUALITAS UDARA GLOBAL</span>
              <span className="text-[10px] text-emerald-400 border border-emerald-800/80 px-1.5 py-0.5 rounded bg-emerald-950/60 font-bold">
                DATA TERKINI
              </span>
            </h1>
            <div className="text-xs text-gray-400">
              Estimasi kualitas udara Open-Meteo · data terbaru dari model per jam, halaman disinkronkan tiap 10 menit
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <div className="text-left sm:text-right text-xs">
            <span className="text-gray-500">WAKTU DATA (WIB): </span>
            <span className="text-cyan-400">{lastUpdate || 'MEMUAT...'}</span>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex min-h-10 items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 hover:border-cyan-400 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </div>
      </div>

      <section aria-label="Ringkasan kualitas udara" className="grid grid-cols-2 gap-3 border-b border-cyan-900/40 bg-[#071126] p-3 sm:grid-cols-4 sm:px-5 lg:px-6">
        <div className="rounded-xl border border-cyan-900/50 bg-[#09172c] p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-gray-500">
            <Globe2 className="h-3.5 w-3.5 text-cyan-400" /> KOTA TERPANTAU
          </div>
          <div className="mt-1 text-2xl font-black text-white">{loading ? '—' : cities.length}</div>
          <div className="text-[10px] text-gray-500">lokasi di 6 kawasan dunia</div>
        </div>
        <div className="rounded-xl border border-cyan-900/50 bg-[#09172c] p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-gray-500">
            <Gauge className="h-3.5 w-3.5 text-cyan-400" /> RATA-RATA AQI
          </div>
          <div className="mt-1 text-2xl font-black text-white">{loading ? '—' : averageAqi ?? '—'}</div>
          <div className="text-[10px] text-gray-500">rata-rata lokasi dengan data</div>
        </div>
        <div className="rounded-xl border border-rose-900/40 bg-[#160f1d] p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-gray-500">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" /> AQI DI ATAS 100
          </div>
          <div className="mt-1 text-2xl font-black text-rose-300">{loading ? '—' : unhealthyCities}</div>
          <div className="text-[10px] text-gray-500">lokasi kategori tidak sehat ke atas</div>
        </div>
        <div className="rounded-xl border border-emerald-900/40 bg-[#0b191a] p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-gray-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> AQI TERENDAH
          </div>
          <div className="mt-1 truncate text-base font-black text-emerald-300">{loading ? '—' : cleanestCity?.name ?? '—'}</div>
          <div className="text-[10px] text-gray-500">{cleanestCity ? `AQI ${cleanestCity.aqi} · ${cleanestCity.country}` : 'lokasi dengan data terendah'}</div>
        </div>
      </section>

      {/* ── Main Layout: Map (kiri) + Panel (kanan) — RESPONSIVE ON ALL DEVICES ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Map Container */}
        <div className="w-full h-[360px] sm:h-[450px] lg:h-full lg:min-h-0 lg:flex-1 relative overflow-hidden flex-shrink-0">
          <div ref={mapContainerRef} className="w-full h-full" />

          {!mapReady && (
            <div className="absolute inset-0 bg-[#050B18] flex flex-col items-center justify-center z-10"
              style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0,200,50,0.04) 0%, transparent 60%)' }}>
              <div className="mb-3 h-3 w-56 max-w-[75%] animate-pulse rounded bg-emerald-950/70" />
              <div className="mb-3 h-2 w-40 max-w-[60%] animate-pulse rounded bg-cyan-950/60" />
              <div className="text-green-400 text-sm font-bold mb-2">
                {mapError ? 'PETA BELUM DAPAT DIMUAT' : 'MEMUAT PETA KUALITAS UDARA...'}
              </div>
              <div className="max-w-[85%] text-center text-gray-500 text-xs">
                {mapError || 'Peta OpenFreeMap · pembacaan kualitas udara Open-Meteo'}
              </div>
            </div>
          )}

          {mapError && mapReady && (
            <div role="status" className="absolute right-3 top-3 z-10 max-w-xs rounded-lg border border-amber-800/60 bg-[#101522]/95 px-3 py-2 text-[10px] text-amber-200 shadow-lg">
              Sebagian layer peta bermasalah: {mapError}
            </div>
          )}

          {/* Legend */}
          {mapReady && (
            <div className="absolute bottom-4 left-3 bg-black/85 border border-cyan-900/50 rounded-lg p-2.5 z-10 max-w-[200px]">
              <div className="text-gray-400 text-[11px] font-bold mb-1.5 flex items-center gap-1">
                <Info className="w-3 h-3" /> INDEKS AQI
              </div>
              <div className="space-y-1 text-xs">
                {[
                  { range: '0–50',    label: 'Baik',            color: '#00e400' },
                  { range: '51–100',  label: 'Sedang',          color: '#ffff00' },
                  { range: '101–150', label: 'Tidak Sehat*',    color: '#ff7e00' },
                  { range: '151–200', label: 'Tidak Sehat',     color: '#ff0000' },
                  { range: '201–300', label: 'Sangat Berbahaya',color: '#8f3f97' },
                  { range: '301+',    label: 'Berbahaya',       color: '#7e0023' },
                ].map(item => (
                  <div key={item.range} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-400 text-[9px] w-10">{item.range}</span>
                    <span className="text-gray-200 text-[9px] truncate">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panel Kanan */}
        <div className="w-full lg:h-full lg:min-h-0 lg:w-80 bg-[#060D1F] border-t lg:border-t-0 lg:border-l border-cyan-900/50 flex flex-col flex-shrink-0 overflow-y-auto overscroll-contain">
          {/* Detail Kota Terpilih */}
          {selectedCity && currentLevel && (
            <div className="p-4 border-b border-cyan-900/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 font-bold uppercase">{selectedCity.country}</span>
                <button
                  onClick={() => flyToCity(selectedCity)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold"
                >
                  <Navigation className="w-3 h-3" /> LIHAT
                </button>
              </div>
              <h2 className="text-lg font-bold text-white mb-3">{selectedCity.name}</h2>

              {/* AQI Badge */}
              <div
                className="rounded-lg p-3 mb-3 border"
                style={{ backgroundColor: currentLevel.bg, borderColor: `${currentLevel.color}40` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-gray-400 font-bold">AIR QUALITY INDEX</div>
                    <div className="text-3xl font-black" style={{ color: currentLevel.color }}>
                      {selectedCity.aqi}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold"
                      style={{ backgroundColor: `${currentLevel.color}25`, color: currentLevel.color }}
                    >
                      {currentLevel.label}
                    </span>
                    <div className="text-[10px] text-gray-400 mt-1">
                      Skala US AQI
                    </div>
                  </div>
                </div>
              </div>

              {/* Polutan Grid */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white/5 rounded p-2 text-center">
                  <div className="text-gray-500 text-[10px]">PM2.5</div>
                  <div className="font-bold text-white mt-0.5">{selectedCity.pm25}</div>
                  <div className="text-[9px] text-gray-600">µg/m³</div>
                </div>
                <div className="bg-white/5 rounded p-2 text-center">
                  <div className="text-gray-500 text-[10px]">PM10</div>
                  <div className="font-bold text-white mt-0.5">{selectedCity.pm10}</div>
                  <div className="text-[9px] text-gray-600">µg/m³</div>
                </div>
                <div className="bg-white/5 rounded p-2 text-center">
                  <div className="text-gray-500 text-[10px]">O3</div>
                  <div className="font-bold text-white mt-0.5">{selectedCity.o3}</div>
                  <div className="text-[9px] text-gray-600">µg/m³</div>
                </div>
              </div>
            </div>
          )}

          {/* Ranking Kota Terkotor */}
          <div className="flex-1 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase">RANKING KUALITAS UDARA</span>
              <span className="text-[10px] text-gray-600">LIVE SENSOR</span>
            </div>

            <div className="space-y-2">
              {loadError && (
                <div className="rounded border border-amber-900/60 bg-amber-950/30 p-2 text-[10px] text-amber-300">
                  {loadError}
                </div>
              )}
              {cities.length === 0 && !loading && !loadError && (
                <div className="text-xs text-gray-500">Belum ada data kualitas udara.</div>
              )}
              {cities.length === 0 && loading && <ListSkeleton rows={5} />}
              {cities.map((city, idx) => {
                const lvl = aqiLevel(city.aqi);
                const isSelected = selectedCity?.name === city.name;
                return (
                  <button
                    key={city.name}
                    onClick={() => flyToCity(city)}
                    className={`w-full text-left p-2.5 rounded-lg border transition flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-500/50'
                        : 'bg-white/2 border-white/5 hover:border-cyan-900/50 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600 text-[10px] w-4 font-bold">{idx + 1}</span>
                      <div>
                        <div className="text-white font-bold">{city.name}</div>
                        <div className="text-gray-500 text-[10px]">{city.country}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden text-[10px] text-gray-500 sm:inline">PM2.5 {city.pm25}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{ color: lvl.color, backgroundColor: `${lvl.color}15` }}
                      >
                        {city.aqi}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedCity && currentLevel && (
            <div className="border-t border-cyan-900/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-gray-400">
                <Activity className="h-3.5 w-3.5 text-cyan-400" /> Panduan berdasarkan AQI
              </div>
              <p className="text-[11px] leading-relaxed text-gray-400">
                {selectedCity.aqi <= 50
                  ? `Udara di ${selectedCity.name} tergolong baik. Aktivitas luar ruang umumnya dapat dilakukan seperti biasa.`
                  : selectedCity.aqi <= 100
                    ? `Udara di ${selectedCity.name} sedang. Kelompok sensitif sebaiknya memperhatikan gejala saat beraktivitas di luar.`
                    : `Udara di ${selectedCity.name} masuk kategori ${currentLevel.label.toLowerCase()}. Pertimbangkan mengurangi aktivitas berat di luar, terutama bagi kelompok sensitif.`}
              </p>
              <p className="mt-2 text-[9px] leading-relaxed text-gray-600">
                Indikator berasal dari estimasi model Open-Meteo pada titik koordinat kota, bukan sensor stasiun lokal.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
