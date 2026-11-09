import React, { useState, useEffect } from 'react';
import {
  Database, Download, RefreshCw, FileText,
  Search, Table, Filter, CheckCircle2
} from 'lucide-react';
import {
  fetchEarthquakes,
  fetchDisasters,
  fetchExchangeRates,
  fetchLiveCommodities,
  fetchGeopoliticalEvents
} from '../lib/api';

type DatasetType = 'QUAKES' | 'DISASTERS' | 'FOREX' | 'COMMODITIES' | 'GEOPOLITICS';

export default function DataExplorer() {
  const [activeDataset, setActiveDataset] = useState<DatasetType>('QUAKES');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const loadDataset = async (type: DatasetType) => {
    setLoading(true);
    setData([]);
    try {
      if (type === 'QUAKES') {
        const res = await fetchEarthquakes();
        setData(res);
      } else if (type === 'DISASTERS') {
        const res = await fetchDisasters();
        setData(res);
      } else if (type === 'FOREX') {
        const res = await fetchExchangeRates('USD');
        const rates = Object.entries(res.conversion_rates || {}).map(([currency, rate]) => ({
          base: 'USD',
          currency,
          rate,
        }));
        setData(rates);
      } else if (type === 'COMMODITIES') {
        const res = await fetchLiveCommodities();
        setData(res);
      } else if (type === 'GEOPOLITICS') {
        const res = await fetchGeopoliticalEvents();
        setData(res);
      }
    } catch (e) {
      console.error('Failed to load dataset:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDataset(activeDataset);
    if (activeDataset !== 'FOREX' && activeDataset !== 'COMMODITIES') return;
    const interval = window.setInterval(() => loadDataset(activeDataset), 60 * 1000);
    return () => window.clearInterval(interval);
  }, [activeDataset]);

  // Export to JSON
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `world-monitor-${activeDataset.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  // Export to CSV
  const exportCSV = () => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(obj =>
      headers.map(h => `"${String(obj[h] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `world-monitor-${activeDataset.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  // Search filter
  const filteredData = data.filter(item =>
    JSON.stringify(item).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#060D1F] text-gray-200 p-4 lg:p-6 space-y-6">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-cyan-900/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase">
              RAW INTELLIGENCE REPOSITORY
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2 mt-1">
            <Database className="w-6 h-6 text-cyan-400" />
            Live Data Explorer & Export Engine
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Eksplorasi dataset mentah telemetri real-time dengan kemampuan ekspor instan ke JSON dan CSV.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={loading || data.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/40 text-cyan-300 text-xs font-mono transition"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor CSV
          </button>
          <button
            onClick={exportJSON}
            disabled={loading || data.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs font-mono transition"
          >
            <FileText className="w-3.5 h-3.5" />
            Ekspor JSON
          </button>
        </div>
      </div>

      {/* ─── DATASET SELECTOR ─── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-cyan-900/30 pb-3">
        {[
          { id: 'QUAKES', label: 'Gempa Bumi (USGS)' },
          { id: 'DISASTERS', label: 'Bencana Alam (NASA)' },
          { id: 'FOREX', label: 'Kurs Valas 160+ Mata Uang' },
          { id: 'COMMODITIES', label: 'Komoditas Spot' },
          { id: 'GEOPOLITICS', label: 'Geopolitik (GDELT/PBB)' },
        ].map(ds => (
          <button
            key={ds.id}
            onClick={() => setActiveDataset(ds.id as DatasetType)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition ${
              activeDataset === ds.id
                ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                : 'bg-[#081226] text-gray-400 hover:text-white border border-cyan-950'
            }`}
          >
            {ds.label}
          </button>
        ))}
      </div>

      {/* ─── SEARCH & STATS ─── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="text-xs font-mono text-gray-400">
          Menampilkan <strong className="text-cyan-400">{filteredData.length}</strong> dari {data.length} baris data aktif
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-500" />
          <input
            type="text"
            placeholder="Cari baris data mentah..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded bg-black/40 border border-cyan-900/50 text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* ─── RAW TABLE EXPLORER ─── */}
      <div className="rounded-xl bg-[#081226] border border-cyan-900/50 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-20 text-cyan-500/70 text-xs font-mono">
              Memuat dataset mentah langsung dari edge pipeline...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-20 text-gray-500 text-xs font-mono">
              Tidak ada data yang cocok dengan kriteria pencarian.
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] uppercase text-gray-400 bg-black/60 border-b border-cyan-950 sticky top-0 backdrop-blur-md">
                <tr>
                  {Object.keys(filteredData[0]).map(key => (
                    <th key={key} className="py-2.5 px-3 whitespace-nowrap">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-950/40">
                {filteredData.slice(0, 100).map((row, idx) => (
                  <tr key={idx} className="hover:bg-cyan-950/20 transition">
                    {Object.keys(row).map(key => (
                      <td key={key} className="py-2 px-3 whitespace-nowrap text-gray-300">
                        {typeof row[key] === 'object' && row[key] !== null
                          ? JSON.stringify(row[key])
                          : String(row[key] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
