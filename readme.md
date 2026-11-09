<div align="center">
  <img src="./frontend/public/logo.png" alt="World Monitor Logo" width="120" height="120" style="border-radius: 20px;" />
  
  # 🌍 World Monitor
  ### Real-Time Global Intelligence & Situational Awareness Platform
  
  [![Live Production](https://img.shields.io/badge/🌐_LIVE-world--monitoring.jack--ai.my.id-00E5FF?style=for-the-badge&labelColor=0A0F24)](https://world-monitoring.jack-ai.my.id)
  [![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
  [![React 18](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
  [![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
  [![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Schema-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
  [![License MIT](https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge)](LICENSE)

  <br />

  **Platform pemantauan intelijen global real-time berstandar enterprise.**
  <br />
  Mengintegrasikan satelit NASA EONET, seismograf USGS, monitor ekonomi, radar cuaca Windy,
  <br />
  YouTube Data API v3 untuk siaran bencana live, serta analisis AI multi-provider.

  <br />

  [🚀 **Open Live Platform**](https://world-monitoring.jack-ai.my.id) · [📖 Documentation](#-setup--installation) · [🛡️ Security](#️-security-features) · [🗄️ Database](#️-database-schema)
</div>

---

## ✨ Key Features

| Feature | Description |
|:--------|:------------|
| 🌐 **3D Interactive Globe** | Visualisasi bumi 3D dengan siklus siang/malam NASA, poligon negara HD, dan marker real-time |
| 📊 **Statistical Dashboard** | Agregasi KPI: PDB World Bank, gempa USGS, kurs valas, dan bencana NASA |
| 🔴 **Disaster & Seismic Monitor** | Pantauan gempa M4.5+ (USGS), bencana NASA EONET, siaran live YouTube 24/7, radar cuaca Windy |
| 💹 **Financial Terminal** | Kurs terbaru, grafik historis referensi harian ECB, komoditas (WTI, Gas, Tembaga), dan sesi pasar global |
| 🌫️ **Air Quality Heatmap** | Sensor AQI, PM2.5, PM10, Ozon dari Open-Meteo untuk kota metropolitan |
| ⚡ **Energy Monitor** | Data energi EIA, intensitas karbon Electricity Maps |
| 🛰️ **Transport Radar** | Peta posisi pesawat OpenSky dan posisi/jejak kapal AISStream pada koridor pelayaran yang dipantau |
| 🤖 **AI Multi-Provider** | Auto-failover: Groq > Gemini > DeepSeek > OpenAI > Mistral > OpenRouter |
| 💬 **Website AI Chat** | Bantuan penggunaan World Monitor melalui Worker, batas pesan, dan throttling |
| 🏴 **Country Intelligence** | Profil 19+ negara dengan flag emoji, skor stabilitas, dan analisis regional |
| 📡 **Live Weather Radar** | Radar cuaca interaktif Windy dengan data Doppler global |
| 🎥 **YouTube Live Streams** | Siaran bencana 24/7 via YouTube Data API v3 dengan filter topik |
| 🔔 **Browser Notifications** | Notifikasi bencana via Web Push |
| ⭐ **Rating & Feedback** | Sistem rating bintang 1-5 dan komentar anonim dengan device fingerprinting (1 perangkat = 1 ID unik) |
| 🛡️ **Admin Panel** | Dashboard admin terpisah dengan kontrol maintenance, monitoring feedback, profil, dan log keamanan |
| 🔧 **Maintenance Mode** | Halaman maintenance kustom dengan logo dinamis, background tema, countdown, dan link WhatsApp |

---

## 📡 Real-Time Data Sources

| Source | Provider | Integration | Usage |
|:-------|:---------|:------------|:------|
| 🔬 Seismik & Gempa | **USGS Earthquake Hazards** | REST GeoJSON | Gempa M4.5+ global (7 hari) |
| 🛰️ Bencana Alam | **NASA EONET v3** | REST API | Kebakaran, siklon, erupsi, banjir |
| 💱 Valas & Kurs | **ExchangeRate-API** | REST API | Kurs terbaru untuk 160+ mata uang |
| 📈 PDB & Ekonomi | **World Bank Open Data** | REST JSON | PDB nominal & inflasi tahunan; tampilkan tahun terakhir yang tersedia |
| 🛢️ Komoditas | **Alpha Vantage** | REST API | WTI, Gas Alam, Tembaga |
| 📰 Berita Sains & Teknologi | **GDELT, Spaceflight News API, RSS** | REST / RSS | Berita terkini dari beberapa sumber cadangan |
| 🌬️ Kualitas Udara | **Open-Meteo** | REST API | AQI, PM2.5, PM10, Ozon |
| ✈️ Penerbangan | **OpenSky Network** | REST API | ADS-B radar real-time |
| ⚡ Energi | **U.S. EIA** | REST API | Data minyak & gas global |
| 🎥 Video Live | **YouTube Data API v3** | REST API | Siaran bencana & berita |
| 🌦️ Radar Cuaca | **Windy.com** | Embed | Radar Doppler interaktif |
| 🗺️ Peta Vektor | **MapTiler Cloud** | Vector Tiles | Dark-theme GIS tiles |
| 🌍 Geopolitik | **GDELT Project** | REST GeoJSON | Konflik & krisis global |

---

## 🛡️ Security Features

| Layer | Protection |
|:------|:-----------|
| **L3/L4 DDoS** | Cloudflare built-in DDoS mitigation (automatic) |
| **L7 Rate Limiting** | IP-based rate awareness + Cloudflare WAF rules |
| **HSTS** | `Strict-Transport-Security` max-age 1 year + preload |
| **XSS Protection** | `X-XSS-Protection: 1; mode=block` + CSP headers |
| **Content Security** | `Content-Security-Policy` with strict frame-src |
| **Clickjacking** | `X-Frame-Options: SAMEORIGIN` |
| **MIME Sniffing** | `X-Content-Type-Options: nosniff` |
| **Referrer** | `strict-origin-when-cross-origin` |
| **Input Sanitization** | XSS/SQL injection vector stripping pada semua API input |
| **Auth** | Admin panel dengan timing-attack resistant login flow |
| **Permissions** | `Permissions-Policy` restricting camera/mic/geolocation |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE NETWORK                  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              worker.ts (Edge Gateway)                 │  │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────────────┐   │  │
│  │  │ Security │  │ API      │  │ SPA Fallback      │   │  │
│  │  │ Headers  │  │ Router   │  │ + Asset Serving   │   │  │
│  │  │ + Rate   │  │ + AI     │  │ + Cache Control   │   │  │
│  │  │ Limiting │  │ Failover │  │                   │   │  │
│  │  └──────────┘  └────┬─────┘  └───────────────────┘   │  │
│  └──────────────────────┼───────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌──────────────┐
   │ NASA EONET  │ │ USGS Quake  │ │ YouTube API  │
   │ World Bank  │ │ Open-Meteo  │ │ ExchangeRate │
   │ GDELT       │ │ OpenSky     │ │ Alpha Vantage│
   │ EIA Energy  │ │ Elec. Maps  │ │ MapTiler     │
   └─────────────┘ └─────────────┘ └──────────────┘
```

---

## 🧭 All Pages & Routes

| Page | Route | Description |
|:-----|:------|:------------|
| Landing | `/` | Animated hero & platform overview |
| Country Intelligence | `/intelligence` | National stability scores with flag emojis |
| Dashboard | `/dashboard` | Real-time KPI aggregation center |
| 3D Globe | `/map` | Interactive Earth with day/night cycle |
| Financial Monitor | `/ekonomi` | Forex terminal & commodity tracker |
| Air Quality | `/lingkungan` | AQI heatmap & pollution sensors |
| Geopolitical | `/geopolitik` | GDELT conflict & UN crisis reports |
| Disaster Monitor | `/bencana` | Seismic + EONET + YouTube live + Windy radar |
| Energy | `/energi` | EIA petroleum & carbon intensity |
| Technology | `/teknologi` | Tech sector monitoring |
| Transport | `/transportasi` | Flight radar & vessel tracking |
| Data Explorer | `/data` | Raw data inspection tools |
| Notifications | `/notifikasi` | Browser push notification center |
| Settings | `/pengaturan` | Platform configuration |
| **Admin Login** | `/auth/admin` | Standalone admin authentication (hidden) |
| **Admin Dashboard** | `/admin/dashboard` | Admin control panel (maintenance, feedback, profile, logs) |
| **Maintenance** | `/maintenance` | Customizable maintenance page (fullscreen) |

---

## ⭐ Rating & Feedback System

Sistem ulasan pengunjung dengan identitas perangkat unik dan persisten.

### Cara Kerja
- Setiap perangkat fisik mendapatkan **1 ID unik permanen** (contoh: `Anonim100`, `Anonim1212`)
- ID konsisten di semua browser (Chrome, Edge, Brave, Firefox) pada perangkat yang sama
- Fingerprinting berbasis: IP + User-Agent hardware model + screen + touchPoints + CPU cores
- Nama anonim **terkunci** oleh sistem, pengguna tidak bisa mengubah ID unik
- Rating bintang 1-5 dengan komentar opsional
- 1 perangkat = 1 rating (bisa diperbarui, tidak bisa duplikat)

### API Endpoints

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/feedback` | Ambil daftar ulasan & statistik |
| `POST` | `/api/feedback` | Kirim rating baru (body: `{ rating, comment }`) |

---

## 🛡️ Admin Panel

Panel administrasi terpisah (tanpa sidebar monitoring) yang hanya bisa diakses via `/auth/admin`.

### Fitur Admin

| Tab | Fungsi |
|:----|:-------|
| **Overview** | Status API, statistik pengunjung, ringkasan sistem |
| **Maintenance** | Saklar maintenance mode, edit judul/pesan/durasi/logo/background |
| **API Status** | Monitor kesehatan setiap integrasi API |
| **Security Log** | Log akses dan aktivitas keamanan |
| **Profile** | Ganti nama admin, email, dan password |
| **Feedback** | Monitor ulasan & rating pengunjung |

### Maintenance Page Editor
- Logo dinamis (SHIELD/WRENCH/ALERT/SERVER)
- Background warna kustom dengan efek glow
- Countdown estimasi durasi perbaikan
- Kontak email & nomor WhatsApp
- Pesan penjelasan kepada pengunjung

---

## 🗄️ Database Schema

File schema PostgreSQL tersedia di [`database/schema.sql`](./database/schema.sql).

### Tabel

| Tabel | Deskripsi |
|:------|:----------|
| `devices` | Registrasi perangkat unik (1 HP = 1 ID). Fingerprint hash, tipe perangkat, IP, screen resolution |
| `user_ratings` | Rating bintang 1-5 dan komentar anonim. FK ke `devices.device_id`, 1 rating per perangkat |

### Setup Database
```sql
-- Jalankan schema di PostgreSQL
psql -U your_user -d your_database -f database/schema.sql
```

> **Catatan:** File schema hanya berisi struktur tabel dan query template (dalam komentar). Tidak ada data sample. Isi data melalui aplikasi atau insert manual.

---

## 💻 Setup & Installation

### Prerequisites
- Node.js 18+
- npm atau yarn
- PostgreSQL 14+ (opsional, untuk persistent storage)

### 1. Clone & Install
```bash
git clone https://github.com/fxcomunity/world-monitor.git
cd world-monitor/frontend
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` dengan API key masing-masing:
```env
# Required
VITE_MAPTILER_KEY=your_maptiler_key
VITE_EXCHANGERATE_KEY=your_exchangerate_key

# Optional (AI Multi-Provider)
VITE_GEMINI_KEY=your_gemini_key
VITE_GROQ_KEY=your_groq_key
VITE_DEEPSEEK_KEY=your_deepseek_key
VITE_OPENAI_KEY=your_openai_key

# Optional (Monitors)
VITE_YOUTUBE_KEY=your_youtube_data_api_v3_key
VITE_ALPHAVANTAGE_KEY=your_alphavantage_key
VITE_EIA_KEY=your_eia_key
```

### 3. Setup Database (Opsional)
```bash
psql -U your_user -d your_database -f database/schema.sql
```

### 4. Run Local Development Servers
Jalankan dari folder `frontend`:
```bash
npm run dev
```

Perintah ini membangun aset awal bila diperlukan, menjalankan Cloudflare Worker lokal pada port `8787`, menunggu API siap, lalu menjalankan Vite. Vite mem-proxy `/api/*` ke Worker tersebut. Wrangler membaca `frontend/.dev.vars` untuk secret API Worker lokal.

Untuk API key API Indonesia saat development, salin `frontend/.dev.vars.example` menjadi `frontend/.dev.vars`, lalu isi nilainya:
```env
APIINDONESIA_KEY=api_key_dari_dashboard_apiindonesia
```
Jangan menaruh key ini di `.env` root, kode frontend, atau variabel `VITE_*`; Worker membaca `frontend/.dev.vars` dan menjaga key tetap di sisi server. Untuk production, atur secret dari folder `frontend`:
```bash
npx wrangler secret put APIINDONESIA_KEY
```

Buka `http://localhost:5173` di browser. Untuk Laragon/Apache, akses `http://EXPLOREID.test` dan pastikan Worker lokal tetap berjalan pada port `8787`; file `.htaccess` lokal meneruskan `/api/*` ke Worker.

### 5. Build for Production
```bash
npm run build
```

### 6. Deploy to Cloudflare Workers
```bash
npm run deploy
```

### 7. API access and rate limiting
Turnstile verification is disabled. Public API endpoints can be called without a verification session. The AI chat endpoint still applies its application-level request limit; configure Cloudflare rate-limiting or WAF rules if additional protection is needed.

---

## 📁 Project Structure

```
world-monitor/
├── README.md
├── database/
│   └── schema.sql                  # PostgreSQL schema (devices + ratings)
├── frontend/
│   ├── worker.ts                   # Cloudflare Edge Worker (API Gateway + Security)
│   ├── wrangler.toml               # Cloudflare Workers config
│   ├── vite.config.ts              # Vite bundler config
│   ├── index.html                  # SPA entry + OG meta tags
│   ├── public/
│   │   ├── logo.png                # Platform logo
│   │   ├── favicon.png             # Favicon
│   │   ├── admin-shield-logo.png   # Admin panel logo
│   │   └── like-globe-icon.png     # Rating feedback icon
│   └── src/
│       ├── App.tsx                 # Root layout (Sidebar + Mobile drawer + Feedback widget)
│       ├── main.tsx                # React Router v6 routes
│       ├── index.css               # Global styles + scroll behavior
│       ├── lib/
│       │   ├── api.ts              # Centralized API integration layer
│       │   └── auth.ts             # Admin auth cookie helpers
│       ├── components/
│       │   ├── Sidebar.tsx         # Desktop collapsible + mobile drawer
│       │   ├── RatingFeedbackModal.tsx  # Star rating + comment modal
│       │   └── AdminProfileButton.tsx  # Admin profile dropdown
│       └── pages/
│           ├── Landing.tsx         # Hero landing page
│           ├── Home.tsx            # Country Intelligence (flag emojis)
│           ├── Dashboard.tsx       # Statistical KPI Dashboard
│           ├── Map.tsx             # 3D Globe (Three.js + globe.gl)
│           ├── EconomicMonitor.tsx  # Forex & commodity tracker
│           ├── Environment.tsx     # Air quality heatmap
│           ├── GeopoliticalMonitor.tsx  # GDELT conflict monitor
│           ├── DisasterMonitor.tsx # Seismic + EONET + YouTube + Windy
│           ├── EnergyMonitor.tsx   # EIA petroleum data
│           ├── TechMonitor.tsx     # Tech sector monitoring
│           ├── TransportMonitor.tsx # Flight & vessel radar
│           ├── DataExplorer.tsx    # Raw data inspection
│           ├── NotificationCenter.tsx  # Push notification center
│           ├── Settings.tsx        # Platform configuration
│           ├── AdminLogin.tsx      # Admin auth page (/auth/admin)
│           ├── AdminDashboard.tsx  # Admin control panel (/admin/dashboard)
│           └── MaintenancePage.tsx # Maintenance page (/maintenance)
```

---

## 🤝 Tech Stack

| Layer | Technology |
|:------|:-----------|
| **Frontend** | React 18, TypeScript 5, Vite 5, Tailwind CSS |
| **3D/GIS** | Three.js, globe.gl, MapLibre GL JS |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Runtime** | Cloudflare Workers (Edge Compute) |
| **Database** | PostgreSQL (schema provided) |
| **AI** | Multi-provider failover (6 providers) |
| **Security** | CSP, HSTS, XSS Protection, Rate Limiting |

---

## 📄 License

Distributed under the **MIT License**. Free for research, academic, and situational awareness system development.

---

<div align="center">
  <br />
  <img src="./frontend/public/logo.png" alt="World Monitor" width="40" height="40" style="border-radius: 8px;" />
  <br />
  <b>World Monitor</b>
  <br />
  Global Real-Time Intelligence Platform
  <br />
  <a href="https://world-monitoring.jack-ai.my.id">world-monitoring.jack-ai.my.id</a>
  <br /><br />
  Built with ❤️ and ☕ for a safer world.
</div>
