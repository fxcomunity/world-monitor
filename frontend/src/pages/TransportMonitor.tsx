import React, { useState, useEffect, useRef } from 'react';
import {
  Truck, Plane, Navigation, RefreshCw, Anchor,
  Globe, Radio, Compass, ArrowUpRight, ShieldCheck, MapPin
} from 'lucide-react';
import { createLiveShipsSocket, fetchLiveFlights, LiveFlight, LiveShip } from '../lib/api';
import TransportMap from './TransportMap';
import { TableSkeleton, ValueSkeleton } from '../components/MonitorSkeleton';

type Track = Record<string, Array<[number, number]>>;

interface AISPositionMessage {
  MessageType?: string;
  MetaData?: {
    MMSI?: string | number;
    ShipName?: string;
    Latitude?: number;
    Longitude?: number;
    latitude?: number;
    longitude?: number;
  };
  Message?: {
    PositionReport?: {
      Sog?: number;
      Cog?: number;
      Latitude?: number;
      Longitude?: number;
    };
  };
}

function decodeShipPosition(text: string): LiveShip | null {
  try {
    const message = JSON.parse(text) as AISPositionMessage;
    const metadata = message.MetaData;
    const position = message.Message?.PositionReport;
    const lat = metadata?.Latitude ?? metadata?.latitude ?? position?.Latitude;
    const lng = metadata?.Longitude ?? metadata?.longitude ?? position?.Longitude;
    if (
      message.MessageType !== 'PositionReport' ||
      metadata?.MMSI === undefined ||
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) return null;

    return {
      mmsi: String(metadata.MMSI),
      name: metadata.ShipName?.trim() || 'Kapal tanpa nama',
      lat,
      lng,
      speed: typeof position?.Sog === 'number' && Number.isFinite(position.Sog) ? position.Sog : null,
      heading: typeof position?.Cog === 'number' && Number.isFinite(position.Cog) ? position.Cog : null,
      receivedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// Titik Selat & Jalur Pelayaran Maritim Strategis Dunia (Chokepoints)
const MARITIME_CHOKEPOINTS = [
  {
    name: 'Selat Malaka',
    region: 'Asia Tenggara (ID/MY/SG)',
    trafficDaily: '~250 Kapal/Hari',
    status: 'NORMAL',
    desc: 'Jalur utama perdagangan minyak Timur Tengah menuju Asia Timur.',
    lat: 1.43,
    lng: 102.89,
  },
  {
    name: 'Terusan Suez',
    region: 'Mesir / Laut Merah',
    trafficDaily: '~60 Kapal/Hari',
    status: 'WASPADA',
    desc: 'Konektivitas pelayaran laut Eropa dan Asia via Laut Merah.',
    lat: 30.70,
    lng: 32.34,
  },
  {
    name: 'Selat Hormuz',
    region: 'Teluk Persia (Oman/Iran)',
    trafficDaily: '~150 Tanker/Hari',
    status: 'WASPADA',
    desc: 'Koridor 20% konsumsi minyak mentah cair dunia.',
    lat: 26.56,
    lng: 56.25,
  },
  {
    name: 'Terusan Panama',
    region: 'Amerika Tengah',
    trafficDaily: '~32 Kapal/Hari',
    status: 'DIBATASI (DRAUGHT)',
    desc: 'Penghubung Samudra Atlantik dan Pasifik untuk kapal peti kemas.',
    lat: 9.08,
    lng: -79.68,
  },
  {
    name: 'Selat Bab-el-Mandeb',
    region: 'Yaman / Djibouti',
    trafficDaily: '~45 Kapal/Hari',
    status: 'ZONA RISIKO TINGGI',
    desc: 'Gerbang selatan Laut Merah menuju Teluk Aden.',
    lat: 12.58,
    lng: 43.33,
  },
  {
    name: 'Selat Gibraltar',
    region: 'Spanyol / Maroko',
    trafficDaily: '~300 Kapal/Hari',
    status: 'NORMAL',
    desc: 'Pintu masuk tunggal dari Samudra Atlantik ke Laut Mediterania.',
    lat: 35.96,
    lng: -5.50,
  },
];

export default function TransportMonitor() {
  const [flights, setFlights] = useState<LiveFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFlight, setSearchFlight] = useState('');
  const [flightPage, setFlightPage] = useState(0);
  const [flightsError, setFlightsError] = useState<string | null>(null);
  const [ships, setShips] = useState<LiveShip[]>([]);
  const [flightTrails, setFlightTrails] = useState<Track>({});
  const [shipTrails, setShipTrails] = useState<Track>({});
  const [shipStreamStatus, setShipStreamStatus] = useState<'connecting' | 'online' | 'offline' | 'missing-key'>('connecting');
  const [lastFlightUpdate, setLastFlightUpdate] = useState('');
  const shipBuffer = useRef(new Map<string, LiveShip>());

  const loadFlights = async () => {
    setLoading(true);
    setFlightsError(null);
    try {
      const data = await fetchLiveFlights();
      setFlights(data);
      setFlightPage(0);
      setLastFlightUpdate(new Date().toLocaleTimeString('id-ID'));
      setFlightTrails(current => {
        const next: Track = {};
        data.slice(0, 1200).forEach(flight => {
          const previous = current[flight.icao24] || [];
          const last = previous[previous.length - 1];
          const moved = !last || Math.abs(last[0] - flight.lng) + Math.abs(last[1] - flight.lat) > 0.02;
          next[flight.icao24] = (moved ? [...previous, [flight.lng, flight.lat] as [number, number]] : previous).slice(-8);
        });
        return next;
      });
    } catch (e) {
      console.error('Failed to load flights:', e);
      setFlightsError(e instanceof Error ? e.message : 'Kesalahan tidak diketahui');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlights();
    const interval = setInterval(loadFlights, 45000); // refresh 45 detik
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let retryDelay = 5000;

    const scheduleReconnect = () => {
      if (!active) return;
      setShipStreamStatus('offline');
      reconnectTimer = window.setTimeout(() => void connect(), retryDelay);
      retryDelay = Math.min(30000, retryDelay * 2);
    };

    const connect = async () => {
      try {
        const response = await fetch('/api/transport/ships/status', { cache: 'no-store' });
        if (!response.ok) throw new Error(`AIS status HTTP ${response.status}`);
        const status = await response.json() as { available?: boolean };
        if (!active) return;
        if (!status.available) {
          setShipStreamStatus('missing-key');
          return;
        }

        socket = createLiveShipsSocket();
        socket.binaryType = 'arraybuffer';
        socket.onopen = () => {
          retryDelay = 5000;
          setShipStreamStatus('online');
        };
        socket.onmessage = event => {
          const text = typeof event.data === 'string'
            ? event.data
            : event.data instanceof ArrayBuffer
              ? new TextDecoder().decode(event.data)
              : event.data instanceof Blob
                ? null
                : null;
          if (text !== null) {
            const ship = decodeShipPosition(text);
            if (ship) shipBuffer.current.set(ship.mmsi, ship);
          } else if (event.data instanceof Blob) {
            void event.data.text().then(value => {
              const ship = decodeShipPosition(value);
              if (ship) shipBuffer.current.set(ship.mmsi, ship);
            });
          }
        };
        socket.onerror = () => setShipStreamStatus('offline');
        socket.onclose = () => scheduleReconnect();
      } catch (error) {
        console.error('AISStream ship connection failed:', error);
        scheduleReconnect();
      }
    };

    const flushTimer = window.setInterval(() => {
      if (!shipBuffer.current.size) return;
      const updates = [...shipBuffer.current.values()].slice(-500);
      shipBuffer.current.clear();
      setShips(current => {
        const next = new Map(current.map(ship => [ship.mmsi, ship]));
        updates.forEach(ship => next.set(ship.mmsi, ship));
        const fresh = [...next.values()].filter(ship => Date.now() - ship.receivedAt < 10 * 60 * 1000);
        return fresh.slice(-500);
      });
      setShipTrails(current => {
        const next = { ...current };
        updates.forEach(ship => {
          const trail = next[ship.mmsi] || [];
          const last = trail[trail.length - 1];
          const moved = !last || Math.abs(last[0] - ship.lng) + Math.abs(last[1] - ship.lat) > 0.001;
          if (moved) next[ship.mmsi] = [...trail, [ship.lng, ship.lat] as [number, number]].slice(-8);
        });
        return next;
      });
    }, 2500);

    void connect();
    return () => {
      active = false;
      window.clearInterval(flushTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  const filteredFlights = flights.filter(f =>
    f.callsign.toLowerCase().includes(searchFlight.toLowerCase()) ||
    f.country.toLowerCase().includes(searchFlight.toLowerCase())
  );
  const flightPageSize = 100;
  const pageCount = Math.max(1, Math.ceil(filteredFlights.length / flightPageSize));
  const visibleFlights = filteredFlights.slice(
    flightPage * flightPageSize,
    (flightPage + 1) * flightPageSize,
  );
  const trackedRouteCount = Object.values(flightTrails).filter(track => track.length > 1).length
    + Object.values(shipTrails).filter(track => track.length > 1).length;

  return (
    <div className="w-full min-h-full bg-[#060D1F] text-gray-200 p-3 sm:p-5 lg:p-6 space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-cyan-900/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase">
              GLOBAL LOGISTICS & RADAR TELEMETRY
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide flex items-center gap-2 mt-1">
            <Truck className="w-6 h-6 text-cyan-400 flex-shrink-0" />
            Global Transport & Maritime Radar
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Pelacakan lalu lintas udara komersial (OpenSky Network) & koridor maritim strategis dunia (AISStream).
          </p>
        </div>

        <button
          onClick={loadFlights}
          disabled={loading}
          className="flex min-h-10 items-center gap-2 px-3.5 py-2 rounded-lg bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/40 text-cyan-300 text-xs font-mono transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Radar
        </button>
      </div>

      {/* ─── KPIS ─── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#0a1934] to-[#081226] border border-cyan-900/40 shadow-lg transition hover:border-cyan-700/60">
          <div className="text-[11px] font-mono text-gray-400">PESAWAT TERDETEKSI (RADAR)</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono mt-1 flex items-center justify-between">
            {loading && flights.length === 0 ? <ValueSkeleton /> : flights.length}
            <Plane className="w-5 h-5 text-cyan-500/40" />
          </div>
          <div className="text-[10px] text-gray-500 mt-1">OpenSky ADS-B transponder</div>
        </div>

        <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#0b2420] to-[#081226] border border-emerald-900/40 shadow-lg transition hover:border-emerald-700/60">
          <div className="text-[11px] font-mono text-gray-400">AREA PELAYARAN DIPANTAU</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1 flex items-center justify-between">
            6 / 6
            <Anchor className="w-5 h-5 text-emerald-500/40" />
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Area AIS utama · bukan hitungan kapal</div>
        </div>

        <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#251d0c] to-[#081226] border border-amber-900/40 shadow-lg transition hover:border-amber-700/60">
          <div className="text-[11px] font-mono text-gray-400">KAPAL AIS TERDETEKSI</div>
          <div className="text-2xl font-bold text-amber-300 font-mono mt-1">{ships.length}</div>
          <div className="text-[10px] text-gray-500 mt-1">
            {shipStreamStatus === 'online' ? 'AISStream tersambung' : shipStreamStatus === 'missing-key' ? 'AISSTREAM_KEY belum disetel' : shipStreamStatus === 'connecting' ? 'Menyambungkan AISStream...' : 'Stream offline · mencoba ulang'}
          </div>
        </div>

        <div className="min-w-0 p-5 rounded-2xl bg-gradient-to-br from-[#22210f] to-[#081226] border border-yellow-900/40 shadow-lg transition hover:border-yellow-700/60">
          <div className="text-[11px] font-mono text-gray-400">JEJAK PERGERAKAN TEREKAM</div>
          <div className="text-2xl font-bold text-yellow-300 font-mono mt-1">{trackedRouteCount}</div>
          <div className="text-[10px] text-gray-500 mt-1">Dari posisi yang diterima selama sesi ini</div>
        </div>
      </div>

      <TransportMap
        flights={flights}
        ships={ships}
        flightTrails={flightTrails}
        shipTrails={shipTrails}
      />

      {/* ─── MARITIME CHOKEPOINTS SECTION ─── */}
      <div className="rounded-xl bg-[#081226] border border-cyan-900/50 p-4">
        <div className="flex items-center gap-2 border-b border-cyan-900/40 pb-3 mb-4">
          <Anchor className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
            Status Koridor Pelayaran & Selat Strategis Dunia (Maritime Chokepoints)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MARITIME_CHOKEPOINTS.map(cp => (
            <div
              key={cp.name}
              className="p-3.5 rounded-lg bg-black/40 border border-cyan-950 hover:border-cyan-800 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white tracking-wide">{cp.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                    cp.status === 'NORMAL'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                      : cp.status.includes('RISIKO')
                      ? 'bg-red-950 text-red-400 border border-red-800/40'
                      : 'bg-yellow-950 text-yellow-400 border border-yellow-800/40'
                  }`}>
                    {cp.status}
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 font-mono mt-1">{cp.region}</div>
                <p className="text-xs text-gray-300 mt-2 leading-relaxed">{cp.desc}</p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-cyan-950/80 flex items-center justify-between text-[10px] font-mono text-gray-500">
                <span>Estimasi: {cp.trafficDaily}</span>
                <span className="text-cyan-600">[{cp.lat.toFixed(2)}, {cp.lng.toFixed(2)}]</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── FLIGHT RADAR SECTION ─── */}
      <div className="rounded-xl bg-[#081226] border border-cyan-900/50 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-cyan-900/40 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold font-mono tracking-wider text-white uppercase">
              Radar Penerbangan Langsung (OpenSky Network ADS-B)
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Cari Callsign atau Negara..."
              value={searchFlight}
              onChange={e => {
                setSearchFlight(e.target.value);
                setFlightPage(0);
              }}
              className="px-3 py-1 rounded bg-black/40 border border-cyan-900/50 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-400 w-full sm:w-64"
            />
            <a
              href="https://id.airnavradar.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded border border-cyan-800/60 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 text-xs font-mono transition whitespace-nowrap"
              aria-label="Buka radar penerbangan AirNavRadar di tab baru"
            >
              AirNavRadar
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
        <p className="mb-3 text-[10px] text-gray-500">
          Posisi pada peta dan tabel menggunakan OpenSky ADS-B; tombol AirNavRadar membuka radar penerbangan resminya di tab baru.
        </p>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          {loading ? (
            <TableSkeleton rows={8} columns={6} />
          ) : flightsError ? (
            <div className="text-center py-12 text-amber-400 text-xs font-mono">
              Gagal memuat data OpenSky: {flightsError}
            </div>
          ) : filteredFlights.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-xs font-mono">
              {flights.length === 0
                ? 'Belum ada posisi pesawat valid dari OpenSky pada pembaruan ini.'
                : 'Tidak ada penerbangan yang cocok dengan pencarian Anda.'}
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] uppercase text-gray-500 bg-black/30 border-b border-cyan-950 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Callsign</th>
                  <th className="py-2 px-3">Asal Negara</th>
                  <th className="py-2 px-3">Ketinggian</th>
                  <th className="py-2 px-3">Kecepatan</th>
                  <th className="py-2 px-3">Heading</th>
                  <th className="py-2 px-3">Koordinat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-950/50">
                {visibleFlights.map(f => (
                  <tr key={f.icao24} className="hover:bg-cyan-950/20 transition">
                    <td className="py-2.5 px-3 font-bold text-cyan-300 flex items-center gap-1.5">
                      <Plane className="w-3 h-3 text-cyan-500 rotate-45" />
                      {f.callsign || f.icao24.toUpperCase()}
                    </td>
                    <td className="py-2.5 px-3 text-gray-300">{f.country}</td>
                    <td className="py-2.5 px-3 text-gray-400">{f.altitude ? `${Math.round(f.altitude)} m` : '-'}</td>
                    <td className="py-2.5 px-3 text-gray-400">{f.velocity ? `${Math.round(f.velocity * 3.6)} km/h` : '-'}</td>
                    <td className="py-2.5 px-3 text-gray-400">{f.heading ? `${Math.round(f.heading)}°` : '-'}</td>
                    <td className="py-2.5 px-3 text-cyan-600 font-mono text-[11px]">
                      {f.lat.toFixed(2)}, {f.lng.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && !flightsError && filteredFlights.length > 0 && (
          <div className="flex items-center justify-between gap-3 pt-3 text-[10px] font-mono text-gray-400">
            <span>
              Update {lastFlightUpdate || '—'} · Menampilkan {flightPage * flightPageSize + 1}–{Math.min((flightPage + 1) * flightPageSize, filteredFlights.length)} dari {filteredFlights.length} pesawat
            </span>
            {pageCount > 1 && (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={flightPage === 0}
                  onClick={() => setFlightPage(page => Math.max(0, page - 1))}
                  className="px-2 py-1 rounded border border-cyan-900 disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <span className="py-1">{flightPage + 1}/{pageCount}</span>
                <button
                  type="button"
                  disabled={flightPage + 1 >= pageCount}
                  onClick={() => setFlightPage(page => Math.min(pageCount - 1, page + 1))}
                  className="px-2 py-1 rounded border border-cyan-900 disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
