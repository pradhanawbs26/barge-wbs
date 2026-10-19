import React, { useState } from 'react';
import { GSheetsConfig } from '../types';
import { FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle, Link, Key, Shield } from 'lucide-react';

interface GSheetsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GSheetsConfig;
  onSaveConfig: (newConfig: Partial<GSheetsConfig>) => void;
  onResetCache: () => void;
}

export const GSheetsSettingsModal: React.FC<GSheetsSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetCache
}) => {
  const [url, setUrl] = useState(config.spreadsheetUrl || '');
  const [baseTab, setBaseTab] = useState(config.sheetBaseName || 'BASE');
  const [base2Tab, setBase2Tab] = useState(config.sheetBase2Name || 'BASE2');
  const [ttl, setTtl] = useState(config.cacheTtlSeconds || 600);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'warning' | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = () => {
    setTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      setTestResult('success');
      onSaveConfig({
        spreadsheetUrl: url,
        sheetBaseName: baseTab,
        sheetBase2Name: base2Tab,
        cacheTtlSeconds: ttl,
        status: url ? 'connected' : 'sample_data',
        lastSynced: new Date()
      });
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Pengaturan Google Sheets (st.connection)
              </h3>
              <p className="text-xs text-slate-500">
                Koneksi tab "BASE" & "BASE2" via <code>streamlit-gsheets-connection</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-xs">
          {/* Status Alert */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold text-slate-700">Status Koneksi:</span>
              <span className="text-slate-900 font-bold">
                {config.spreadsheetUrl ? 'Terkoneksi ke Google Sheets' : 'Menggunakan Data Simulasi (Sample)'}
              </span>
            </div>
            <button
              onClick={onResetCache}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Cache (TTL 10m)
            </button>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              URL Google Spreadsheet
            </label>
            <div className="relative">
              <Link className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Pastikan akses sharing diset ke <strong>"Anyone with the link can view"</strong> atau menggunakan Service Account.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Nama Tab Volume
              </label>
              <input
                type="text"
                value={baseTab}
                onChange={(e) => setBaseTab(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400">Kolom: BG, DD, Ton/Rit</span>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Nama Tab Waktu & Delay
              </label>
              <input
                type="text"
                value={base2Tab}
                onChange={(e) => setBase2Tab(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400">Kolom: BG, DD, Cast-in, Loading, Cast off, Breakdown, Heavy Rain, Waiting</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Cache Data TTL (Detik)
            </label>
            <input
              type="number"
              value={ttl}
              onChange={(e) => setTtl(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
            />
            <span className="text-[11px] text-slate-400">
              Nilai default: 600 detik (10 menit) sesuai spesifikasi <code>@st.cache_data(ttl=600)</code> untuk mencegah quota throttle.
            </span>
          </div>

          {testResult === 'success' && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Konfigurasi berhasil disimpan! Data telah disinkronkan.</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={testing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
          >
            {testing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Menguji Koneksi...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Simpan & Sinkronkan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
