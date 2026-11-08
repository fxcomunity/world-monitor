import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface TurnstileApi {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      'error-callback': () => void;
      'expired-callback': () => void;
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

async function readApiJson<T>(response: Response, endpoint: string): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      `${endpoint} mengembalikan halaman web, bukan respons API (HTTP ${response.status}). `
      + 'Request belum masuk ke Cloudflare Worker. Pastikan route domain mengarah ke Worker world-monitor dan deploy Worker terbaru.'
    );
  }
  return response.json() as Promise<T>;
}

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  const scriptPromise = new Promise<void>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-turnstile-script]');
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.turnstileScript = 'true';
      document.head.appendChild(script);
    }

    script.addEventListener('load', () => {
      if (window.turnstile) resolve();
      else reject(new Error('Widget Turnstile tidak dapat dimuat.'));
    }, { once: true });
    script.addEventListener('error', () => reject(new Error('Gagal memuat widget Turnstile.')), { once: true });
  });
  const sharedPromise = scriptPromise.catch(error => {
    turnstileScriptPromise = null;
    throw error;
  });
  turnstileScriptPromise = sharedPromise;
  return sharedPromise;
}

export default function TurnstileGate({ children }: { children: React.ReactNode }) {
  const widgetContainer = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const verifying = useRef(false);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionCheckVersion, setSessionCheckVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSiteKey(null);

    const initialize = async () => {
      try {
        const sessionResponse = await fetch('/api/turnstile/session', { cache: 'no-store' });
        if (sessionResponse.status === 204) {
          if (active) setVerified(true);
          return;
        }
        if (sessionResponse.status !== 401) {
          const sessionError = await readApiJson<{ error?: string }>(
            sessionResponse,
            '/api/turnstile/session'
          );
          throw new Error(sessionError.error || `Pemeriksaan sesi gagal (HTTP ${sessionResponse.status}).`);
        }

        const configResponse = await fetch('/api/turnstile/config', { cache: 'no-store' });
        const config = await readApiJson<{ siteKey?: string; error?: string }>(
          configResponse,
          '/api/turnstile/config'
        );
        if (!configResponse.ok || !config.siteKey) {
          throw new Error(config.error || 'Konfigurasi Turnstile belum tersedia.');
        }
        if (active) setSiteKey(config.siteKey);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Gagal menyiapkan verifikasi manusia.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void initialize();
    return () => {
      active = false;
    };
  }, [sessionCheckVersion]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setVerified(false);
      setLoading(true);
      setError(null);
      setSessionCheckVersion(version => version + 1);
    };

    window.addEventListener('wm:turnstile-session-expired', handleSessionExpired);
    return () => window.removeEventListener('wm:turnstile-session-expired', handleSessionExpired);
  }, []);

  useEffect(() => {
    if (!siteKey || !widgetContainer.current) return;
    let active = true;

    const renderWidget = async () => {
      try {
        await loadTurnstileScript();
        if (!active || !widgetContainer.current || !window.turnstile) return;

        widgetId.current = window.turnstile.render(widgetContainer.current, {
          sitekey: siteKey,
          callback: token => {
            if (verifying.current) return;
            verifying.current = true;
            setError(null);
            void fetch('/api/turnstile/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            }).then(async response => {
              if (!response.ok) {
                const result = await readApiJson<{ error?: string }>(response, '/api/turnstile/verify');
                throw new Error(result.error || 'Verifikasi gagal. Silakan coba lagi.');
              }
              const result = await readApiJson<{ success?: boolean }>(response, '/api/turnstile/verify');
              if (!result.success) throw new Error('Verifikasi gagal. Silakan coba lagi.');
              if (active) setVerified(true);
            }).catch(err => {
              if (active) {
                setError(err instanceof Error ? err.message : 'Verifikasi gagal. Silakan coba lagi.');
                if (widgetId.current) window.turnstile?.reset(widgetId.current);
              }
            }).finally(() => {
              verifying.current = false;
            });
          },
          'error-callback': () => {
            if (active) setError('Widget mengalami kendala. Periksa koneksi lalu coba lagi.');
          },
          'expired-callback': () => {
            if (active) setError('Token kedaluwarsa. Silakan lakukan verifikasi lagi.');
          },
        });
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat widget Turnstile.');
      }
    };

    void renderWidget();
    return () => {
      active = false;
      if (widgetId.current) {
        window.turnstile?.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [siteKey]);

  if (verified) return children;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060D1F] px-4 text-gray-200">
      <section className="w-full max-w-md rounded-xl border border-cyan-900/50 bg-[#081226] p-6 text-center shadow-2xl">
        <ShieldCheck className="mx-auto h-9 w-9 text-cyan-400" />
        <h1 className="mt-4 text-lg font-bold text-white">Verifikasi Keamanan</h1>
        <p className="mt-2 text-sm text-gray-400">
          Selesaikan pemeriksaan untuk memastikan Anda bukan bot sebelum melanjutkan.
        </p>

        {loading && <p className="mt-5 text-xs font-mono text-cyan-300">Menyiapkan pemeriksaan...</p>}
        {!loading && siteKey && <div ref={widgetContainer} className="mt-5 flex justify-center" />}
        {error && (
          <div role="alert" className="mt-4 rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-xs text-red-300">
            {error}
          </div>
        )}
        {error && !siteKey && !loading && (
          <p className="mt-3 text-[11px] text-gray-500">
            Admin: atur TURNSTILE_SITE_KEY dan TURNSTILE_SECRET_KEY pada Cloudflare Worker.
          </p>
        )}
      </section>
    </div>
  );
}
