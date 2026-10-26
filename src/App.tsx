import React, { useState, useMemo, useEffect } from 'react';
import {
  Ship,
  TrendingUp,
  Clock,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Plus,
  Link,
  FileSpreadsheet,
  XCircle
} from 'lucide-react';
import {
  preprocessBargeData,
  calculateDelayPareto,
  TARGET_BLC_RATE,
  formatDisplayDate,
  formatDecimalNumber,
  formatHours
} from './utils/bargeAnalytics';
import { BaseRecord, Base2Record, GSheetsConfig, ProcessedBarge } from './types';
import { Header } from './components/Header';
import { CupertinoMetricCard } from './components/CupertinoMetricCard';
import { GaugeChart } from './components/GaugeChart';
import { GanttChart } from './components/GanttChart';
import { DelayParetoChart } from './components/DelayParetoChart';
import { DataInspector } from './components/DataInspector';
import { GSheetsSettingsModal } from './components/GSheetsSettingsModal';
import { DepartmentKpiSection } from './components/DepartmentKpiSection';
import { DEPARTMENT_OPERATION_KPIS } from './data/departmentKpis';
import {
  extractSpreadsheetId,
  fetchGoogleWorksheetCsv,
  parseCsvText,
  mapCsvToBaseRecords,
  mapCsvToBase2Records
} from './utils/gsheetsFetcher';
import { uploadRecordsToSupabase } from './utils/supabaseClient';

export default function App() {
  const [baseRecords, setBaseRecords] = useState<BaseRecord[]>([]);
  const [base2Records, setBase2Records] = useState<Base2Record[]>([]);

  const MONTH_LIST_2026 = useMemo(() => [
    'Januari 2026',
    'Februari 2026',
    'Maret 2026',
    'April 2026',
    'Mei 2026',
    'Juni 2026',
    'Juli 2026',
    'Agustus 2026',
    'September 2026',
    'Oktober 2026',
    'November 2026',
    'Desember 2026'
  ], []);

  const [selectedMonth, setSelectedMonth] = useState<string>('Oktober 2026');
  const [activeTab, setActiveTab] = useState<'summary' | 'timeline' | 'delay' | 'data'>('summary');
  const decimalSeparator: 'comma' = 'comma';
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showGSheetsModal, setShowGSheetsModal] = useState(false);

  // Quick connector form state
  const [quickUrlInput, setQuickUrlInput] = useState('');
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickFeedback, setQuickFeedback] = useState<string | null>(null);

  const [sheetsConfig, setSheetsConfig] = useState<GSheetsConfig>(() => {
    try {
      const saved = localStorage.getItem('wbs_permanent_sheets_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.spreadsheetUrl && !parsed.spreadsheetUrl.includes('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')) {
          return {
            ...parsed,
            lastSynced: new Date(parsed.lastSynced || Date.now())
          };
        }
      }
    } catch (e) {
      // ignore
    }
    return {
      spreadsheetUrl: '',
      sheetBaseName: 'BASE',
      sheetBase2Name: 'BASE2',
      cacheTtlSeconds: 600,
      status: 'sample_data',
      lastSynced: new Date()
    };
  });

  const handleUpdateSheetsConfig = (updated: Partial<GSheetsConfig>) => {
    setSheetsConfig((prev) => {
      const next = { ...prev, ...updated };
      try {
        if (next.spreadsheetUrl) {
          localStorage.setItem('wbs_permanent_sheets_config', JSON.stringify(next));
        } else {
          localStorage.removeItem('wbs_permanent_sheets_config');
        }
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  // Preprocessing dataset menggunakan engine TypeScript mandiri
  const processedAllBarges = useMemo(() => {
    return preprocessBargeData(baseRecords, base2Records);
  }, [baseRecords, base2Records]);

  // Ekstraksi bulan: Januari 2026 s/d Desember 2026
  const availableMonths = useMemo(() => {
    return MONTH_LIST_2026;
  }, [MONTH_LIST_2026]);

  // Filtered barges berdasarkan bulan yang dipilih
  const filteredBarges = useMemo(() => {
    if (selectedMonth.startsWith('Semua Periode')) {
      return processedAllBarges;
    }
    return processedAllBarges.filter((b) => b.Month_Year === selectedMonth);
  }, [processedAllBarges, selectedMonth]);

  // Perhitungan ringkasan eksekutif
  const totalVolume = useMemo(() => {
    return filteredBarges.reduce((acc, b) => acc + b.TonRit, 0);
  }, [filteredBarges]);

  const totalLoadingHours = useMemo(() => {
    return filteredBarges.reduce((acc, b) => acc + b.Loading, 0);
  }, [filteredBarges]);

  const avgLoadingRate = useMemo(() => {
    return totalLoadingHours > 0 ? totalVolume / totalLoadingHours : 0;
  }, [totalVolume, totalLoadingHours]);

  const avgIdleTime = useMemo(() => {
    if (filteredBarges.length === 0) return 0;
    const sumIdle = filteredBarges.reduce((acc, b) => acc + b.IdleTime, 0);
    return sumIdle / filteredBarges.length;
  }, [filteredBarges]);

  const targetCompliance = useMemo(() => {
    if (filteredBarges.length === 0) return { onTime: 0, ratio: 0 };
    const onTime = filteredBarges.filter((b) => b.Status === 'Sesuai Target').length;
    return {
      onTime,
      ratio: (onTime / filteredBarges.length) * 100
    };
  }, [filteredBarges]);

  // Metrik Pareto Delay untuk Tab 3
  const delayMetrics = useMemo(() => {
    return calculateDelayPareto(filteredBarges);
  }, [filteredBarges]);

  // Handler Refresh Cache (TTL 10m)
  const handleRefreshCache = () => {
    if (sheetsConfig.spreadsheetUrl) {
      handleFetchAndApplySpreadsheet(
        sheetsConfig.spreadsheetUrl,
        sheetsConfig.sheetBaseName || 'BASE',
        sheetsConfig.sheetBase2Name || 'BASE2'
      );
    }
  };

  // Handler tambah data record manual
  const handleAddRecord = (base: BaseRecord, base2: Base2Record) => {
    setBaseRecords((prev) => [base, ...prev]);
    setBase2Records((prev) => [base2, ...prev]);
  };

  // Handler penarikan dan pemrosesan data aktual dari URL Google Spreadsheet
  const handleFetchAndApplySpreadsheet = async (
    url: string,
    baseTabName: string,
    base2TabName: string
  ): Promise<{ success: boolean; message: string; rowsBase?: number; rowsBase2?: number }> => {
    setIsRefreshing(true);
    setQuickError(null);
    setQuickFeedback(null);

    try {
      if (!url || !url.trim()) {
        setBaseRecords([]);
        setBase2Records([]);
        setSheetsConfig({
          spreadsheetUrl: '',
          sheetBaseName: baseTabName,
          sheetBase2Name: base2TabName,
          cacheTtlSeconds: 600,
          status: 'sample_data',
          lastSynced: new Date()
        });
        try {
          localStorage.removeItem('wbs_permanent_sheets_config');
        } catch (e) {}

        return {
          success: true,
          message: 'Link spreadsheet dan data telah dikosongkan. Silakan cantumkan link baru.'
        };
      }

      const sheetId = extractSpreadsheetId(url);
      if (!sheetId) {
        throw new Error('Format URL Google Spreadsheet tidak valid. Harap periksa kembali tautan yang disalin.');
      }

      // Tarik tab BASE dan BASE2 secara langsung via CSV export/GViz
      const [csvBase, csvBase2] = await Promise.all([
        fetchGoogleWorksheetCsv(sheetId, baseTabName),
        fetchGoogleWorksheetCsv(sheetId, base2TabName)
      ]);

      const rawBaseRows = parseCsvText(csvBase);
      const rawBase2Rows = parseCsvText(csvBase2);

      const parsedBase = mapCsvToBaseRecords(rawBaseRows);
      const parsedBase2 = mapCsvToBase2Records(rawBase2Rows);

      if (parsedBase.length > 0 && parsedBase2.length > 0) {
        setBaseRecords(parsedBase);
        setBase2Records(parsedBase2);
        setSheetsConfig({
          spreadsheetUrl: url.trim(),
          sheetBaseName: baseTabName,
          sheetBase2Name: base2TabName,
          cacheTtlSeconds: 600,
          status: 'connected',
          lastSynced: new Date()
        });

        // Trigger background sync to Supabase
        uploadRecordsToSupabase(parsedBase, parsedBase2).then((res) => {
          if (res.success) {
            console.log('Supabase sync status:', res.message);
          }
        });

        try {
          localStorage.setItem('wbs_permanent_sheets_config', JSON.stringify({
            spreadsheetUrl: url.trim(),
            sheetBaseName: baseTabName,
            sheetBase2Name: base2TabName,
            cacheTtlSeconds: 600,
            status: 'connected',
            lastSynced: new Date()
          }));
        } catch (e) {}

        return {
          success: true,
          message: 'Berhasil memuat data!',
          rowsBase: parsedBase.length,
          rowsBase2: parsedBase2.length
        };
      }

      throw new Error(`Data sheet berhasil ditarik, namun kolom tidak cocok. Pastikan tab '${baseTabName}' memuat volume dan '${base2TabName}' memuat delay & waktu.`);
    } catch (err: any) {
      console.error('Fetch error:', err);
      const errMs = err.message || 'Gagal mengambil data dari Google Spreadsheet.';
      setQuickError(errMs);
      return {
        success: false,
        message: errMs
      };
    } finally {
      setIsRefreshing(false);
    }
  };

  // Auto fetch on load if url exists in sheetsConfig
  useEffect(() => {
    if (sheetsConfig.spreadsheetUrl && baseRecords.length === 0) {
      handleFetchAndApplySpreadsheet(
        sheetsConfig.spreadsheetUrl,
        sheetsConfig.sheetBaseName || 'BASE',
        sheetsConfig.sheetBase2Name || 'BASE2'
      );
    }
  }, []);

  // Handler Kosongkan Link
  const handleClearSpreadsheetLink = () => {
    setQuickUrlInput('');
    handleFetchAndApplySpreadsheet('', 'BASE', 'BASE2');
  };

  // Handler submit form koneksi cepat
  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUrlInput.trim()) return;
    handleFetchAndApplySpreadsheet(
      quickUrlInput.trim(),
      sheetsConfig.sheetBaseName || 'BASE',
      sheetsConfig.sheetBase2Name || 'BASE2'
    );
  };

  // Handler jika user mengimpor via paste CSV langsung
  const handleManualImportCsv = (csvBaseText: string, csvBase2Text: string) => {
    const rawBase = parseCsvText(csvBaseText);
    const rawBase2 = parseCsvText(csvBase2Text);
    const parsedBase = mapCsvToBaseRecords(rawBase);
    const parsedBase2 = mapCsvToBase2Records(rawBase2);

    if (parsedBase.length > 0 && parsedBase2.length > 0) {
      setBaseRecords(parsedBase);
      setBase2Records(parsedBase2);
      setSheetsConfig((prev) => ({
        ...prev,
        status: 'connected',
        lastSynced: new Date()
      }));
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        availableMonths={availableMonths}
        onRefreshCache={handleRefreshCache}
        onOpenGSheetsModal={() => setShowGSheetsModal(true)}
        isRefreshing={isRefreshing}
        sheetsConfig={sheetsConfig}
      />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6">
        {/* MAIN DASHBOARD CONTENT AREA (FULL WIDTH) */}
        <main className="w-full space-y-6 min-w-0">
          {/* Quick Error Message if fetch fails */}
          {quickError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{quickError}</span>
              </div>
              <button onClick={() => setQuickError(null)} className="text-rose-500 hover:text-rose-700 text-xs font-bold">✕</button>
            </div>
          )}

          {/* TAB NAVIGATION */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex items-center flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'summary'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              TAB 1: Executive Summary
            </button>

            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'timeline'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              TAB 2: Timeline Aktivitas (Gantt)
            </button>

            <button
              onClick={() => setActiveTab('delay')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'delay'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              TAB 3: Analisis Delay (Pareto)
            </button>

            <button
              onClick={() => setActiveTab('data')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'data'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              TAB 4: Tabel & Detail Data
            </button>
          </div>

          {/* EMPTY STATE HERO BANNER WHEN NO DATA IS LOADED YET */}
          {processedAllBarges.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-8 sm:p-12 text-center space-y-4 max-w-2xl mx-auto my-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-xs">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                  Kolom Link Spreadsheet Masih Kosong
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                  Silakan cantumkan URL Google Spreadsheet operasional Anda secara bebas untuk memuat seluruh analisis & grafik. Tanpa data dummy.
                </p>
              </div>

              <form onSubmit={handleQuickSubmit} className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row items-center gap-2.5 max-w-lg mx-auto">
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/your-spreadsheet-id/edit"
                    value={quickUrlInput}
                    onChange={(e) => setQuickUrlInput(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={isRefreshing || !quickUrlInput.trim()}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shrink-0 flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isRefreshing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Memuat...
                      </>
                    ) : (
                      <>
                        <Link className="w-4 h-4" />
                        Tarik Data
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-400 flex-wrap">
                <span>✅ Bebas Memasukkan Link Spreadsheet Publik</span>
                <span>•</span>
                <span>✅ Bebas Data Dummy</span>
                <span>•</span>
                <span>✅ Auto Sync Tab BASE & BASE2</span>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* TAB 1: EXECUTIVE SUMMARY */}
          {/* ==================================================================== */}
          {activeTab === 'summary' && processedAllBarges.length > 0 && (
            <div className="space-y-6">
              {/* Cupertino Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <CupertinoMetricCard
                  title="Total Volume Loading"
                  value={formatDecimalNumber(totalVolume, 0, decimalSeparator)}
                  unit="MT"
                  deltaText={`${filteredBarges.length} Tongkang Selesai`}
                  deltaType="neutral"
                  icon={<Ship className="w-4 h-4 text-blue-600" />}
                  footerText="Akumulasi batu bara termuat"
                />

                <CupertinoMetricCard
                  title="Rata-rata Loading Rate"
                  value={formatDecimalNumber(avgLoadingRate, 1, decimalSeparator)}
                  unit="Ton/Jam"
                  deltaText={
                    avgLoadingRate >= TARGET_BLC_RATE
                      ? `+${formatDecimalNumber(avgLoadingRate - TARGET_BLC_RATE, 1, decimalSeparator)} vs target`
                      : `${formatDecimalNumber(avgLoadingRate - TARGET_BLC_RATE, 1, decimalSeparator)} vs target`
                  }
                  deltaType={avgLoadingRate >= TARGET_BLC_RATE ? 'positive' : 'negative'}
                  icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                  footerText="Target BLC: 1.350 Ton/Jam"
                />

                <CupertinoMetricCard
                  title="Rata-rata Idle Time"
                  value={formatDecimalNumber(avgIdleTime, 2, decimalSeparator)}
                  unit="Jam"
                  deltaText="Waktu tunggu jetty"
                  deltaType="neutral"
                  icon={<Clock className="w-4 h-4 text-indigo-600" />}
                  footerText="Jeda pergantian sandar tongkang"
                />

                <CupertinoMetricCard
                  title="Kepatuhan Target BLC"
                  value={`${targetCompliance.ratio.toFixed(0)}%`}
                  unit=""
                  deltaText={`${targetCompliance.onTime} dari ${filteredBarges.length} Kapal`}
                  deltaType={targetCompliance.ratio >= 70 ? 'positive' : 'negative'}
                  icon={<CheckCircle2 className="w-4 h-4 text-teal-600" />}
                  footerText="Sesuai target durasi muat"
                />
              </div>

              {/* Gauge Meter & Visual Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Gauge Indicator */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
                  <div className="pb-3 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-900">
                      Gauge Meter Produktivitas BLC
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Membandingkan rata-rata produktivitas aktual terhadap target 1.350 Ton/Jam.
                    </p>
                  </div>

                  <div className="py-2">
                    <GaugeChart value={avgLoadingRate} target={TARGET_BLC_RATE} max={2000} />
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Ambang Batas Target:</span>
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      1.350,0 Ton/Jam
                    </span>
                  </div>
                </div>

                {/* Barge Productivity Distribution Bar Chart */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
                  <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Performa Pengisian Per Tongkang
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Aktual Produktivitas (Ton/Jam) terhadap garis target merah 1.350 T/h.
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      Target: 1.350 MT/h
                    </span>
                  </div>

                  {/* Visual Bar Chart */}
                  <div className="py-4 space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                    {filteredBarges.map((barge) => {
                      const pctOfTarget = (barge.AktualProduktivitas / 1800) * 100;
                      const isTargetMet = barge.Status === 'Sesuai Target';

                      return (
                        <div key={barge.id} className="text-xs">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-slate-800 truncate w-44" title={barge.BG}>
                              {barge.BG} {barge.TB && <span className="text-slate-400 font-normal text-[10px]">({barge.TB})</span>}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">
                                {formatDecimalNumber(barge.AktualProduktivitas, 1, decimalSeparator)} T/h
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                                  isTargetMet
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}
                              >
                                {barge.Status}
                              </span>
                            </div>
                          </div>

                          <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
                            {/* Target 1350 vertical marker */}
                            <div
                              className="absolute top-0 bottom-0 w-0.5 bg-rose-600 z-10"
                              style={{ left: `${(1350 / 1800) * 100}%` }}
                              title="Target 1.350 T/h"
                            ></div>

                            {/* Bar fill */}
                            <div
                              style={{ width: `${Math.min(pctOfTarget, 100)}%` }}
                              className={`h-full rounded-full transition-all duration-500 ${
                                isTargetMet ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Sesuai Target (Loading &le; Waktu Target)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Over Time (Loading &gt; Waktu Target)
                    </span>
                  </div>
                </div>
              </div>

              {/* Data Rekonsiliasi Spreadsheet PT WBS */}
              <DepartmentKpiSection kpis={DEPARTMENT_OPERATION_KPIS} />

              {/* Summary Table of Barge Records */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <h3 className="text-base font-bold text-slate-900">
                    Ringkasan Performa Tongkang Periode {selectedMonth}
                  </h3>
                  <span className="text-xs font-semibold text-slate-500">
                    Menampilkan {filteredBarges.length} Unit
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold bg-slate-50/50">
                        <th className="py-2.5 px-2">Urutan (Col A)</th>
                        <th className="py-2.5 px-3">Tug Boat (Col B)</th>
                        <th className="py-2.5 px-3">Nama Tongkang (Col C)</th>
                        <th className="py-2.5 px-2">Tanggal (Col D)</th>
                        <th className="py-2.5 px-2 text-right">Volume (Ton/Rit)</th>
                        <th className="py-2.5 px-2 text-right">Loading (Jam)</th>
                        <th className="py-2.5 px-2 text-right">Waktu Target (Jam)</th>
                        <th className="py-2.5 px-2 text-right">Produktivitas BLC</th>
                        <th className="py-2.5 px-2 text-right">Idle Time</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                      {filteredBarges.map((barge) => (
                        <tr key={barge.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-2 font-mono font-bold text-slate-700">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                              {barge.voyageNo || '-'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-semibold">{barge.TB || 'TB. ASSIST'}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{barge.BG}</td>
                          <td className="py-2.5 px-2 font-mono font-bold text-slate-800">
                            {formatDisplayDate(barge.DD)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-semibold">
                            {decimalSeparator === 'comma' ? `${barge.TonRit.toLocaleString('id-ID')} MT` : `${barge.TonRit.toLocaleString('en-US')} MT`}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-medium">{formatHours(barge.Loading, 1, decimalSeparator)}</td>
                          <td className="py-2.5 px-2 text-right text-slate-400 font-mono">{formatHours(barge.WaktuTarget, 2, decimalSeparator)}</td>
                          <td className="py-2.5 px-2 text-right font-bold text-slate-900 font-mono">
                            {formatDecimalNumber(barge.AktualProduktivitas, 1, decimalSeparator)} T/h
                          </td>
                          <td className="py-2.5 px-2 text-right text-indigo-600 font-semibold font-mono">{formatHours(barge.IdleTime, 1, decimalSeparator)}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                barge.Status === 'Sesuai Target'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {barge.Status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* TAB 2: TIMELINE AKTIVITAS (GANTT CHART) */}
          {/* ==================================================================== */}
          {activeTab === 'timeline' && processedAllBarges.length > 0 && (
            <div className="space-y-6">
              <GanttChart barges={filteredBarges} />

              {/* Additional Metric Summary for Tab 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Total Waktu Sandar (Berthing)
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {formatDecimalNumber(
                      filteredBarges.reduce((acc, b) => acc + b.BerthDuration, 0),
                      1,
                      decimalSeparator
                    )}{' '}
                    <span className="text-sm font-semibold text-slate-500">Jam</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Cast-in hingga Cast off seluruh armada</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Total Waktu Pengisian Netto
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {formatDecimalNumber(totalLoadingHours, 1, decimalSeparator)}{' '}
                    <span className="text-sm font-semibold text-slate-500">Jam</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Waktu murni transfer batubara BLC</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Akumulasi Idle Time Jetty
                  </div>
                  <div className="text-2xl font-extrabold text-indigo-600 mt-1">
                    {formatDecimalNumber(
                      filteredBarges.reduce((acc, b) => acc + b.IdleTime, 0),
                      1,
                      decimalSeparator
                    )}{' '}
                    <span className="text-sm font-semibold text-slate-500">Jam</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Waktu jeda antar pelepasan dan sandar berikutnya</p>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* TAB 3: ANALISIS DELAY (PARETO CHART) */}
          {/* ==================================================================== */}
          {activeTab === 'delay' && processedAllBarges.length > 0 && (
            <DelayParetoChart metrics={delayMetrics} barges={filteredBarges} />
          )}

          {/* ==================================================================== */}
          {/* TAB 4: DATA DETAIL & SHEET INSPECTOR */}
          {/* ==================================================================== */}
          {activeTab === 'data' && (
            <DataInspector
              mergedData={filteredBarges}
              baseData={baseRecords}
              base2Data={base2Records}
              sheetsConfig={sheetsConfig}
              onSaveSheetsConfig={handleUpdateSheetsConfig}
              onFetchSpreadsheet={handleFetchAndApplySpreadsheet}
              onManualImportCsv={handleManualImportCsv}
              onResetCache={handleRefreshCache}
              onAddRecord={handleAddRecord}
              decimalSeparator={decimalSeparator}
            />
          )}
        </main>
      </div>

      {/* Subtle Operational Footer */}
      <footer className="mt-auto py-4 border-t border-slate-200/60 bg-white/50 text-[11px] text-slate-400 text-center">
        <span>PT WBS Operational Logistics • Jetty Performance & BLC Productivity Dashboard</span>
      </footer>

      {/* Google Sheets Modal */}
      <GSheetsSettingsModal
        isOpen={showGSheetsModal}
        onClose={() => setShowGSheetsModal(false)}
        config={sheetsConfig}
        onSaveConfig={(updated) => setSheetsConfig((prev) => ({ ...prev, ...updated }))}
        onResetCache={handleRefreshCache}
      />
    </div>
  );
}
