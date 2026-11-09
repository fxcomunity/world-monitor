import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, AlertTriangle, Bell, Check, CheckCircle2, Clock3, Flame,
  Info, MapPin, Play, Radio, RefreshCw, ShieldCheck, ShieldAlert,
  SlidersHorizontal, Volume2, VolumeX,
} from 'lucide-react';
import { fetchDisasters, fetchEarthquakes, fetchIndonesiaEarthquakes } from '../lib/api';

interface QuakeEvent {
  id: string;
  title: string;
  magnitude: number;
  place: string;
  time: string;
  lat: number;
  lng: number;
  source?: string;
  depth?: string;
  tsunamiPotential?: string;
}

interface DeviceLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
}

const DEVICE_LOCATION_KEY = 'wm_notification_device_location';
const LOCATION_TRACKING_KEY = 'wm_notification_location_tracking';
const LOCATION_LABEL_KEY = 'wm_notification_location_label';

interface AlertItem {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  source: string;
  time: string;
  desc: string;
  category: 'SEISMIC' | 'DISASTER' | 'GEOPOLITIC' | 'ENERGY';
  isIndonesia?: boolean;
}

interface NotificationPreferences {
  soundEnabled: boolean;
  volume: number;
  minMagnitude: number;
  subscribedCategories: {
    seismic: boolean;
    disaster: boolean;
  };
}

const PREFERENCES_KEY = 'wm_notification_preferences';
let alertAudioContext: AudioContext | null = null;
const DEFAULT_PREFERENCES: NotificationPreferences = {
  soundEnabled: true,
  volume: 100,
  minMagnitude: 4.5,
  subscribedCategories: {
    seismic: true,
    disaster: true,
  },
};

function readStoredLocation(): DeviceLocation | null {
  try {
    const stored = localStorage.getItem(DEVICE_LOCATION_KEY);
    if (!stored) return null;
    const location = JSON.parse(stored) as DeviceLocation;
    if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) return null;
    return location;
  } catch (error) {
    console.warn('Tidak dapat membaca lokasi perangkat tersimpan:', error);
    return null;
  }
}

function readPreferences(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (!stored) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(stored) as Partial<NotificationPreferences>;
    const categories = parsed.subscribedCategories;
    return {
      soundEnabled: typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : DEFAULT_PREFERENCES.soundEnabled,
      volume: typeof parsed.volume === 'number' ? Math.min(100, Math.max(0, parsed.volume)) : DEFAULT_PREFERENCES.volume,
      minMagnitude: typeof parsed.minMagnitude === 'number' && parsed.minMagnitude >= 2.5 && parsed.minMagnitude <= 7
        ? parsed.minMagnitude
        : DEFAULT_PREFERENCES.minMagnitude,
      subscribedCategories: {
        seismic: typeof categories?.seismic === 'boolean' ? categories.seismic : true,
        disaster: typeof categories?.disaster === 'boolean' ? categories.disaster : true,
      },
    };
  } catch (error) {
    console.warn('Tidak dapat membaca preferensi notifikasi tersimpan:', error);
    return DEFAULT_PREFERENCES;
  }
}

async function playAlertChime(critical: boolean, volume: number, unlock = false): Promise<void> {
  const AudioContextConstructor = window.AudioContext
    || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return Promise.reject(new Error('Browser ini tidak mendukung Web Audio.'));

  if (!alertAudioContext || alertAudioContext.state === 'closed') {
    if (!unlock) throw new Error('Tekan tombol uji suara untuk mengaktifkan audio browser.');
    alertAudioContext = new AudioContextConstructor();
  }
  const context = alertAudioContext;
  if (context.state !== 'running') {
    if (!unlock) throw new Error('Audio browser belum aktif. Tekan tombol uji suara.');
    await context.resume();
  }
  const master = context.createGain();
  master.gain.value = Math.max(0, Math.min(1, volume / 100));
  master.connect(context.destination);
  const notes = critical ? [880, 1174.66, 880, 1174.66] : [659.25, 880, 1046.5];
  const pulseDuration = critical ? 0.22 : 0.18;

  notes.forEach((frequency, index) => {
    const start = context.currentTime + index * (pulseDuration + 0.08);
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = critical ? 'square' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(0.8, start + 0.015);
    envelope.gain.setValueAtTime(0.8, start + pulseDuration * 0.65);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + pulseDuration);
    oscillator.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(start + pulseDuration);
  });

  const duration = notes.length * (pulseDuration + 0.08);
  await new Promise(resolve => window.setTimeout(resolve, duration * 1000 + 100));
}

function isIndonesiaQuake(quake: QuakeEvent) {
  if (quake.lat < -11.5 || quake.lat > 6.5 || quake.lng < 94 || quake.lng > 141) return false;
  const place = quake.place.toLowerCase();
  if (/\b(singapore|malaysia|philippines|brunei|thailand|vietnam|papua new guinea|timor-leste)\b/.test(place)) {
    return false;
  }
  return /\b(indonesia|sumatra|java|bali|lombok|sumbawa|flores|savu|banda sea|molucca sea|maluku|halmahera|seram|sulawesi|celebes|arafura|papua)\b/.test(place);
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Jakarta',
  }) + ' WIB';
}

export default function NotificationCenter() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [preferences, setPreferences] = useState(readPreferences);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [deviceLocation, setDeviceLocation] = useState<DeviceLocation | null>(readStoredLocation);
  const [trackingLocation, setTrackingLocation] = useState(() => localStorage.getItem(LOCATION_TRACKING_KEY) === 'true');
  const [locationLabel, setLocationLabel] = useState(() => localStorage.getItem(LOCATION_LABEL_KEY) || '');
  const [locationError, setLocationError] = useState<string | null>(null);
  const seenQuakeIds = useRef(new Set<string>());
  const hasInitialSnapshot = useRef(false);
  const lastIndonesiaPollAt = useRef<number | null>(null);
  const preferencesRef = useRef(preferences);
  const watchIdRef = useRef<number | null>(null);

  preferencesRef.current = preferences;

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (permission === 'granted') setTrackingLocation(true);
    else setTrackingLocation(false);
  }, [permission]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCATION_TRACKING_KEY, String(trackingLocation));
    } catch (error) {
      console.error('Gagal menyimpan preferensi pemindaian lokasi:', error);
    }

    if (!trackingLocation) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      return;
    }

    if (!('geolocation' in navigator)) {
      setLocationError('Browser ini tidak mendukung GPS lokasi. Izinkan lokasi di browser atau perangkat lain.');
      setTrackingLocation(false);
      return;
    }

    setLocationError(null);
    watchIdRef.current = navigator.geolocation.watchPosition(
      position => {
        const location: DeviceLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date(position.timestamp).toISOString(),
        };
        setDeviceLocation(location);
        setLocationError(null);
        try {
          localStorage.setItem(DEVICE_LOCATION_KEY, JSON.stringify(location));
        } catch (error) {
          console.error('Gagal menyimpan lokasi perangkat secara lokal:', error);
          setLocationError('Lokasi terdeteksi, tetapi browser tidak mengizinkan penyimpanan lokal.');
        }
      },
      error => {
        const message = error.code === error.PERMISSION_DENIED
          ? 'Izin lokasi ditolak. Aktifkan izin Location di pengaturan situs browser, lalu coba lagi.'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'Lokasi perangkat belum tersedia. Pastikan GPS/lokasi perangkat aktif dan coba lagi.'
            : 'Permintaan lokasi melewati batas waktu. Coba lagi saat GPS atau koneksi tersedia.';
        setLocationError(message);
        setTrackingLocation(false);
      },
      { enableHighAccuracy: false, maximumAge: 15_000, timeout: 20_000 },
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };
  }, [trackingLocation]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Gagal menyimpan preferensi notifikasi:', error);
    }
  }, [preferences]);

  const showNotification = useCallback((title: string, body: string, tag: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    new Notification(title, {
      body,
      icon: '/favicon.png',
      tag,
    });
  }, []);

  const loadAlerts = useCallback(async () => {
    const scanStartedAt = Date.now();
    try {
      const currentPreferences = preferencesRef.current;
      const [quakeResult, indonesiaResult, disasterResult] = await Promise.allSettled([
        fetchEarthquakes() as Promise<QuakeEvent[]>,
        fetchIndonesiaEarthquakes(currentPreferences.minMagnitude) as Promise<QuakeEvent[]>,
        fetchDisasters(),
      ]);
      if (quakeResult.status === 'rejected' && indonesiaResult.status === 'rejected' && disasterResult.status === 'rejected') {
        throw new Error('Feed gempa BMKG/USGS dan bencana NASA sama-sama gagal dimuat.');
      }

      const quakeData = quakeResult.status === 'fulfilled' ? quakeResult.value : [];
      const indonesiaData = indonesiaResult.status === 'fulfilled' ? indonesiaResult.value : [];
      const disasterData = disasterResult.status === 'fulfilled' ? disasterResult.value : [];
      const generated: AlertItem[] = [];

      if (currentPreferences.subscribedCategories.seismic) {
        const internationalQuakes = quakeData.filter(quake => !isIndonesiaQuake(quake));
        const allQuakes = new Map([...internationalQuakes, ...indonesiaData].map(quake => [quake.id, quake]));
        allQuakes.forEach(quake => {
          const indonesia = quake.source === 'BMKG';
          generated.push({
            id: `quake-${quake.id}`,
            category: 'SEISMIC',
            type: quake.magnitude >= 6.5 ? 'CRITICAL' : 'WARNING',
            title: `Gempa M ${quake.magnitude.toFixed(1)}: ${quake.place}`,
            source: quake.source || 'USGS Earthquake Hazards Program',
            time: formatTime(quake.time),
            desc: `Koordinat ${quake.lat.toFixed(2)}, ${quake.lng.toFixed(2)} · ${indonesia ? `BMKG${quake.depth ? ` · kedalaman ${quake.depth}` : ''}${quake.tsunamiPotential ? ` · ${quake.tsunamiPotential}` : ''}` : 'feed global USGS M4.5+'}.`,
            isIndonesia: indonesia,
          });
        });
      }

      if (currentPreferences.subscribedCategories.disaster) {
        disasterData.slice(0, 10).forEach((disaster: {
          id: string;
          category: string;
          title: string;
          date: string | null;
        }) => {
          generated.push({
            id: `disaster-${disaster.id}`,
            category: 'DISASTER',
            type: disaster.category.toLowerCase().includes('storm') ? 'CRITICAL' : 'WARNING',
            title: `${disaster.category.toUpperCase()}: ${disaster.title}`,
            source: 'NASA EONET',
            time: disaster.date ? formatTime(disaster.date) : 'Waktu tidak tersedia',
            desc: 'Fenomena alam aktif terdaftar pada katalog pemantauan NASA EONET.',
          });
        });
      }

      const newIndonesiaQuakes = indonesiaResult.status === 'fulfilled'
        && currentPreferences.subscribedCategories.seismic
        && hasInitialSnapshot.current
        ? indonesiaData.filter(quake =>
          lastIndonesiaPollAt.current !== null
          && Date.parse(quake.time) > lastIndonesiaPollAt.current
          && !seenQuakeIds.current.has(quake.id),
        )
        : [];

      if (indonesiaResult.status === 'fulfilled') {
        indonesiaData.forEach(quake => seenQuakeIds.current.add(quake.id));
        hasInitialSnapshot.current = true;
        lastIndonesiaPollAt.current = scanStartedAt;
      }

      if (newIndonesiaQuakes.length > 0) {
        const newestQuake = newIndonesiaQuakes[0];
        if (currentPreferences.soundEnabled && currentPreferences.volume > 0) {
          void playAlertChime(newestQuake.magnitude >= 6.5, currentPreferences.volume)
            .catch(error => {
              console.error('Gagal memutar suara peringatan:', error);
              setAudioError('Suara tidak dapat diputar. Tekan tombol uji suara untuk mengaktifkan audio browser.');
            });
        }
        showNotification(
          newIndonesiaQuakes.length === 1
            ? `GEMPA INDONESIA — M${newestQuake.magnitude.toFixed(1)}`
            : `${newIndonesiaQuakes.length} GEMPA BARU TERDETEKSI DI INDONESIA`,
          newIndonesiaQuakes.length === 1
            ? `${newestQuake.place}. Data BMKG diperbarui ${formatTime(newestQuake.time)}.`
            : `Gempa terbaru M${newestQuake.magnitude.toFixed(1)} ${newestQuake.place}.`,
          `indonesia-quake-${newestQuake.id}`,
        );
      }

      setAlerts(generated.sort((a, b) => {
        if (a.isIndonesia !== b.isIndonesia) return a.isIndonesia ? -1 : 1;
        return (a.type === 'CRITICAL' ? -1 : 1) - (b.type === 'CRITICAL' ? -1 : 1);
      }));
      setLastUpdated(new Date());
      const sourceErrors = [
        quakeResult.status === 'rejected' ? 'USGS feed gempa global gagal dimuat' : null,
        indonesiaResult.status === 'rejected' ? 'BMKG feed gempa Indonesia gagal dimuat' : null,
        disasterResult.status === 'rejected' ? 'NASA EONET gagal dimuat' : null,
      ].filter(Boolean);
      if (sourceErrors.length) {
        console.error('Sebagian feed peringatan gagal:', sourceErrors);
        setFeedError(sourceErrors.join('; '));
      } else {
        setFeedError(null);
      }
    } catch (error) {
      console.error('Gagal memuat feed peringatan:', error);
      setFeedError(error instanceof Error ? error.message : 'Feed peringatan tidak dapat dimuat.');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    void loadAlerts();
    const intervalId = window.setInterval(() => void loadAlerts(), 60_000);
    return () => window.clearInterval(intervalId);
  }, [loadAlerts]);

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K],
  ) => setPreferences(current => ({ ...current, [key]: value }));

  const toggleCategory = (category: keyof NotificationPreferences['subscribedCategories']) => {
    setPreferences(current => ({
      ...current,
      subscribedCategories: {
        ...current.subscribedCategories,
        [category]: !current.subscribedCategories[category],
      },
    }));
  };

  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      setFeedError('Browser ini tidak mendukung notifikasi desktop. Coba Chrome, Edge, atau Firefox.');
      return;
    }

    try {
      setLocationError(null);
      setTrackingLocation(true);
      const audioTest = preferencesRef.current.soundEnabled && preferencesRef.current.volume > 0
        ? playAlertChime(false, preferencesRef.current.volume, true)
        : Promise.resolve();
      const permissionRequest = Notification.requestPermission();
      const result = await permissionRequest;
      setPermission(result);
      try {
        await audioTest;
        if (preferencesRef.current.soundEnabled && preferencesRef.current.volume > 0) setAudioReady(true);
      } catch (error) {
        console.error('Gagal mengaktifkan audio alarm:', error);
        setAudioError('Audio diblokir browser. Tekan tombol uji suara dan pastikan tab tidak dalam mode senyap.');
      }
      if (result === 'granted') {
        showNotification('World Monitor aktif', 'Pemantauan gempa Indonesia berjalan selama halaman ini terbuka.', 'wm-notifications-enabled');
      }
    } catch (error) {
      console.error('Gagal meminta izin notifikasi:', error);
      setFeedError('Izin notifikasi gagal diminta. Periksa pengaturan situs di browser.');
    }
  };

  const testAlert = async () => {
    setAudioError(null);
    if (permission !== 'granted') {
      await enableNotifications();
      return;
    }

    try {
      if (preferences.soundEnabled && preferences.volume > 0) {
        await playAlertChime(true, preferences.volume, true);
        setAudioReady(true);
      }
      showNotification('UJI PERINGATAN WORLD MONITOR', 'Suara dan notifikasi gempa Indonesia berfungsi.', 'wm-test-alert');
    } catch (error) {
      console.error('Gagal menjalankan uji peringatan:', error);
      setAudioError(error instanceof Error ? error.message : 'Gagal menjalankan suara peringatan.');
    }
  };

  const categories = [
    { key: 'seismic', label: 'Gempa bumi', detail: 'USGS · wilayah Indonesia dan global', icon: Activity, color: 'text-red-400' },
    { key: 'disaster', label: 'Bencana alam', detail: 'NASA EONET · badai, kebakaran, dll.', icon: Flame, color: 'text-orange-400' },
  ] as const;

  const indonesiaQuakes = alerts.filter(alert => alert.isIndonesia).length;

  return (
    <div className="min-h-full bg-[#060D1F] px-3 py-5 text-gray-200 sm:px-5 lg:px-7">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="flex flex-col gap-4 border-b border-cyan-900/40 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
              Pemantauan aktif · BMKG + USGS + NASA
            </div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              <Bell className="h-7 w-7 text-cyan-400" />
              Pusat Notifikasi
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-400">
              Gempa Indonesia dari BMKG, gempa global dari USGS, dan bencana NASA. Pemindaian lokasi perangkat hanya aktif jika Anda mengizinkan GPS.
            </p>
          </div>
          <button
            onClick={() => void loadAlerts()}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-cyan-800/70 bg-cyan-950/50 px-4 text-sm font-medium text-cyan-200 transition hover:bg-cyan-900/50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Perbarui data
          </button>
        </header>

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-cyan-900/50 bg-[#081226] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400"><MapPin className="h-4 w-4 text-cyan-400" /> STATUS PEMINDAIAN LOKASI</div>
            <div className="mt-2 break-words text-lg font-semibold text-white">
              {locationLabel.trim() || (deviceLocation
                ? `${deviceLocation.latitude.toFixed(4)}, ${deviceLocation.longitude.toFixed(4)}`
                : 'Lokasi belum diizinkan')}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {trackingLocation
                ? `GPS aktif · akurasi ±${Math.round(deviceLocation?.accuracy ?? 0)} m`
                : deviceLocation
                  ? `Koordinat tersimpan lokal · ${new Date(deviceLocation.capturedAt).toLocaleString('id-ID')}`
                  : 'Lokasi perangkat tidak dipantau'}
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-cyan-950 bg-black/20 px-2.5 py-2 text-[11px] text-gray-400">
              <span className={`h-1.5 w-1.5 rounded-full ${trackingLocation ? 'animate-pulse bg-emerald-400' : 'bg-gray-600'}`} />
              {trackingLocation ? 'Lokasi aktif bersama notifikasi' : 'Aktifkan notifikasi untuk mulai memindai'}
            </p>
            <label className="mt-3 block text-[11px] text-gray-500" htmlFor="location-area-label">
              Nama area (opsional, disimpan di perangkat)
            </label>
            <input
              id="location-area-label"
              value={locationLabel}
              onChange={event => {
                setLocationLabel(event.target.value);
                try {
                  localStorage.setItem(LOCATION_LABEL_KEY, event.target.value);
                } catch (error) {
                  console.error('Gagal menyimpan nama area lokasi:', error);
                  setLocationError('Nama area tidak dapat disimpan di perangkat.');
                }
              }}
              placeholder="Contoh: Cengkareng, Jakarta Barat"
              className="mt-1 min-h-10 w-full rounded-lg border border-cyan-950 bg-black/30 px-3 text-xs text-gray-200 placeholder:text-gray-600 focus:border-cyan-700 focus:outline-none"
            />
          </div>
          <div className="rounded-xl border border-cyan-900/50 bg-[#081226] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400"><MapPin className="h-4 w-4 text-red-400" /> GEMPA INDONESIA DI FEED</div>
            <div className="mt-2 text-lg font-semibold text-white">{indonesiaQuakes} kejadian</div>
            <p className="mt-1 text-xs text-gray-500">Indonesia · BMKG · ambang M{preferences.minMagnitude.toFixed(1)}+</p>
          </div>
          <div className="rounded-xl border border-cyan-900/50 bg-[#081226] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400"><Clock3 className="h-4 w-4 text-emerald-400" /> PEMBARUAN TERAKHIR</div>
            <div className="mt-2 text-lg font-semibold text-white">{lastUpdated ? lastUpdated.toLocaleTimeString('id-ID') : 'Memuat...'}</div>
            <p className="mt-1 text-xs text-gray-500">{lastUpdated ? 'Waktu lokal perangkat' : 'Menghubungi sumber data'}</p>
          </div>
        </section>

        <div className="flex items-start gap-2 rounded-xl border border-amber-900/50 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-100/80">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p>
            Lokasi GPS hanya lokasi perangkat Anda, bukan deteksi lokasi korban. Koordinat hanya disimpan di localStorage browser dan tidak dikirim ke server. Nama area bisa Anda isi sendiri; untuk deteksi nama otomatis diperlukan layanan geocoding terpisah yang mengirim koordinat ke penyedia tersebut. Ini bukan sistem peringatan dini resmi; ikuti BMKG/BNPB.
          </p>
        </div>
        {locationError && (
          <div role="alert" className="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-xs leading-relaxed text-red-200">
            {locationError}
          </div>
        )}

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.8fr)]">
          <div className="space-y-5">
            <div className="rounded-xl border border-cyan-800/60 bg-gradient-to-br from-[#0a1a36] to-[#071124] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-cyan-300" />
                    <h2 className="text-base font-semibold text-white">Notifikasi desktop</h2>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      permission === 'granted'
                        ? 'border-emerald-700/70 bg-emerald-950/50 text-emerald-300'
                        : permission === 'denied'
                          ? 'border-red-700/70 bg-red-950/50 text-red-300'
                          : 'border-amber-700/70 bg-amber-950/50 text-amber-300'
                    }`}>
                      {permission === 'granted' ? 'DIIZINKAN' : permission === 'denied' ? 'DIBLOKIR' : 'BELUM DIAKTIFKAN'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-gray-400">
                    Izin browser diperlukan agar alarm baru dapat muncul di luar tab aktif. Klik aktifkan, lalu izinkan saat browser bertanya.
                  </p>
                </div>
                {permission === 'default' && (
                  <button
                    onClick={() => void enableNotifications()}
                    className="min-h-11 shrink-0 rounded-lg bg-cyan-400 px-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-300"
                  >
                    Aktifkan notifikasi + lokasi
                  </button>
                )}
                {permission === 'granted' && locationError && (
                  <button
                    onClick={() => {
                      setLocationError(null);
                      setTrackingLocation(true);
                    }}
                    className="min-h-11 shrink-0 rounded-lg border border-cyan-700/60 bg-cyan-950/50 px-4 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-900/50"
                  >
                    Coba aktifkan lokasi lagi
                  </button>
                )}
                {permission === 'denied' && (
                  <p className="max-w-xs rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-xs leading-relaxed text-red-200">
                    Izin diblokir browser. Buka ikon pengaturan situs di samping alamat website, izinkan Notifikasi, lalu muat ulang halaman.
                  </p>
                )}
              </div>
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-blue-900/60 bg-blue-950/25 p-3 text-xs leading-relaxed text-blue-200/80">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                <p>Catatan: pemindaian otomatis hanya berjalan saat World Monitor terbuka. Notifikasi push ketika browser benar-benar tertutup memerlukan layanan push dan server khusus; fitur ini tidak mengklaim berjalan di latar belakang.</p>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-900/50 bg-[#081226] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white">Pengaturan alarm</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-cyan-950 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {preferences.soundEnabled ? <Volume2 className="h-4 w-4 text-cyan-300" /> : <VolumeX className="h-4 w-4 text-gray-500" />}
                      <div>
                        <div className="text-sm font-medium text-white">Suara alarm</div>
                        <div className="text-xs text-gray-500">{preferences.soundEnabled ? 'Alarm suara aktif' : 'Alarm suara mati'}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={preferences.soundEnabled}
                      aria-label="Aktifkan suara alarm"
                      onClick={() => updatePreference('soundEnabled', !preferences.soundEnabled)}
                      className={`relative h-6 w-11 rounded-full transition ${preferences.soundEnabled ? 'bg-cyan-500' : 'bg-gray-700'}`}
                    >
                      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${preferences.soundEnabled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                  <label className="mt-5 block text-xs text-gray-400" htmlFor="alarm-volume">Volume alarm <span className="float-right text-cyan-300">{preferences.volume}%</span></label>
                  <input
                    id="alarm-volume"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={preferences.volume}
                    onChange={event => updatePreference('volume', Number(event.target.value))}
                    disabled={!preferences.soundEnabled}
                    className="mt-3 h-2 w-full cursor-pointer accent-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
                  />
                  <button
                    onClick={() => void testAlert()}
                    className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-cyan-800/70 bg-cyan-950/40 px-3 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-900/50"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" /> Uji suara & notifikasi
                  </button>
                  {audioReady && !audioError && <p className="mt-2 text-[11px] text-emerald-400">Audio browser sudah diaktifkan melalui interaksi pengguna.</p>}
                  {audioError && <p role="alert" className="mt-2 text-[11px] text-red-300">{audioError}</p>}
                  <p className="mt-2 text-[11px] leading-relaxed text-gray-500">Volume ini mengatur level sinyal alarm. Volume akhir tetap mengikuti volume perangkat dan browser.</p>
                </div>

                <div className="rounded-lg border border-cyan-950 bg-black/20 p-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-red-400" />
                    <div>
                      <div className="text-sm font-medium text-white">Ambang gempa Indonesia</div>
                      <div className="text-xs text-gray-500">Alarm untuk gempa dalam wilayah koordinat Indonesia</div>
                    </div>
                  </div>
                  <label htmlFor="quake-threshold" className="mt-5 block text-xs text-gray-400">
                    Magnitudo minimum <span className="float-right font-semibold text-red-300">M{preferences.minMagnitude.toFixed(1)}+</span>
                  </label>
                  <input
                    id="quake-threshold"
                    type="range"
                    min="2.5"
                    max="7"
                    step="0.5"
                    value={preferences.minMagnitude}
                    onChange={event => updatePreference('minMagnitude', Number(event.target.value))}
                    className="mt-3 h-2 w-full cursor-pointer accent-red-400"
                  />
                  <div className="mt-2 flex justify-between text-[10px] text-gray-600"><span>M2.5</span><span>M4.5</span><span>M7.0</span></div>
                  <p className="mt-4 rounded-md border border-amber-900/40 bg-amber-950/20 p-2.5 text-[11px] leading-relaxed text-amber-200/70">
                    Ini peringatan informasi dari feed USGS, bukan sistem peringatan dini resmi BMKG dan bukan prediksi gempa.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-900/50 bg-[#081226] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-white">Kategori yang dipantau</h2>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {categories.map(category => {
                  const Icon = category.icon;
                  const enabled = preferences.subscribedCategories[category.key];
                  return (
                    <button
                      key={category.key}
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      onClick={() => toggleCategory(category.key)}
                      className={`flex min-h-[68px] items-center justify-between gap-3 rounded-lg border p-3 text-left transition ${
                        enabled ? 'border-cyan-700/60 bg-cyan-950/25' : 'border-gray-800 bg-black/20 opacity-70'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <Icon className={`h-4 w-4 shrink-0 ${category.color}`} />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-white">{category.label}</span>
                          <span className="mt-0.5 block text-[11px] text-gray-500">{category.detail}</span>
                        </span>
                      </span>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${enabled ? 'bg-cyan-400 text-slate-950' : 'border border-gray-600'}`}>
                        {enabled && <Check className="h-3 w-3 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="rounded-xl border border-cyan-900/50 bg-[#081226] p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-cyan-950 pb-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 animate-pulse text-red-400" />
                <h2 className="text-sm font-semibold text-white">Feed peringatan terbaru</h2>
              </div>
              <span className="text-[11px] text-cyan-300">{alerts.length} kejadian</span>
            </div>
            {feedError && (
              <div role="alert" className="mb-3 rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-xs text-red-200">
                Gagal memperbarui feed: {feedError}
              </div>
            )}
            {loading ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center text-sm text-gray-400">
                <RefreshCw className="h-5 w-5 animate-spin text-cyan-400" />
                Menghubungi USGS dan NASA...
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                <p className="text-sm font-medium text-white">Tidak ada peringatan aktif</p>
                <p className="text-xs text-gray-500">Feed akan diperiksa kembali otomatis dalam 60 detik.</p>
              </div>
            ) : (
              <div className="max-h-[720px] space-y-2 overflow-y-auto pr-1">
                {alerts.slice(0, 30).map(alert => (
                  <article key={alert.id} className={`rounded-lg border p-3 ${
                    alert.isIndonesia ? 'border-red-800/60 bg-red-950/20' : 'border-cyan-950 bg-black/20'
                  }`}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        alert.type === 'CRITICAL' ? 'bg-red-900/60 text-red-200' : 'bg-amber-900/40 text-amber-200'
                      }`}>{alert.type}</span>
                      {alert.isIndonesia && <span className="inline-flex items-center gap-1 rounded bg-red-900/40 px-1.5 py-0.5 text-[9px] font-bold text-red-200"><MapPin className="h-2.5 w-2.5" /> INDONESIA</span>}
                    </div>
                    <h3 className="mt-2 text-sm font-semibold leading-snug text-white">{alert.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-400">{alert.desc}</p>
                    <p className="mt-2 text-[10px] text-gray-500">{alert.source} · {alert.time}</p>
                    {alert.isIndonesia && permission === 'granted' && (
                      <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Notifikasi desktop siap untuk kejadian baru</span>
                    )}
                  </article>
                ))}
              </div>
            )}
            <div className="mt-4 flex items-start gap-2 border-t border-cyan-950 pt-3 text-[11px] leading-relaxed text-gray-500">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              Feed USGS global M4.5+; lokasi Indonesia ditentukan dari koordinat wilayah, bukan hanya nama tempat.
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
