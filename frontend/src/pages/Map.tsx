import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import Globe from 'globe.gl';
import {
  RefreshCw, Navigation, Layers, RotateCcw,
  ZoomIn, ZoomOut, Eye, EyeOff, Radio, Globe as GlobeIcon, X, Sun, Moon,
  Menu, Maximize2, Minimize2, Sparkles, Orbit, Compass, Activity, CloudRain, MapPin
} from 'lucide-react';
import { fetchDisasters, fetchEarthquakes } from '../lib/api';
import './Map.css';

// ─── Kategori & Styling Teknis ─────────────────────────────────────────────
interface CategoryMeta {
  color: string;
  badge: string;
  label: string;
  layerGroup: 'disaster' | 'weather' | 'energy' | 'other';
}

const CATEGORY_MAP: Record<string, CategoryMeta> = {
  Wildfires: {
    color: '#ff5722',
    badge: 'FIRE',
    label: 'Wildfire Incident',
    layerGroup: 'disaster',
  },
  'Severe Storms': {
    color: '#00e5ff',
    badge: 'STORM',
    label: 'Tropical Storm',
    layerGroup: 'weather',
  },
  Volcanoes: {
    color: '#f44336',
    badge: 'VOLCANO',
    label: 'Volcano Eruption',
    layerGroup: 'disaster',
  },
  Floods: {
    color: '#38bdf8',
    badge: 'FLOOD',
    label: 'Flood Alert',
    layerGroup: 'weather',
  },
  Earthquakes: {
    color: '#ffb300',
    badge: 'SEISMIC',
    label: 'Gempa bumi',
    layerGroup: 'disaster',
  },
  Landslides: {
    color: '#c084fc',
    badge: 'SLIDE',
    label: 'Landslide Anomaly',
    layerGroup: 'disaster',
  },
  'Sea and Lake Ice': {
    color: '#93c5fd',
    badge: 'ICE',
    label: 'Cryosphere Shift',
    layerGroup: 'weather',
  },
  default: {
    color: '#94a3b8',
    badge: 'EVENT',
    label: 'Global Anomaly',
    layerGroup: 'other',
  },
};

function getCategoryMeta(cat: string): CategoryMeta {
  return CATEGORY_MAP[cat] || CATEGORY_MAP.default;
}

interface WMEvent {
  id: string;
  title: string;
  category: string;
  lat: number;
  lng: number;
  magnitude?: number;
  source: string;
}

interface CountryFeature {
  properties: {
    ADMIN: string;
    NAME_LONG?: string;
    ISO_A2?: string;
    ISO_A3?: string;
    CONTINENT?: string;
    SUBREGION?: string;
    POP_EST?: number;
    GDP_MD_EST?: number;
    ECONOMY?: string;
    INCOME_GRP?: string;
    REGION_UN?: string;
  };
  geometry: any;
}

const LAYER_PRESETS = [
  { id: 'disaster', label: 'Bencana & Gempa', color: '#ff5722' },
  { id: 'weather',  label: 'Badai & Cuaca',   color: '#00e5ff' },
  { id: 'energy',   label: 'Energi Global',   color: '#ffb300' },
  { id: 'other',    label: 'Anomali Lain',    color: '#818cf8' },
];

export type GlobeTheme = 'DAY_NIGHT' | 'CYBER_GRID' | 'BLUE_MARBLE' | 'NIGHT_CITIES';

// ─── Procedural Canvas Texture Generator untuk Objek Tata Surya ───────────
function createSunTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.2, '#fff2a3');
  grad.addColorStop(0.5, '#ffaa00');
  grad.addColorStop(0.8, '#ff5500');
  grad.addColorStop(1, '#991100');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Flare noise spots
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 20 + 5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

function createMarsTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b7410e';
  ctx.fillRect(0, 0, 512, 256);

  // Craters & dark rust bands
  ctx.fillStyle = '#8a2b00';
  for (let i = 0; i < 30; i++) {
    const y = Math.random() * 180 + 38;
    const h = Math.random() * 25 + 5;
    ctx.fillRect(0, y, 512, h);
  }

  // Polar Ice Caps
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, 512, 22);
  ctx.fillRect(0, 234, 512, 22);

  return new THREE.CanvasTexture(canvas);
}

function createMoonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#78716c';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#44403c';
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = Math.random() * 14 + 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

function createJupiterTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const colors = ['#c28b5e', '#e7c697', '#935832', '#d9af82', '#a66b42', '#edd5b3'];
  for (let y = 0; y < 256; y += 8) {
    ctx.fillStyle = colors[(y / 8) % colors.length];
    ctx.fillRect(0, y, 512, 8);
  }
  // Great Red Spot
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.ellipse(340, 160, 28, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  return new THREE.CanvasTexture(canvas);
}

export default function GoogleEarthGlobeMap() {
  const globeContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeInstanceRef = useRef<any>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial | null>(null);
  const solarGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // States
  const [events, setEvents] = useState<WMEvent[]>([]);
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [activeLayers, setActiveLayers] = useState<string[]>(['disaster', 'weather', 'energy', 'other']);
  const [selectedEvent, setSelectedEvent] = useState<WMEvent | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryFeature['properties'] | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<CountryFeature | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const resizeGlobeRef = useRef<(() => void) | null>(null);
  const streamModeRef = useRef<'collapsed' | 'normal' | 'expanded'>('normal');
  const reducedMotion = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [isRotating, setIsRotating] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  
  // Hamburger / Drawer mode untuk Stream Incidents: 'collapsed' | 'normal' | 'expanded'
  const [streamMode, setStreamMode] = useState<'collapsed' | 'normal' | 'expanded'>('normal');
  const [streamSearch, setStreamSearch] = useState<string>('');
  
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [showThemeMenu, setShowThemeMenu] = useState<boolean>(false);
  const [globeTheme, setGlobeTheme] = useState<GlobeTheme>('DAY_NIGHT');
  const [sunAngle, setSunAngle] = useState<number>(45);

  // Tata Surya (Solar System) Mode
  const [solarSystemActive, setSolarSystemActive] = useState<boolean>(false);
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);

  // ─── 1. Load GeoJSON Batas Negara HD ──────────────────────────────────────
  useEffect(() => {
    fetch('https://unpkg.com/three-globe/example/country-polygons/ne_110m_admin_0_countries.geojson')
      .then(r => r.json())
      .then(data => {
        if (data?.features) {
          setCountries(data.features);
        }
      })
      .catch(err => console.error('Error fetching country boundaries:', err));
  }, []);

  // ─── 2. Fetch Data Real (NASA + USGS) ────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [disRes, quakeRes] = await Promise.allSettled([
        fetchDisasters(),
        fetchEarthquakes(),
      ]);

      const items: WMEvent[] = [];

      if (disRes.status === 'fulfilled') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        disRes.value.forEach((d: any) => {
          if (d.lat != null && d.lng != null) {
            items.push({
              id: d.id,
              title: d.title,
              category: d.category,
              lat: Number(d.lat),
              lng: Number(d.lng),
              source: 'NASA EONET',
            });
          }
        });
      }

      if (quakeRes.status === 'fulfilled') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        quakeRes.value.forEach((q: any) => {
          items.push({
            id: q.id,
            title: `M${q.magnitude.toFixed(1)} ${q.place}`,
            category: 'Earthquakes',
            lat: Number(q.lat),
            lng: Number(q.lng),
            magnitude: q.magnitude,
            source: 'USGS',
          });
        });
      }

      const failedSources = [
        disRes.status === 'rejected' ? 'NASA EONET' : '',
        quakeRes.status === 'rejected' ? 'USGS' : '',
      ].filter(Boolean);
      setDataError(failedSources.length ? `Data ${failedSources.join(' & ')} belum tersedia. Coba muat ulang.` : '');
      if (failedSources.length < 2) {
        setEvents(items);
        setLastUpdated(new Date());
        setSelectedEvent(current => current ? items.find(item => item.id === current.id) || null : null);
      }
    } catch (err) {
      console.error('Error fetching live data:', err);
      setDataError('Data belum dapat dimuat. Periksa koneksi dan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = window.setInterval(loadData, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [loadData]);

  // ─── 3. Inisialisasi globe.gl & Tata Surya (Solar System 3D) ───────────────
  useEffect(() => {
    const container = globeContainerRef.current;
    if (!container) return;

    // Load Tekstur Siang & Malam NASA
    const textureLoader = new THREE.TextureLoader();
    const dayTex = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');
    const nightTex = textureLoader.load('https://unpkg.com/three-globe/example/img/earth-night.jpg');
    dayTex.colorSpace = THREE.SRGBColorSpace;
    nightTex.colorSpace = THREE.SRGBColorSpace;

    // Sinar Matahari Awal
    const sunDir = new THREE.Vector3(1.2, 0.25, 0.9).normalize();

    // Custom Shader: Day/Night Terminator seperti Google Earth
    const dayNightMaterial = new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTex },
        nightTexture: { value: nightTex },
        sunDirection: { value: sunDir },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldNormal;

        void main() {
          vUv = uv;
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;
        uniform vec3 sunDirection;

        varying vec2 vUv;
        varying vec3 vWorldNormal;

        void main() {
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv);

          float dProd = dot(vWorldNormal, sunDirection);
          float dayFactor = smoothstep(-0.15, 0.20, dProd);

          float twilight = (1.0 - abs(dProd * 4.5));
          twilight = clamp(twilight, 0.0, 1.0) * (1.0 - dayFactor);
          vec3 sunsetGlow = vec3(1.0, 0.45, 0.12) * twilight * 0.45;

          vec3 finalColor = mix(nightColor.rgb * 1.6, dayColor.rgb, dayFactor) + sunsetGlow;
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });

    shaderMatRef.current = dayNightMaterial;

    // Instance globe.gl
    const globe = new Globe(container)
      .globeMaterial(dayNightMaterial)
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundColor('#040b17')
      .atmosphereColor('#38bdf8')
      .atmosphereAltitude(0.24)
      // ── Poligon Batas Negara Interaktif ──
      .polygonAltitude((feat: any) => (feat === hoveredCountry ? 0.05 : 0.012))
      .polygonCapColor((feat: any) => {
        if (feat === hoveredCountry) return 'rgba(0, 229, 255, 0.45)';
        if (selectedCountry && feat.properties.ADMIN === selectedCountry.ADMIN) {
          return 'rgba(0, 229, 255, 0.35)';
        }
        return 'rgba(2, 25, 60, 0.12)';
      })
      .polygonSideColor(() => 'rgba(0, 229, 255, 0.25)')
      .polygonStrokeColor((feat: any) => {
        if (feat === hoveredCountry) return '#00e5ff';
        if (selectedCountry && feat.properties.ADMIN === selectedCountry.ADMIN) return '#38bdf8';
        return 'rgba(0, 229, 255, 0.35)';
      })
      .polygonLabel(({ properties: d }: any) => `
        <div style="background: rgba(3,9,30,0.92); border: 1px solid #00e5ff; padding: 8px 12px; border-radius: 8px; font-family: monospace; font-size: 11px; color: #fff; box-shadow: 0 0 15px rgba(0,229,255,0.4);">
          <div style="color: #00e5ff; font-weight: bold; font-size: 13px;">${d.ADMIN}</div>
          <div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">${d.REGION_UN || d.CONTINENT || 'Global'} • ${d.ISO_A2 || d.ISO_A3 || ''}</div>
          ${d.POP_EST ? `<div style="color: #cbd5e1; font-size: 10px; margin-top: 4px;">Populasi: ${(d.POP_EST / 1e6).toFixed(1)} Juta</div>` : ''}
          <div style="color: #38bdf8; font-size: 9px; margin-top: 4px;">KLIK NEGARA UNTUK INSPEKSI INTELIJEN &rarr;</div>
        </div>
      `)
      .onPolygonHover((feat: any) => {
        setHoveredCountry(feat || null);
      })
      .onPolygonClick(({ properties: d }: any) => {
        setSelectedCountry(d);
        setSelectedEvent(null);
        setSelectedPlanet(null);
      })
      // ── Pin Points ──
      .pointLat('lat')
      .pointLng('lng')
      .pointColor((d: any) => getCategoryMeta(d.category).color)
      .pointAltitude(0.06)
      .pointRadius(0.7)
      .pointResolution(24)
      .pointLabel((d: any) => {
        const meta = getCategoryMeta(d.category);
        return `
          <div style="background: rgba(3,9,30,0.95); border: 1px solid ${meta.color}; padding: 8px 12px; border-radius: 8px; font-family: monospace; font-size: 11px; color: #fff; box-shadow: 0 0 15px ${meta.color}40;">
            <div style="color: ${meta.color}; font-weight: bold; margin-bottom: 3px;">[${meta.badge}] ${meta.label.toUpperCase()}</div>
            <div style="font-size: 12px; max-width: 220px; line-height: 1.3;">${d.title}</div>
            <div style="color: #64748b; font-size: 10px; margin-top: 4px;">LAT/LNG: ${d.lat.toFixed(2)}, ${d.lng.toFixed(2)} • ${d.source}</div>
          </div>
        `;
      })
      .onPointClick((d: any) => {
        flyToEvent(d);
      })
      // ── Radar Rings ──
      .ringLat('lat')
      .ringLng('lng')
      .ringColor((d: any) => {
        const c = getCategoryMeta(d.category).color;
        return (t: number) => `rgba(${parseInt(c.slice(1,3),16)}, ${parseInt(c.slice(3,5),16)}, ${parseInt(c.slice(5,7),16)}, ${1 - t})`;
      })
      .ringMaxRadius(3.8)
      .ringPropagationSpeed(2.2)
      .ringRepeatPeriod(900);

    // Initial camera viewpoint
    globe.pointOfView({ lat: 10, lng: 115, altitude: 2.2 }, 0);

    // Controls
    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = !reducedMotion.current;
      controls.autoRotateSpeed = 0.6;
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
    }

    // ─── 4. BANGUN TATA SURYA 3D (SOLAR SYSTEM & CELESTIAL BODIES) ───────────
    const scene: THREE.Scene = globe.scene();
    const solarGroup = new THREE.Group();
    solarGroup.name = 'SolarSystemGroup';
    solarGroup.visible = false;

    // A. 3D Stars Field (5,000 Partikel Bintang Kosmis)
    const starCount = 4500;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 600 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPos[i * 3]     = radius * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPos[i * 3 + 2] = radius * Math.cos(phi);

      // Variasi temperatur warna bintang: Putih, Biru, Emas, Merah
      const type = Math.random();
      if (type > 0.8) {
        starColors[i * 3] = 0.7; starColors[i * 3 + 1] = 0.85; starColors[i * 3 + 2] = 1.0; // Biru
      } else if (type > 0.6) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.85; starColors[i * 3 + 2] = 0.5; // Emas
      } else if (type > 0.5) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.4; starColors[i * 3 + 2] = 0.3; // Merah
      } else {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 1.0; starColors[i * 3 + 2] = 1.0; // Putih
      }
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeo, starMat);
    solarGroup.add(starField);

    // B. MATAHARI (The Sun) — Radius ~420 dari Bumi
    const sunGeo = new THREE.SphereGeometry(35, 32, 32);
    const sunTex = createSunTexture();
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTex,
      color: 0xfff0aa,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.name = 'Matahari';
    sunMesh.position.set(380, 50, 200);

    // Glowing Corona Halo untuk Matahari
    const coronaGeo = new THREE.SphereGeometry(44, 32, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    sunMesh.add(coronaMesh);

    // Cahaya Matahari
    const sunLight = new THREE.PointLight(0xfff3d0, 2.5, 2000, 0.4);
    sunMesh.add(sunLight);
    solarGroup.add(sunMesh);

    // C. BULAN (The Moon) — Mengorbit Bumi pada jarak ~85
    const moonGeo = new THREE.SphereGeometry(6, 24, 24);
    const moonMat = new THREE.MeshStandardMaterial({
      map: createMoonTexture(),
      roughness: 0.9,
      metalness: 0.1,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.name = 'Bulan';
    moonMesh.position.set(85, 10, 0);
    solarGroup.add(moonMesh);

    // Jalur Orbit Bulan
    const moonOrbitGeo = new THREE.RingGeometry(84.6, 85.4, 64);
    const orbitMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
    });
    const moonOrbit = new THREE.Mesh(moonOrbitGeo, orbitMat);
    moonOrbit.rotation.x = Math.PI / 2;
    solarGroup.add(moonOrbit);

    // D. PLANET MARS (Planet Merah) — Pada jarak orbit ~240
    const marsGeo = new THREE.SphereGeometry(12, 32, 32);
    const marsMat = new THREE.MeshStandardMaterial({
      map: createMarsTexture(),
      roughness: 0.8,
    });
    const marsMesh = new THREE.Mesh(marsGeo, marsMat);
    marsMesh.name = 'Mars';
    marsMesh.position.set(-230, -15, 120);

    // Mars Atmosphere Glow
    const marsAtmoGeo = new THREE.SphereGeometry(13.2, 32, 32);
    const marsAtmoMat = new THREE.MeshBasicMaterial({
      color: 0xd97706,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
    });
    marsMesh.add(new THREE.Mesh(marsAtmoGeo, marsAtmoMat));
    solarGroup.add(marsMesh);

    // Jalur Orbit Mars
    const marsOrbitGeo = new THREE.RingGeometry(258, 260, 96);
    const marsOrbitMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
    });
    const marsOrbit = new THREE.Mesh(marsOrbitGeo, marsOrbitMat);
    marsOrbit.rotation.x = Math.PI / 2;
    solarGroup.add(marsOrbit);

    // E. PLANET JUPITER (Raksasa Gas) — Pada jarak ~420
    const jupiterGeo = new THREE.SphereGeometry(26, 32, 32);
    const jupiterMat = new THREE.MeshStandardMaterial({
      map: createJupiterTexture(),
      roughness: 0.7,
    });
    const jupiterMesh = new THREE.Mesh(jupiterGeo, jupiterMat);
    jupiterMesh.name = 'Jupiter';
    jupiterMesh.position.set(160, -40, -380);
    solarGroup.add(jupiterMesh);

    scene.add(solarGroup);
    solarGroupRef.current = solarGroup;

    // ─── ANIMATION LOOP TATA SURYA ───────────────────────────────────────────
    let orbitTick = 0;
    const animateSolar = () => {
      if (solarGroup.visible && !reducedMotion.current) orbitTick += 0.0035;

      // Rotasi Bulan mengelilingi Bumi
      const moonR = 85;
      moonMesh.position.x = Math.cos(orbitTick * 1.5) * moonR;
      moonMesh.position.z = Math.sin(orbitTick * 1.5) * moonR;
      moonMesh.position.y = Math.sin(orbitTick * 0.75) * 12;
      moonMesh.rotation.y += 0.005;

      // Rotasi Mars di orbitnya
      const marsR = 260;
      marsMesh.position.x = Math.cos(orbitTick * 0.6 + 1.2) * marsR;
      marsMesh.position.z = Math.sin(orbitTick * 0.6 + 1.2) * marsR;
      marsMesh.rotation.y += 0.008;

      // Rotasi Jupiter
      const jupiterR = 410;
      jupiterMesh.position.x = Math.cos(orbitTick * 0.3 - 0.8) * jupiterR;
      jupiterMesh.position.z = Math.sin(orbitTick * 0.3 - 0.8) * jupiterR;
      jupiterMesh.rotation.y += 0.012;

      // Rotasi Matahari pada porosnya
      sunMesh.rotation.y += 0.002;

      animFrameIdRef.current = requestAnimationFrame(animateSolar);
    };

    animFrameIdRef.current = requestAnimationFrame(animateSolar);

    globeInstanceRef.current = globe;

    // Resize handler
    const updateCentering = () => {
      if (container && globe) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        globe.width(w);
        globe.height(h);

        const cam = globe.camera() as any;
        if (cam) {
          if (streamModeRef.current === 'normal' && w > 1024) {
            cam.setViewOffset(w, h, -160, 0, w, h);
          } else if (streamModeRef.current === 'expanded' && w > 1024) {
            cam.setViewOffset(w, h, -240, 0, w, h);
          } else if (cam.clearViewOffset) {
            cam.clearViewOffset();
          }
          if (cam.updateProjectionMatrix) {
            cam.updateProjectionMatrix();
          }
        }
      }
    };

    resizeGlobeRef.current = updateCentering;
    updateCentering();
    const resizeObserver = new ResizeObserver(updateCentering);
    resizeObserver.observe(container);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      resizeGlobeRef.current = null;
      globe._destructor();
      dayTex.dispose();
      nightTex.dispose();
      dayNightMaterial.dispose();
      container.innerHTML = '';
      globeInstanceRef.current = null;
      shaderMatRef.current = null;
      solarGroupRef.current = null;
    };
  }, []);

  useEffect(() => {
    streamModeRef.current = streamMode;
    resizeGlobeRef.current?.();
  }, [streamMode]);

  // ─── Toggle Tampilan Tata Surya ───────────────────────────────────────────
  useEffect(() => {
    if (solarGroupRef.current) {
      solarGroupRef.current.visible = solarSystemActive;
    }
  }, [solarSystemActive]);

  // ─── Ganti Globe Theme / Skin ─────────────────────────────────────────────
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    if (globeTheme === 'DAY_NIGHT') {
      if (shaderMatRef.current) {
        globe.globeMaterial(shaderMatRef.current);
      }
      globe.atmosphereColor('#38bdf8');
    } else if (globeTheme === 'CYBER_GRID') {
      // Holographic Neon Wireframe Cyberpunk Globe
      const cyberMat = new THREE.MeshStandardMaterial({
        color: 0x051329,
        roughness: 0.3,
        metalness: 0.8,
        wireframe: false,
      });
      globe.globeMaterial(cyberMat);
      globe.atmosphereColor('#00e5ff');
    } else if (globeTheme === 'BLUE_MARBLE') {
      const tex = new THREE.TextureLoader().load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg');
      tex.colorSpace = THREE.SRGBColorSpace;
      globe.globeMaterial(new THREE.MeshStandardMaterial({ map: tex }));
      globe.atmosphereColor('#60a5fa');
    } else if (globeTheme === 'NIGHT_CITIES') {
      const tex = new THREE.TextureLoader().load('https://unpkg.com/three-globe/example/img/earth-night.jpg');
      tex.colorSpace = THREE.SRGBColorSpace;
      globe.globeMaterial(new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex }));
      globe.atmosphereColor('#818cf8');
    }
  }, [globeTheme]);

  // ─── Update Sinar Matahari Saat Angle Berubah ─────────────────────────────
  useEffect(() => {
    if (shaderMatRef.current) {
      const rad = (sunAngle * Math.PI) / 180;
      const x = Math.cos(rad) * 1.5;
      const z = Math.sin(rad) * 1.5;
      shaderMatRef.current.uniforms.sunDirection.value.set(x, 0.25, z).normalize();
    }
  }, [sunAngle]);

  // ─── Sync Country Polygons ────────────────────────────────────────────────
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe || countries.length === 0) return;
    globe.polygonsData(countries);
  }, [countries]);

  // ─── Sync Events ──────────────────────────────────────────────────────────
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    const visibleEvents = events.filter((ev) => {
      const meta = getCategoryMeta(ev.category);
      return activeLayers.includes(meta.layerGroup);
    });

    globe.pointsData(visibleEvents);
    globe.ringsData(visibleEvents);
  }, [events, activeLayers]);

  // ─── Sync Auto Rotate ─────────────────────────────────────────────────────
  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (globe && globe.controls()) {
      globe.controls().autoRotate = isRotating;
    }
  }, [isRotating]);

  // ─── Fly to Event Camera Animation ────────────────────────────────────────
  const flyToEvent = (ev: WMEvent) => {
    setSelectedEvent(ev);
    setSelectedCountry(null);
    setSelectedPlanet(null);
    const globe = globeInstanceRef.current;
    if (!globe) return;

    globe.pointOfView(
      {
        lat: ev.lat,
        lng: ev.lng,
        altitude: 1.3,
      },
      1200
    );
  };

  // ─── Focus Camera ke Objek Tata Surya ─────────────────────────────────────
  const focusCelestialObject = (name: string) => {
    setSelectedPlanet(name);
    setSelectedEvent(null);
    setSelectedCountry(null);
    const globe = globeInstanceRef.current;
    if (!globe) return;

    if (name === 'Bumi') {
      globe.pointOfView({ lat: 10, lng: 115, altitude: 2.2 }, 1000);
    } else if (name === 'Bulan') {
      globe.pointOfView({ lat: 0, lng: 0, altitude: 3.5 }, 1200);
    } else if (name === 'Mars') {
      globe.pointOfView({ lat: -15, lng: 120, altitude: 4.2 }, 1400);
    } else if (name === 'Matahari') {
      globe.pointOfView({ lat: 20, lng: -45, altitude: 4.5 }, 1400);
    } else if (name === 'Jupiter') {
      globe.pointOfView({ lat: -30, lng: -120, altitude: 4.8 }, 1500);
    }
  };

  const toggleLayer = (id: string) => {
    setActiveLayers(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  const visibleEvents = events.filter(e => activeLayers.includes(getCategoryMeta(e.category).layerGroup));
  const filteredEvents = visibleEvents.filter(e =>
    !streamSearch || e.title.toLowerCase().includes(streamSearch.toLowerCase()) || e.category.toLowerCase().includes(streamSearch.toLowerCase())
  );
  const earthquakeCount = events.filter(e => e.category === 'Earthquakes').length;
  const weatherCount = events.filter(e => getCategoryMeta(e.category).layerGroup === 'weather').length;

  const selectedMeta = selectedEvent ? getCategoryMeta(selectedEvent.category) : null;

  return (
    <div className="map-experience">
          <div className="map-ambient" aria-hidden="true" />
          <header className="map-heading">
            <div>
              <span className="map-eyebrow">EXPLORE THE WORLD · LIVE INTELLIGENCE</span>
              <h1>Dunia bergerak. Tetap terhubung.</h1>
              <p>Jelajahi bumi dan pantau peristiwa global dalam satu pandangan.</p>
            </div>
            <div className="map-heading-status" role="status">
              {!loading && !dataError && <span className="map-live-dot" />}
              {loading ? 'Menyinkronkan data…' : dataError ? 'Sebagian data belum tersedia' : 'Pemantauan global aktif'}
            </div>
          </header>
      {/* ─── 1. KANVAS 3D GLOBE DENGAN DAY & NIGHT TERMINATOR & TATA SURYA ─── */}
      <div
        ref={globeContainerRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* ─── 2. FLOATING HUD KIRI ATAS: BRANDING & KONTROL MODE ─── */}
      <div className="map-workspace-tools">
        <div className="map-brand-card">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00e5ff] flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-xs font-bold tracking-widest text-white uppercase flex items-center gap-2 flex-wrap">
              <span>LIVE WORLD MAP</span>
              <span className="text-[9px] text-amber-300 border border-amber-600/70 px-1.5 py-0.2 rounded bg-amber-950/60 font-bold">
                {globeTheme.replace('_', ' ')}
              </span>
              {solarSystemActive && (
                <span className="text-[9px] text-cyan-300 border border-cyan-500/60 px-1.5 py-0.2 rounded bg-cyan-950/60 font-bold flex items-center gap-1">
                  <Orbit className="w-3 h-3 text-cyan-400" />
                  TATA SURYA AKTIF
                </span>
              )}
            </div>
            <div className="text-[10px] text-gray-400 truncate">
              {countries.length || '—'} negara · {visibleEvents.length} peristiwa ditampilkan
            </div>
          </div>
        </div>

        {/* Action Toolbar: Rotasi, Tema Globe, Tata Surya, dan Layers */}
        <div className="map-toolbar" role="group" aria-label="Pengaturan globe">
          {/* Rotasi ON/OFF */}
          <button
            onClick={() => setIsRotating(!isRotating)}
            aria-pressed={isRotating}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-md transition-all ${
              isRotating
                ? 'bg-cyan-950/60 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(0,229,255,0.25)]'
                : 'bg-black/40 border-gray-800 text-gray-500 hover:text-gray-300'
            }`}
          >
            {isRotating ? 'ROTASI: ON' : 'ROTASI: OFF'}
          </button>

          {/* Ganti Tema Globe / Model Peta */}
          <button
            onClick={() => { setShowThemeMenu(!showThemeMenu); setShowLayerMenu(false); }}
            aria-expanded={showThemeMenu}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-950/60 border border-blue-700/60 hover:border-blue-400 backdrop-blur-md transition"
            title="Pilih Model Globe yang Lain"
          >
            <GlobeIcon className="w-3.5 h-3.5 text-blue-400" />
            TEMA GLOBE
          </button>

          {/* Toggle Tata Surya 3D */}
          <button
            onClick={() => setSolarSystemActive(!solarSystemActive)}
            aria-pressed={solarSystemActive}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-md transition ${
              solarSystemActive
                ? 'bg-amber-950/60 border-amber-500/70 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'bg-black/40 border-gray-800 text-gray-500'
            }`}
            title="Nyalakan / Matikan Objek Tata Surya 3D (Matahari, Mars, Bulan, Bintang)"
          >
            <Orbit className="w-3.5 h-3.5 text-amber-400" />
            TATA SURYA
          </button>

          {/* Geser Posisi Matahari */}
          {globeTheme === 'DAY_NIGHT' && (
            <button
              onClick={() => setSunAngle((prev) => (prev + 45) % 360)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-amber-700/60 bg-amber-950/40 text-amber-300 hover:border-amber-400 backdrop-blur-md transition"
              title="Ubah posisi datang sinar matahari (Siang & Malam)"
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              {sunAngle}°
            </button>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            aria-label="Perbarui data insiden"
            title="Perbarui data insiden"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-cyan-400 bg-[#040d21]/80 border border-cyan-800/60 hover:border-cyan-400 backdrop-blur-md transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => { setShowLayerMenu(!showLayerMenu); setShowThemeMenu(false); }}
            aria-expanded={showLayerMenu}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border backdrop-blur-md transition ${
              showLayerMenu
                ? 'bg-cyan-500 text-black border-cyan-400'
                : 'bg-[#040d21]/80 border-cyan-800/60 text-cyan-400 hover:border-cyan-400'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            FILTER
          </button>
        </div>

        {/* Dropdown Pilihan Model Globe */}
        {showThemeMenu && (
          <div className="p-3 rounded-xl bg-[#03091e]/95 backdrop-blur-xl border border-blue-500/40 shadow-2xl space-y-1.5 w-60 mt-1">
            <div className="text-[10px] text-blue-300 font-bold tracking-wider mb-2 uppercase flex items-center justify-between">
              <span>PILIH MODEL GLOBE</span>
              <button onClick={() => setShowThemeMenu(false)} className="text-gray-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {[
              { id: 'DAY_NIGHT', label: 'NASA Day & Night (Realistis)', desc: 'Terminator fajar/senja aktif' },
              { id: 'CYBER_GRID', label: 'Cyberpunk Hologram (Neon)', desc: 'Matriks gelap futuristik' },
              { id: 'BLUE_MARBLE', label: 'NASA Blue Marble Klasik', desc: 'Satelit atmosfer siang hari' },
              { id: 'NIGHT_CITIES', label: 'Earth at Night (Lampu Kota)', desc: 'Gemerlap metropolitan dunia' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => {
                  setGlobeTheme(t.id as GlobeTheme);
                  setShowThemeMenu(false);
                }}
                className={`w-full text-left p-2 rounded-lg border text-xs transition ${
                  globeTheme === t.id
                    ? 'bg-blue-900/40 border-blue-400 text-white font-bold'
                    : 'bg-black/40 border-gray-800 text-gray-400 hover:text-white hover:border-blue-800'
                }`}
              >
                <div className="text-[11px] text-white">{t.label}</div>
                <div className="text-[9px] text-gray-500">{t.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* Dropdown Filter Layer */}
        {showLayerMenu && (
          <div className="p-3 rounded-xl bg-[#03091e]/95 backdrop-blur-xl border border-cyan-500/40 shadow-2xl space-y-1.5 w-52 mt-1">
            <div className="text-[10px] text-gray-400 font-bold tracking-wider mb-2">ACTIVE LAYERS FILTER</div>
            {LAYER_PRESETS.map((lp) => {
              const active = activeLayers.includes(lp.id);
              return (
                <button
                  key={lp.id}
                  onClick={() => toggleLayer(lp.id)}
                  style={{
                    borderColor: active ? lp.color : '#1e293b',
                    color: active ? lp.color : '#64748b',
                    background: active ? `${lp.color}15` : 'transparent',
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-bold transition text-left"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: active ? lp.color : '#334155' }}
                    />
                    {lp.label}
                  </span>
                  <span className="text-[9px] uppercase">{active ? 'ON' : 'OFF'}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Quick Planet Selector Bar (Muncul Saat Tata Surya Aktif) */}
        {solarSystemActive && (
          <div className="flex items-center gap-1 p-1.5 rounded-xl bg-black/60 border border-amber-900/40 backdrop-blur-md overflow-x-auto">
            <span className="text-[9px] text-amber-400 font-bold px-1 uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              FOKUS:
            </span>
            {[
              { name: 'Bumi', color: 'text-cyan-400' },
              { name: 'Bulan', color: 'text-gray-300' },
              { name: 'Mars', color: 'text-orange-400' },
              { name: 'Matahari', color: 'text-yellow-400' },
              { name: 'Jupiter', color: 'text-amber-400' },
            ].map(p => (
              <button
                key={p.name}
                onClick={() => focusCelestialObject(p.name)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition border ${
                  selectedPlanet === p.name
                    ? 'bg-amber-950 border-amber-400 text-white'
                    : 'bg-black/40 border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <span className={p.color}>{p.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ─── 3. FLOATING VIEW CONTROLS (KANAN ATAS) ─── */}
      <div className="map-view-controls">
        <button
          onClick={() => {
            const globe = globeInstanceRef.current;
            if (globe) {
              const pov = globe.pointOfView();
              globe.pointOfView({ altitude: Math.max(0.3, pov.altitude - 0.45) }, 400);
            }
          }}
          title="Zoom In"
          className="w-9 h-9 rounded-xl bg-[#040d21]/80 hover:bg-cyan-950/80 border border-cyan-800/60 hover:border-cyan-400 text-cyan-400 flex items-center justify-center backdrop-blur-md transition shadow-lg cursor-pointer"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            const globe = globeInstanceRef.current;
            if (globe) {
              const pov = globe.pointOfView();
              globe.pointOfView({ altitude: Math.min(5.5, pov.altitude + 0.45) }, 400);
            }
          }}
          title="Zoom Out"
          className="w-9 h-9 rounded-xl bg-[#040d21]/80 hover:bg-cyan-950/80 border border-cyan-800/60 hover:border-cyan-400 text-cyan-400 flex items-center justify-center backdrop-blur-md transition shadow-lg cursor-pointer"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            const globe = globeInstanceRef.current;
            if (globe) {
              globe.pointOfView({ lat: 10, lng: 115, altitude: 2.2 }, 800);
              setSelectedPlanet(null);
            }
          }}
          title="Reset Globe View"
          className="w-9 h-9 rounded-xl bg-[#040d21]/80 hover:bg-cyan-950/80 border border-cyan-800/60 hover:border-cyan-400 text-cyan-400 flex items-center justify-center backdrop-blur-md transition shadow-lg cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Toggle Mode Hamburger Stream Incidents */}
        <button
          onClick={() => setStreamMode(prev => prev === 'collapsed' ? 'normal' : 'collapsed')}
          title={streamMode === 'collapsed' ? 'Buka Panel Stream Incidents' : 'Ciutkan Panel ke Mode Hamburger'}
          className={`w-9 h-9 rounded-xl border flex items-center justify-center backdrop-blur-md transition shadow-lg cursor-pointer ${
            streamMode === 'collapsed'
              ? 'bg-cyan-500 text-black border-cyan-400 font-bold shadow-[0_0_12px_rgba(0,229,255,0.4)]'
              : 'bg-[#040d21]/80 border-cyan-800/60 text-cyan-400 hover:border-cyan-400'
          }`}
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      {/* ─── 4. FLOATING HAMBURGER PILL SAAT STREAM DICIOUTKAN (COLLAPSED) ─── */}
      {streamMode === 'collapsed' && (
        <div className="absolute bottom-16 right-5 z-20 pointer-events-auto">
          <button
            onClick={() => setStreamMode('normal')}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#040d21]/90 hover:bg-cyan-950/90 border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 hover:text-white shadow-[0_0_25px_rgba(0,229,255,0.3)] backdrop-blur-xl transition group cursor-pointer"
          >
            <Menu className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
            <div className="text-left font-mono">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>BUKA PERISTIWA</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              </div>
              <div className="text-[10px] text-cyan-400">{visibleEvents.length} PERISTIWA TERPANTAU</div>
            </div>
          </button>
        </div>
      )}

      {/* ─── 5. FLOATING TARGET, CELESTIAL & STREAM INCIDENTS PANEL ─── */}
      {streamMode !== 'collapsed' && (
        <div
          className={`map-stream-panel ${streamMode === 'expanded' ? 'is-expanded' : ''}`}
        >
          {/* A. Celestial Inspector (Muncul Saat Planet/Matahari Diklik) */}
          {selectedPlanet && (
            <div className="p-3.5 rounded-2xl border border-amber-500/60 bg-[#081226]/95 backdrop-blur-xl shadow-[0_0_25px_rgba(245,158,11,0.25)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400 flex items-center gap-1.5">
                  <Orbit className="w-3.5 h-3.5" />
                  OBJEK TATA SURYA 3D
                </span>
                <button
                  onClick={() => setSelectedPlanet(null)}
                  className="text-gray-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-base font-bold text-white leading-tight flex items-center justify-between">
                <span>{selectedPlanet}</span>
                <span className="text-xs text-amber-300 font-mono">3D Mesh Orbit</span>
              </div>

              <div className="text-[11px] text-gray-300 leading-snug">
                {selectedPlanet === 'Bumi' && 'Planet hunian berpenghuni dengan biosfer, atmosfer nitrogen-oksigen, dan siklus pemantauan real-time satelit.'}
                {selectedPlanet === 'Matahari' && 'Bintang pusat tata surya dengan suhu permukaan ~5.500°C yang memancarkan energi foton dan siklus siang-malam Bumi.'}
                {selectedPlanet === 'Bulan' && 'Satelit alami Bumi pada jarak ~384.400 km yang mengontrol siklus pasang surut air laut global.'}
                {selectedPlanet === 'Mars' && 'Planet terestrial merah berpasir besi oksida dengan dua kutub es dan eksplorasi rover misi antariksa.'}
                {selectedPlanet === 'Jupiter' && 'Raksasa gas terbesar di tata surya dengan badai bintik merah raksasa (Great Red Spot) dan sabuk awan troposfer.'}
              </div>

              <button
                onClick={() => focusCelestialObject('Bumi')}
                className="w-full mt-1 py-1.5 rounded-lg border border-cyan-500/60 text-cyan-300 bg-cyan-950/40 text-xs font-bold hover:bg-cyan-900/60 transition flex items-center justify-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                KEMBALI KE PANDANGAN BUMI
              </button>
            </div>
          )}

          {/* B. Country Inspector (Muncul Saat Negara di Globe Dipencet) */}
          {selectedCountry && !selectedPlanet && (
            <div className="p-3.5 rounded-2xl border border-cyan-400/60 bg-[#03091e]/90 backdrop-blur-xl shadow-[0_0_25px_rgba(0,229,255,0.25)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-widest uppercase text-cyan-400 flex items-center gap-1.5">
                  <GlobeIcon className="w-3.5 h-3.5" />
                  NEGARA TERPILIH
                </span>
                <button
                  onClick={() => setSelectedCountry(null)}
                  className="text-gray-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="text-base font-bold text-white leading-tight">
                {selectedCountry.ADMIN}
              </div>
              <div className="text-[11px] text-gray-400">
                {selectedCountry.NAME_LONG || selectedCountry.ADMIN} • ISO: {selectedCountry.ISO_A2 || selectedCountry.ISO_A3}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-white/10">
                <div>
                  <span className="text-gray-500 block">BENUA:</span>
                  <span className="text-white font-bold">{selectedCountry.CONTINENT || selectedCountry.SUBREGION}</span>
                </div>
                {selectedCountry.POP_EST && (
                  <div>
                    <span className="text-gray-500 block">POPULASI:</span>
                    <span className="text-cyan-300 font-bold">{(selectedCountry.POP_EST / 1e6).toFixed(1)} Juta</span>
                  </div>
                )}
              </div>

              {selectedCountry.ECONOMY && (
                <div className="text-[10px] text-gray-400 bg-white/5 p-1.5 rounded">
                  <span className="text-gray-500 block">STATUS EKONOMI:</span>
                  <span className="text-emerald-400 font-bold">{selectedCountry.ECONOMY}</span>
                </div>
              )}
            </div>
          )}

          {/* C. Incident Target Inspector (Muncul Saat Pin Event Dipencet) */}
          {selectedEvent && selectedMeta && !selectedCountry && !selectedPlanet && (
            <div
              style={{
                borderColor: `${selectedMeta.color}66`,
                background: 'rgba(3, 9, 30, 0.90)',
                boxShadow: `0 0 25px ${selectedMeta.color}25`,
              }}
              className="p-3.5 rounded-2xl border backdrop-blur-xl transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  style={{ color: selectedMeta.color }}
                  className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: selectedMeta.color }}
                  />
                  {selectedMeta.label}
                </span>
                <span className="text-[10px] text-gray-500 font-bold">{selectedEvent.source}</span>
              </div>

              <div className="text-xs font-bold text-white leading-snug line-clamp-2 mb-2">
                {selectedEvent.title}
              </div>

              <div className="flex justify-between items-center text-[10px] text-gray-400 border-t border-white/5 pt-2">
                <span>
                  LAT/LNG: {selectedEvent.lat.toFixed(2)}, {selectedEvent.lng.toFixed(2)}
                </span>
                {selectedEvent.magnitude && (
                  <span className="text-amber-400 font-bold">
                    M{selectedEvent.magnitude.toFixed(1)}
                  </span>
                )}
              </div>

              <button
                onClick={() => flyToEvent(selectedEvent)}
                style={{
                  borderColor: selectedMeta.color,
                  color: selectedMeta.color,
                  background: `${selectedMeta.color}22`,
                }}
                className="w-full mt-2.5 py-1.5 rounded-lg border text-xs font-bold hover:brightness-125 transition flex items-center justify-center gap-2"
              >
                <Navigation className="w-3.5 h-3.5" />
                FOKUS KE TITIK LOKASI
              </button>
            </div>
          )}

          {/* D. Live Global Stream List dengan Mode Hamburger (Perkecil / Perbesar) */}
          <div className="map-stream-card">
            {/* Header Stream Incidents dengan Kontrol Ukuran */}
            <div className="map-stream-header">
              <span className="text-xs font-bold text-cyan-300 tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Peristiwa global
              </span>
              
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400 font-mono px-1.5 py-0.5 rounded bg-black/50 border border-cyan-900/50">
                  {filteredEvents.length}
                </span>

                {/* Tombol Perbesar / Perkecil Ukuran Drawer */}
                <button
                  onClick={() => setStreamMode(prev => prev === 'expanded' ? 'normal' : 'expanded')}
                  title={streamMode === 'expanded' ? 'Perkecil Ukuran' : 'Perbesar Ukuran Drawer'}
                  className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition"
                >
                  {streamMode === 'expanded' ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>

                {/* Tombol Ciutkan Hamburger (Collapse) */}
                <button
                  onClick={() => setStreamMode('collapsed')}
                  title="Ciutkan ke Mode Tombol Hamburger"
                  className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Input Pencarian Insiden Cepat */}
            <div className="map-stream-search">
              <input
                type="text"
                value={streamSearch}
                onChange={e => setStreamSearch(e.target.value)}
                placeholder="Cari gempa, badai, lokasi..."
                aria-label="Cari peristiwa atau lokasi"
                className="w-full px-2.5 py-1 rounded-lg bg-black/50 border border-cyan-900/40 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>

            {dataError && <p className="map-error" role="status">{dataError}</p>}

            {/* List Stream Items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 overscroll-contain">
              {filteredEvents.map((ev) => {
                const meta = getCategoryMeta(ev.category);
                const isSelected = selectedEvent?.id === ev.id;
                return (
                  <button
                    key={ev.id}
                    onClick={() => flyToEvent(ev)}
                    style={{
                      borderColor: isSelected ? meta.color : 'rgba(255,255,255,0.06)',
                      background: isSelected ? `${meta.color}25` : 'rgba(10, 20, 45, 0.45)',
                    }}
                    aria-pressed={isSelected}
                    className="map-incident-card group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        style={{ color: meta.color }}
                        className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: meta.color }}
                        />
                        {meta.badge}
                      </span>
                      <span className="text-[9px] text-gray-500 font-mono">{ev.source}</span>
                    </div>

                    <div className="text-xs leading-relaxed text-gray-200 line-clamp-2 group-hover:text-cyan-200 transition">
                      {ev.title}
                    </div>

                    {streamMode === 'expanded' && (
                      <div className="text-[9px] text-gray-500 mt-1 flex justify-between">
                        <span>LAT/LNG: {ev.lat.toFixed(2)}, {ev.lng.toFixed(2)}</span>
                        {ev.magnitude && <span className="text-amber-400 font-bold">M{ev.magnitude.toFixed(1)}</span>}
                      </div>
                    )}
                  </button>
                );
              })}

              {filteredEvents.length === 0 && (
                <div className="map-empty" role="status">
                  {loading ? (
                    <><RefreshCw className="w-5 h-5 mx-auto mb-3 animate-spin" />Menghubungkan ke NASA & USGS…</>
                  ) : (
                    <><GlobeIcon className="w-6 h-6 mx-auto mb-3 text-teal-400" />Belum ada peristiwa untuk ditampilkan.<br />Coba ubah pencarian, filter, atau perbarui data.</>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <section className="map-stats" aria-label="Ringkasan pemantauan global">
        {[
          { label: 'Peristiwa terpantau', value: events.length, icon: MapPin },
          { label: 'Gempa · 7 hari terakhir', value: earthquakeCount, icon: Activity },
          { label: 'Peristiwa cuaca', value: weatherCount, icon: CloudRain },
        ].map(stat => (
          <div className="map-stat" key={stat.label}>
            <span className="map-stat-icon"><stat.icon className="w-4 h-4" /></span>
            <strong>{lastUpdated ? stat.value.toLocaleString('id-ID') : '—'}</strong>
            <small>{stat.label}</small>
          </div>
        ))}
      </section>

      <footer className="map-footer">
        <span className="flex items-center gap-2"><Compass className="w-3.5 h-3.5 text-teal-300" />Geser untuk menjelajah · Klik titik untuk detail</span>
        <span>NASA EONET + USGS · Pembaruan otomatis 5 menit</span>
        <span className="tabular-nums">{lastUpdated ? `Diperbarui ${lastUpdated.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : 'Menunggu data'}</span>
      </footer>
    </div>
  );
}
