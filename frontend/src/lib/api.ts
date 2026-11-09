// src/lib/api.ts
// Semua API call terpusat di sini; kesegaran data mengikuti kemampuan sumbernya.

const MAPTILER_KEY      = (import.meta.env.VITE_MAPTILER_KEY as string) || '';
const ALPHAVANTAGE_KEY  = (import.meta.env.VITE_ALPHAVANTAGE_KEY as string) || '';

export const MAP_STYLE = `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`;

// ─── Gempa Bumi (USGS — LIVE) ────────────────────────────────────────────────
export async function fetchEarthquakes() {
  const res = await fetch(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson'
  );
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return json.features.map((f: any) => ({
    id: f.id,
    title: f.properties.title,
    magnitude: f.properties.mag,
    place: f.properties.place,
    time: new Date(f.properties.time).toISOString(),
    lat: f.geometry.coordinates[1],
    lng: f.geometry.coordinates[0],
    type: 'Gempa',
  }));
}

export async function fetchIndonesiaEarthquakes(minMagnitude = 4.5) {
  const response = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json', {
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`BMKG earthquake feed HTTP ${response.status}`);

  const data = await response.json() as {
    Infogempa?: {
      gempa?: Array<{
        DateTime: string;
        Coordinates: string;
        Magnitude: string;
        Kedalaman: string;
        Wilayah: string;
        Potensi: string;
      }>;
    };
  };
  if (!Array.isArray(data.Infogempa?.gempa)) throw new Error('Format feed gempa BMKG tidak valid.');
  return data.Infogempa.gempa.flatMap((earthquake, index) => {
    const [lat, lng] = earthquake.Coordinates.split(',').map(Number);
    const magnitude = Number(earthquake.Magnitude);
    const time = new Date(earthquake.DateTime);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(magnitude) || Number.isNaN(time.getTime())) {
      console.warn('Mengabaikan data gempa BMKG dengan format tidak valid:', earthquake);
      return [];
    }
    if (magnitude < minMagnitude) return [];
    return [{
      id: `bmkg-${time.toISOString()}-${lat}-${lng}-${index}`,
      title: `Gempa M${magnitude.toFixed(1)} ${earthquake.Wilayah}`,
      magnitude,
      place: earthquake.Wilayah,
      time: time.toISOString(),
      lat,
      lng,
      depth: earthquake.Kedalaman,
      tsunamiPotential: earthquake.Potensi,
      source: 'BMKG',
      type: 'Gempa',
    }];
  });
}

// ─── Bencana Global (NASA EONET — LIVE) ──────────────────────────────────────
export async function fetchDisasters() {
  const res = await fetch('/api/disasters', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Disaster feed HTTP ${res.status}`);
  const json = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return json.events.map((e: any) => ({
    id: e.id,
    title: e.title,
    category: e.categories?.[0]?.title ?? 'Lainnya',
    date: e.geometry?.[0]?.date ?? e.geometry?.date ?? null,
    lat: e.geometry?.[0]?.coordinates?.[1] ?? e.geometry?.coordinates?.[1] ?? null,
    lng: e.geometry?.[0]?.coordinates?.[0] ?? e.geometry?.coordinates?.[0] ?? null,
    source: 'NASA EONET',
  }));
}

// ─── Cuaca (Open-Meteo — LIVE) ───────────────────────────────────────────────
export async function fetchWeather(lat: number, lng: number) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&hourly=temperature_2m,windspeed_10m`
  );
  return res.json();
}

// ─── Kualitas Udara Real-Time (Open-Meteo Air Quality — LIVE) ────────────────
export interface AirQualityCurrent {
  time?: string;
  pm10?: number;
  pm2_5?: number;
  ozone?: number;
  us_aqi?: number;
}

export async function fetchAirQualityLive(
  locations: Array<{ lat: number; lng: number }>,
): Promise<Array<AirQualityCurrent | null>> {
  const params = new URLSearchParams({
    latitude: locations.map(location => location.lat).join(','),
    longitude: locations.map(location => location.lng).join(','),
  });
  const res = await fetch(`/api/environment/air-quality?${params}`, { cache: 'no-store' });
  if (!res.ok) {
    const data = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error || `Air quality API HTTP ${res.status}`);
  }

  const data = await res.json() as Array<{ current?: AirQualityCurrent }> | { current?: AirQualityCurrent };
  const locationsData = Array.isArray(data) ? data : [data];
  return locationsData.map(location => location.current ?? null);
}

// ─── Nilai tukar intraday 1 menit melalui Cloudflare Worker ─────────────────
export interface LiveExchangeRates {
  result: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  quote_timestamps: Record<string, number>;
  provider: string;
}

export async function fetchExchangeRates(base = 'USD'): Promise<LiveExchangeRates> {
  const response = await fetch(`/api/forex?base=${encodeURIComponent(base)}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error || `Kutipan mata uang HTTP ${response.status}`);
  }

  const data = await response.json() as LiveExchangeRates;
  if (data.result !== 'success' || Object.keys(data.conversion_rates || {}).length === 0) {
    throw new Error('Sumber kutipan intraday tidak mengembalikan data terbaru.');
  }
  return data;
}

export interface IntradayExchangeRatePoint {
  timestamp: number;
  rate: number;
}

export async function fetchIntradayExchangeRate(
  currency: string,
): Promise<IntradayExchangeRatePoint[]> {
  const response = await fetch(
    `/api/forex/intraday?currency=${encodeURIComponent(currency)}`,
    { cache: 'no-store' },
  );
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error || `Kurs intraday HTTP ${response.status}`);
  }

  const data = await response.json() as {
    rates?: IntradayExchangeRatePoint[];
  };
  return (data.rates ?? [])
    .filter(point => Number.isFinite(point.timestamp) && Number.isFinite(point.rate) && point.rate > 0)
    .sort((a, b) => a.timestamp - b.timestamp);
}

// ─── Saham & Kuotasi Forex (Alpha Vantage — LIVE) ────────────────────────────
export async function fetchStockPrice(ticker: string) {
  if (!ALPHAVANTAGE_KEY) return null;
  const res = await fetch(
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHAVANTAGE_KEY}`
  );
  return res.json();
}

// ─── Kutipan komoditas intraday melalui Cloudflare Worker ───────────────────
export async function fetchLiveCommodities() {
  const response = await fetch('/api/commodities', { cache: 'no-store' });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error || `Kutipan komoditas HTTP ${response.status}`);
  }
  const data = await response.json() as Array<{
    name: string;
    symbol: string;
    price: string;
    unit: string;
    date: string;
    source: string;
  }>;
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('Sumber komoditas tidak mengembalikan kutipan terbaru.');
  }
  return data;
}

// ─── AI Intelligence Multi-Provider (Cloudflare Worker Proxy) ────────────────
export interface AIAnalysisResult {
  success: boolean;
  text?: string;
  provider?: string;
  fallbackOccurred?: boolean;
  attempts?: { provider: string; status: 'success' | 'failed'; error?: string }[];
  error?: string;
}

export async function runAIAnalysis(prompt: string, preferredProvider?: string): Promise<AIAnalysisResult> {
  const systemPrompt = 'Anda adalah AI Global Intelligence Analyst untuk platform World Monitor. Berikan analisis ringkas, tajam, profesional, dan berbasis data tanpa basa-basi.';

  // 1. Coba panggil via Edge API Gateway Cloudflare
  try {
    const res = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, provider: preferredProvider, systemPrompt }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.text) return data;
    }
  } catch (e) {
    // Lanjut ke fallback client-side langsung di bawah
  }

  // 2. Fallback Langsung di Browser (Jika mode dev lokal atau Worker belum dideploy)
  const groqKey = import.meta.env.VITE_GROQ_KEY as string;
  const geminiKey = import.meta.env.VITE_GEMINI_KEY as string;
  const deepseekKey = import.meta.env.VITE_DEEPSEEK_KEY as string;
  const openaiKey = import.meta.env.VITE_OPENAI_KEY as string;
  const mistralKey = import.meta.env.VITE_MISTRAL_KEY as string;
  const openrouterKey = import.meta.env.VITE_OPENROUTER_KEY as string;

  // 1. Coba OpenRouter (Primary #1 AI Gateway)
  if (openrouterKey) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'https://world-monitoring.jack-ai.my.id',
          'X-Title': 'World Monitor Intelligence',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 1500,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const text = d.choices?.[0]?.message?.content;
        if (text) return { success: true, text, provider: 'OpenRouter (Primary AI)' };
      }
    } catch {
      // lanjut ke gemini
    }
  }

  // 2. Coba Google Gemini 2.0 Flash (Backup #2)
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { success: true, text, provider: 'Google Gemini (2.0 Flash)' };
      }
    } catch {
      // lanjut ke deepseek
    }
  }

  // 3. Coba DeepSeek V3 (Backup #3)
  if (deepseekKey) {
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deepseekKey}` },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const text = d.choices?.[0]?.message?.content;
        if (text) return { success: true, text, provider: 'DeepSeek V3' };
      }
    } catch {
      // lanjut ke openai
    }
  }

  // 4. Coba OpenAI GPT-4o-mini (Backup #4)
  if (openaiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const text = d.choices?.[0]?.message?.content;
        if (text) return { success: true, text, provider: 'OpenAI GPT-4o-mini' };
      }
    } catch {
      // lanjut ke groq
    }
  }

  // 5. Coba Groq Llama 3.3 (Backup #5)
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 1500,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const text = d.choices?.[0]?.message?.content;
        if (text) return { success: true, text, provider: 'Groq (Llama 3.3 70B - Backup 5)' };
      }
    } catch {
      // lanjut ke mistral
    }
  }

  // 6. Coba Mistral AI (Backup #6)
  if (mistralKey) {
    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${mistralKey}` },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
          temperature: 0.5,
          max_tokens: 1500,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        const text = d.choices?.[0]?.message?.content;
        if (text) return { success: true, text, provider: 'Mistral AI' };
      }
    } catch {
      // failover habis
    }
  }

  return {
    success: false,
    error: 'Semua AI provider mengalami kendala atau kuota habis. Silakan periksa koneksi atau coba sesaat lagi.',
  };
}

export interface WebsiteChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendWebsiteChatMessage(messages: WebsiteChatMessage[]): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messages.slice(-8) }),
  });
  const data = await response.json().catch(() => null) as {
    success?: boolean;
    text?: string;
    error?: string;
  } | null;
  if (!response.ok || !data?.success || typeof data.text !== 'string') {
    throw new Error(data?.error || `Chat AI gagal merespons (HTTP ${response.status}).`);
  }
  return data.text;
}

export async function fetchAvailableAIProviders(): Promise<{ id: string; name: string }[]> {
  try {
    const res = await fetch('/api/ai/providers');
    if (!res.ok) return [];
    const data = await res.json();
    return data.available || [];
  } catch {
    return [];
  }
}

// ─── GDP terbaru yang tersedia (World Bank; data tahunan) ────────────────────
export interface LiveGDPRecord {
  code: string;
  iso3: string;
  name: string;
  gdpTrillion: number;
  year: string;
}

export async function fetchGlobalGDP(): Promise<LiveGDPRecord[]> {
  const codes = 'USA;CHN;DEU;JPN;IND;GBR;FRA;IDN';
  const nameMap: Record<string, { code: string; name: string }> = {
    USA: { code: 'US', name: 'Amerika Serikat' },
    CHN: { code: 'CN', name: 'Tiongkok' },
    DEU: { code: 'DE', name: 'Jerman' },
    JPN: { code: 'JP', name: 'Jepang' },
    IND: { code: 'IN', name: 'India' },
    GBR: { code: 'GB', name: 'Inggris' },
    FRA: { code: 'FR', name: 'Prancis' },
    IDN: { code: 'ID', name: 'Indonesia' },
  };

  try {
    const res = await fetch(
      `https://api.worldbank.org/v2/country/${codes}/indicator/NY.GDP.MKTP.CD?format=json&mrv=1`,
      { cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`World Bank GDP API failed (HTTP ${res.status})`);
    const json = await res.json();
    if (!json?.[1]) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return json[1].map((item: any) => {
      const iso = item.countryiso3code;
      const meta = nameMap[iso] || { code: iso, name: item.country.value };
      return {
        code: meta.code,
        iso3: iso,
        name: meta.name,
        gdpTrillion: item.value ? +(item.value / 1e12).toFixed(2) : 0,
        year: item.date,
      };
    }).sort((a: LiveGDPRecord, b: LiveGDPRecord) => b.gdpTrillion - a.gdpTrillion);
  } catch (err) {
    console.error('Failed to load World Bank GDP:', err);
    return [];
  }
}

// ─── Inflasi tahunan terbaru yang diterbitkan World Bank ────────────────────
export interface LiveInflationRecord {
  code: string;
  name: string;
  inflationYoY: number;
  year: string;
}

export async function fetchGlobalInflation(): Promise<LiveInflationRecord[]> {
  const codes = 'USA;CHN;DEU;JPN;IND;GBR;FRA;IDN';
  const nameMap: Record<string, { code: string; name: string }> = {
    USA: { code: 'US', name: 'Amerika Serikat' },
    CHN: { code: 'CN', name: 'Tiongkok' },
    DEU: { code: 'DE', name: 'Jerman' },
    JPN: { code: 'JP', name: 'Jepang' },
    IND: { code: 'IN', name: 'India' },
    GBR: { code: 'GB', name: 'Inggris' },
    FRA: { code: 'FR', name: 'Prancis' },
    IDN: { code: 'ID', name: 'Indonesia' },
  };

  try {
    const res = await fetch(
      `https://api.worldbank.org/v2/country/${codes}/indicator/FP.CPI.TOTL.ZG?format=json&mrv=1`
    );
    const json = await res.json();
    if (!json?.[1]) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return json[1].map((item: any) => {
      const iso = item.countryiso3code;
      const meta = nameMap[iso] || { code: iso, name: item.country.value };
      return {
        code: meta.code,
        name: meta.name,
        inflationYoY: item.value !== null ? +Number(item.value).toFixed(2) : 0,
        year: item.date,
      };
    });
  } catch (err) {
    console.error('Failed to load World Bank Inflation:', err);
    return [];
  }
}

// ─── GDP Spesifik per Negara (World Bank) ────────────────────────────────────
export async function fetchGDP(countryCode: string, years = 5) {
  const res = await fetch(
    `https://api.worldbank.org/v2/country/${countryCode}/indicator/NY.GDP.MKTP.CD?format=json&mrv=${years}`
  );
  const json = await res.json();
  return json[1];
}

export async function fetchInflation(countryCode: string) {
  const res = await fetch(
    `https://api.worldbank.org/v2/country/${countryCode}/indicator/FP.CPI.TOTL.ZG?format=json&mrv=5`
  );
  const json = await res.json();
  return json[1];
}

// ─── Utilitas ─────────────────────────────────────────────────────────────────
export function categoryToIcon(category: string): string {
  const map: Record<string, string> = {
    Wildfires: 'FIRE',
    'Severe Storms': 'STORM',
    Volcanoes: 'VOLCANO',
    Floods: 'FLOOD',
    Earthquakes: 'SEISMIC',
    Landslides: 'LANDSLIDE',
    Drought: 'DROUGHT',
    'Sea and Lake Ice': 'ICE',
    default: 'EVENT',
  };
  return map[category] ?? map.default;
}

export function severityColor(magnitude: number | null): string {
  if (!magnitude) return 'text-gray-400';
  if (magnitude >= 7) return 'text-red-400';
  if (magnitude >= 5) return 'text-orange-400';
  return 'text-yellow-400';
}

// ─── Berita Sains & Teknologi Global (GDELT) ─────────────────────────────────
export interface TechnologyNewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  country: string;
  publishedAt: string;
}

export async function fetchTechnologyNews(): Promise<TechnologyNewsItem[]> {
  const res = await fetch('/api/technology/news', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Gagal memuat berita sains dan teknologi (HTTP ${res.status})`);
  }
  return res.json();
}

// ─── Geopolitik & Konflik Global (GDELT Project & UN ReliefWeb) ─────────────
export interface GeopoliticalEvent {
  id: string;
  title: string;
  category: string;
  source: string;
  date: string;
  lat?: number | null;
  lng?: number | null;
  url?: string | null;
}

export async function fetchGeopoliticalEvents(): Promise<GeopoliticalEvent[]> {
  try {
    const res = await fetch('/api/geopolitics');
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('Failed to load geopolitical events:', err);
    return [];
  }
}

// ─── Transportasi Udara (OpenSky ADS-B Radar) ────────────────────────────────
export interface LiveFlight {
  icao24: string;
  callsign: string;
  country: string;
  lng: number;
  lat: number;
  altitude: number;
  velocity: number;
  heading: number;
}

export async function fetchLiveFlights(): Promise<LiveFlight[]> {
  const res = await fetch('/api/transport/flights', { cache: 'no-store' });
  if (!res.ok) {
    const data = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error || `OpenSky API HTTP ${res.status}`);
  }
  return res.json();
}

export interface LiveShip {
  mmsi: string;
  name: string;
  lng: number;
  lat: number;
  speed: number | null;
  heading: number | null;
  receivedAt: number;
}

export function createLiveShipsSocket(): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return new WebSocket(`${protocol}//${window.location.host}/api/transport/ships`);
}

// ─── Energi Global (U.S. EIA Data) ───────────────────────────────────────────
export async function fetchEnergyData() {
  try {
    const res = await fetch('/api/energy');
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to load energy data:', err);
    return null;
  }
}

// ─── Emisi Karbon Listrik (Electricity Maps) ─────────────────────────────────
export async function fetchCarbonEmissions(zone = 'US') {
  try {
    const res = await fetch(`/api/energy/emissions?zone=${zone}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to load carbon emissions:', err);
    return null;
  }
}

// ─── YouTube Data API v3 Live Search ─────────────────────────────────────────
export interface YouTubeLiveItem {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  publishedAt: string;
}

export async function fetchYouTubeLiveDisasters(query = 'earthquake natural disaster live stream'): Promise<YouTubeLiveItem[]> {
  const res = await fetch(`/api/youtube/live?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
  if (!res.ok) {
    const errorData = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(errorData?.error || `YouTube live API HTTP ${res.status}`);
  }
  const data = await res.json() as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        channelTitle?: string;
        thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
        publishedAt?: string;
      };
    }>;
  };
  if (!Array.isArray(data.items)) throw new Error('Respons YouTube live tidak valid.');

  return data.items.flatMap(item => {
    const id = item.id?.videoId;
    if (!id) return [];
    return [{
      id,
      title: item.snippet?.title || 'Live Broadcast',
      channel: item.snippet?.channelTitle || 'YouTube Live',
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      publishedAt: item.snippet?.publishedAt || '',
    }];
  });
}

// ─── Berita Bencana & Krisis Terkini (YouTube Data API v3 Video Reports) ──────
export async function fetchYouTubeDisasterNews(query = 'natural disaster earthquake volcano eruption breaking news'): Promise<YouTubeLiveItem[]> {
  const ytKey = (import.meta.env.VITE_YOUTUBE_KEY as string) || 'AIzaSyAUpjD_u3txwJbUlXg3yLEQb_9gI5EmFrQ';
  if (ytKey) {
    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date&q=${encodeURIComponent(query)}&maxResults=10&key=${ytKey}`;
      const res = await fetch(apiUrl);
      const data = await res.json();
      if (data.items) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.items.map((item: any) => ({
          id: item.id?.videoId,
          title: item.snippet?.title || 'Disaster Report',
          channel: item.snippet?.channelTitle || 'News Wire',
          thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
          publishedAt: item.snippet?.publishedAt,
        })).filter((item: { id: string }) => !!item.id);
      }
    } catch (e) {
      console.error('Failed to fetch YouTube Disaster News:', e);
    }
  }
  return [];
}
