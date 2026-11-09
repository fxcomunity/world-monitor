import { useEffect, useRef, useState } from 'react';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import type { LiveFlight, LiveShip } from '../lib/api';

type Track = Record<string, Array<[number, number]>>;

interface TransportMapProps {
  flights: LiveFlight[];
  ships: LiveShip[];
  flightTrails: Track;
  shipTrails: Track;
}

function pointCollection(items: Array<{
  id: string;
  name: string;
  lng: number;
  lat: number;
  detail: string;
}>) {
  return {
    type: 'FeatureCollection' as const,
    features: items.map(item => ({
      type: 'Feature' as const,
      properties: { id: item.id, name: item.name, detail: item.detail },
      geometry: { type: 'Point' as const, coordinates: [item.lng, item.lat] },
    })),
  };
}

function lineCollection(trails: Track) {
  return {
    type: 'FeatureCollection' as const,
    features: Object.entries(trails)
      .filter(([, coordinates]) => coordinates.length > 1)
      .map(([id, coordinates]) => ({
        type: 'Feature' as const,
        properties: { id },
        geometry: { type: 'LineString' as const, coordinates },
      })),
  };
}

export default function TransportMap({
  flights,
  ships,
  flightTrails,
  shipTrails,
}: TransportMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let map: MapLibreMap | null = null;

    const initialize = async () => {
      try {
        const [configResponse, maplibregl] = await Promise.all([
          fetch('/api/config', { cache: 'no-store' }),
          import('maplibre-gl').then(module => module.default),
        ]);
        if (!configResponse.ok) throw new Error(`Konfigurasi peta HTTP ${configResponse.status}`);
        const config = await configResponse.json() as { maptilerKey?: string };
        if (!config.maptilerKey) throw new Error('MapTiler belum dikonfigurasi untuk peta transportasi.');
        if (!active || !containerRef.current) return;

        map = new maplibregl.Map({
          container: containerRef.current,
          style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${encodeURIComponent(config.maptilerKey)}`,
          center: [12, 18],
          zoom: 1.6,
          attributionControl: false,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
        map.on('load', () => {
          if (!active || !map) return;
          map.addSource('flight-points', {
            type: 'geojson',
            data: pointCollection([]),
          });
          map.addSource('ship-points', {
            type: 'geojson',
            data: pointCollection([]),
          });
          map.addSource('flight-trails', {
            type: 'geojson',
            data: lineCollection({}),
          });
          map.addSource('ship-trails', {
            type: 'geojson',
            data: lineCollection({}),
          });
          map.addLayer({
            id: 'flight-trail-lines',
            type: 'line',
            source: 'flight-trails',
            paint: { 'line-color': '#22d3ee', 'line-width': 1.5, 'line-opacity': 0.55 },
          });
          map.addLayer({
            id: 'ship-trail-lines',
            type: 'line',
            source: 'ship-trails',
            paint: { 'line-color': '#fbbf24', 'line-width': 1.5, 'line-opacity': 0.65 },
          });
          map.addLayer({
            id: 'flight-point-circles',
            type: 'circle',
            source: 'flight-points',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 2, 6, 4],
              'circle-color': '#22d3ee',
              'circle-stroke-color': '#082f49',
              'circle-stroke-width': 1,
            },
          });
          map.addLayer({
            id: 'ship-point-circles',
            type: 'circle',
            source: 'ship-points',
            paint: {
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 2, 6, 5],
              'circle-color': '#fbbf24',
              'circle-stroke-color': '#451a03',
              'circle-stroke-width': 1,
            },
          });
          map.addLayer({
            id: 'transport-labels',
            type: 'symbol',
            source: 'ship-points',
            minzoom: 4,
            layout: {
              'text-field': ['get', 'name'],
              'text-size': 10,
              'text-offset': [0, 1],
              'text-allow-overlap': false,
            },
            paint: {
              'text-color': '#fde68a',
              'text-halo-color': '#111827',
              'text-halo-width': 1,
            },
          });
          setMapReady(true);
        });
        map.on('error', event => {
          if (active && event.error) {
            console.error('Transport map error:', event.error);
            setMapError('Peta gagal memuat gaya peta. Periksa koneksi atau konfigurasi MapTiler.');
          }
        });
      } catch (error) {
        if (!active) return;
        console.error('Failed to initialize transport map:', error);
        setMapError(error instanceof Error ? error.message : 'Peta transportasi gagal dimuat.');
      }
    };

    void initialize();
    return () => {
      active = false;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;
    const flightSource = map.getSource('flight-points') as GeoJSONSource | undefined;
    const shipSource = map.getSource('ship-points') as GeoJSONSource | undefined;
    const flightTrailSource = map.getSource('flight-trails') as GeoJSONSource | undefined;
    const shipTrailSource = map.getSource('ship-trails') as GeoJSONSource | undefined;

    flightSource?.setData(pointCollection(flights.slice(0, 1200).map(flight => ({
      id: flight.icao24,
      name: flight.callsign || flight.icao24.toUpperCase(),
      lng: flight.lng,
      lat: flight.lat,
      detail: flight.country,
    }))));
    shipSource?.setData(pointCollection(ships.map(ship => ({
      id: ship.mmsi,
      name: ship.name || ship.mmsi,
      lng: ship.lng,
      lat: ship.lat,
      detail: ship.speed === null ? 'Posisi AIS' : `${ship.speed.toFixed(1)} kn`,
    }))));
    flightTrailSource?.setData(lineCollection(flightTrails));
    shipTrailSource?.setData(lineCollection(shipTrails));
  }, [flightTrails, flights, mapReady, shipTrails, ships]);

  return (
    <section className="rounded-xl bg-[#081226] border border-cyan-900/50 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-b border-cyan-900/40">
        <div>
          <h2 className="text-xs font-bold font-mono tracking-wider text-white uppercase">Peta Pergerakan Live</h2>
          <p className="text-[10px] text-gray-500 mt-1">Jejak garis dibuat dari sampel posisi yang diterima selama halaman terbuka.</p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="flex items-center gap-1.5 text-cyan-300"><i className="w-2 h-2 rounded-full bg-cyan-400" /> Pesawat</span>
          <span className="flex items-center gap-1.5 text-amber-300"><i className="w-2 h-2 rounded-full bg-amber-400" /> Kapal AIS</span>
        </div>
      </div>
      <div className="relative h-[360px] sm:h-[480px]">
        <div ref={containerRef} className="absolute inset-0" />
        {!mapReady && (
          <div className="absolute inset-0 grid place-items-center bg-[#050B18]/90 text-center p-5 pointer-events-none">
            <div className="space-y-2">
              <div className="mx-auto w-36 h-2 rounded bg-cyan-900/50 animate-pulse" />
              <div className="mx-auto w-52 h-2 rounded bg-cyan-900/30 animate-pulse" />
              <p className="text-[10px] text-gray-500">{mapError || 'Memuat peta dan data posisi...'}</p>
            </div>
          </div>
        )}
        {mapReady && (
          <div className="absolute left-3 bottom-3 rounded-lg bg-black/75 border border-cyan-900/50 px-2.5 py-2 text-[10px] font-mono text-gray-300 pointer-events-none">
            {flights.length.toLocaleString('id-ID')} pesawat · {ships.length.toLocaleString('id-ID')} kapal di area AIS
          </div>
        )}
      </div>
    </section>
  );
}
