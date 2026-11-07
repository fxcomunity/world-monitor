import { useState, useEffect, useRef, useCallback } from 'react';
import { Wind, RefreshCw, MapPin, AlertTriangle, TrendingUp, Navigation, Info } from 'lucide-react';
import { fetchAirQualityLive } from '../lib/api';

const MAPTILER_KEY = (import.meta.env.VITE_MAPTILER_KEY as string) || 'yOkVtwcO1iYENTiJvyrd';

// ─── AQI Helpers ──────────────────────────────────────────────────────────────
function aqiLevel(aqi: number): { label: string; color: string; bg: string; risk: number } {
  if (aqi <= 50)  return { label: 'Baik',           color: '#00e400', bg: 'rgba(0,228,0,0.15)',      risk: 5  };
  if (aqi <= 100) return { label: 'Sedang',         color: '#ffff00', bg: 'rgba(255,255,0,0.15)',    risk: 25 };
  if (aqi <= 150) return { label: 'Tidak Sehat*',   color: '#ff7e00', bg: 'rgba(255,126,0,0.15)',    risk: 50 };
  if (aqi <= 200) return { label: 'Tidak Sehat',    color: '#ff0000', bg: 'rgba(255,0,0,0.15)',      risk: 70 };
  if (aqi <= 300) return { label: 'Sangat Berbahaya',color: '#8f3f97', bg: 'rgba(143,63,151,0.15)', risk: 88 };
  return           { label: 'Berbahaya',             color: '#7e0023', bg: 'rgba(126,0,35,0.15)',    risk: 98 };
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
        setLastUpdate(new Date().toLocaleTimeString('id-ID'));
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
        style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`,
        center: [20, 20],
        zoom: 1.8,
        attributionControl: false,
      });

      map.on('load', () => {
        if (!mounted) return;
        mapRef.current = map;

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

  return (
    <div className="w-full min-h-full bg-[#050B18] text-white font-mono flex flex-col">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-3 bg-[#060D1F] border-b border-cyan-900/50 flex-shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <Wind className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <div>
            <h1 className="text-xs sm:text-sm font-bold tracking-wider text-white uppercase flex flex-wrap items-center gap-2">
              <span>MONITOR KUALITAS UDARA GLOBAL</span>
              <span className="text-[10px] text-emerald-400 border border-emerald-800/80 px-1.5 py-0.5 rounded bg-emerald-950/60 font-bold">
                DATA TERKINI
              </span>
            </h1>
            <div className="text-[11px] text-gray-500">
              Estimasi kualitas udara Open-Meteo untuk kota-kota sampel · pembaruan berkala
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <div className="text-left sm:text-right text-xs">
            <span className="text-gray-500">TERAKHIR DIPERBARUI: </span>
            <span className="text-cyan-400">{lastUpdate || 'MEMUAT...'}</span>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-cyan-400 bg-cyan-950/40 border border-cyan-800/60 hover:border-cyan-400 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
        </div>
      </div>

      {/* ── Main Layout: Map (kiri) + Panel (kanan) — RESPONSIVE ON ALL DEVICES ── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Map Container */}
        <div className="w-full h-[360px] sm:h-[450px] lg:h-full lg:flex-1 relative overflow-hidden flex-shrink-0">
          <div ref={mapContainerRef} className="w-full h-full" />

          {!mapReady && (
            <div className="absolute inset-0 bg-[#050B18] flex flex-col items-center justify-center z-10"
              style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0,200,50,0.04) 0%, transparent 60%)' }}>
              <div className="text-green-400 text-sm font-bold animate-pulse mb-2">MEMUAT PETA KUALITAS UDARA...</div>
              <div className="text-gray-600 text-xs">MapLibre GL · MapTiler Dark · Open-Meteo Live Data</div>
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
        <div className="w-full lg:w-80 bg-[#060D1F] border-t lg:border-t-0 lg:border-l border-cyan-900/50 flex flex-col flex-shrink-0 overflow-y-auto overscroll-contain">
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
                      Risiko: {currentLevel.risk}%
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
        </div>
      </div>
    </div>
  );
}
