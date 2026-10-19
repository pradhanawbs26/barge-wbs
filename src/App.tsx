import React, { useState, useMemo } from 'react';
import {
  Ship,
  TrendingUp,
  Clock,
  Layers,
  AlertTriangle,
  FileCode,
  FileSpreadsheet,
  Filter,
  CheckCircle2,
  Calendar,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Plus,
  ArrowRight
} from 'lucide-react';
import { INITIAL_BASE_DATA, INITIAL_BASE2_DATA } from './data/mockData';
import { preprocessBargeData, calculateDelayPareto, TARGET_BLC_RATE } from './utils/bargeAnalytics';
import { BaseRecord, Base2Record, GSheetsConfig, ProcessedBarge } from './types';
import { Header } from './components/Header';
import { CupertinoMetricCard } from './components/CupertinoMetricCard';
import { GaugeChart } from './components/GaugeChart';
import { GanttChart } from './components/GanttChart';
import { DelayParetoChart } from './components/DelayParetoChart';
import { DataInspector } from './components/DataInspector';
import { PythonCodeViewer } from './components/PythonCodeViewer';
import { GSheetsSettingsModal } from './components/GSheetsSettingsModal';
import { DepartmentKpiSection } from './components/DepartmentKpiSection';
import { DEPARTMENT_OPERATION_KPIS } from './data/departmentKpis';

// Complete Python Script Content for app.py
const PYTHON_APP_SCRIPT = `"""
========================================================================================
APLIKASI DASBOR OPERASIONAL BARGE LOADING - PT WBS
Monitoring Loading Batubara, Idle Time Jetty, Analisis Delay, & Produktivitas BLC
========================================================================================
File: app.py
Framework: Streamlit, Pandas, NumPy, Plotly
Koneksi Data: Google Sheets via streamlit-gsheets-connection
========================================================================================
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta

# Import modul koneksi Google Sheets
try:
    from streamlit_gsheets import GSheetsConnection
    GSHEETS_AVAILABLE = True
except ImportError:
    GSHEETS_AVAILABLE = False


# ======================================================================================
# 1. KONFIGURASI HALAMAN & STYLING CUPERTINO
# ======================================================================================
st.set_page_config(
    page_title="Barge Loading Operations Dashboard - PT WBS",
    page_icon="🚢",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS bergaya modern Cupertino (Apple-inspired cards, border-radius 16px, soft shadow)
st.markdown("""
<style>
    .metric-card {
        background: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.06);
        border-radius: 16px;
        padding: 20px 24px;
        box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        margin-bottom: 1rem;
    }
    .metric-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px -2px rgba(0, 0, 0, 0.08);
    }
    .metric-title {
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b;
        margin-bottom: 6px;
    }
    .metric-value {
        font-size: 1.85rem;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.2;
    }
    .metric-delta.positive { color: #10b981; }
    .metric-delta.negative { color: #ef4444; }
    .metric-delta.neutral { color: #6b7280; }
    
    .badge-success {
        background-color: #ecfdf5;
        color: #065f46;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    .badge-danger {
        background-color: #fef2f2;
        color: #991b1b;
        padding: 4px 10px;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    .main-header {
        font-size: 1.6rem;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.02em;
        margin-bottom: 2px;
    }
    .sub-header {
        font-size: 0.9rem;
        color: #64748b;
        margin-bottom: 1.5rem;
    }
</style>
""", unsafe_allow_html=True)


# ======================================================================================
# 2. GENERATOR DATA CADANGAN (FALLBACK JIKA GOOGLE SHEETS BELUM DIHUBUNGKAN)
# ======================================================================================
def generate_fallback_data():
    barge_names = [
        "BG. KALIMANTAN 01", "BG. PACIFIC STAR", "BG. TRANS POWER 08", "BG. MEGA JAYA 03",
        "BG. SAMUDRA 12", "BG. BORNEO COAL 05", "BG. BUMI NUSANTARA", "BG. INDO COAL 21",
        "BG. SEJAHTERA 09", "BG. MARITIM ABADI", "BG. ANDALAS 07", "BG. WIRA BARA 02",
        "BG. SUMATERA EMAS", "BG. MITRA JAYA 88", "BG. SELATAN EXPRESS", "BG. CAHAYA BARA",
        "BG. BINA COAL 15", "BG. ALAM MAKMUR", "BG. BARITO GLORY", "BG. KARTIKA PRIMA",
        "BG. OCEAN PERKASA", "BG. NUSANTARA STAR"
    ]
    data_base = []
    data_base2 = []
    current_time = datetime(2026, 9, 1, 8, 0, 0)
    
    for i, bg in enumerate(barge_names):
        dd_str = current_time.strftime("%Y-%m-%d")
        np.random.seed(42 + i)
        ton_rit = round(float(np.random.choice([7650, 7890, 8120, 8250, 9500, 10200, 7750, 8400, 9100])), 2)
        target_time = ton_rit / 1350.0
        loading_hours = round(float(target_time * np.random.uniform(0.85, 1.28)), 2)
        breakdown_hours = round(float(np.random.choice([0.0, 0.0, 0.0, 0.5, 1.2, 2.0, 0.0])), 2)
        heavy_rain_hours = round(float(np.random.choice([0.0, 0.0, 0.0, 1.0, 1.8, 3.5, 0.0])), 2)
        waiting_hours = round(float(np.random.choice([0.0, 0.3, 0.5, 1.0, 0.0, 0.8])), 2)
        
        total_delay = breakdown_hours + heavy_rain_hours + waiting_hours
        total_berth_duration = loading_hours + total_delay
        cast_in = current_time
        cast_off = cast_in + timedelta(hours=total_berth_duration)
        
        data_base.append({'BG': bg, 'DD': dd_str, 'Ton/Rit': ton_rit})
        data_base2.append({
            'BG': bg, 'DD': dd_str, 'Cast-in': cast_in.strftime("%Y-%m-%d %H:%M:%S"),
            'Loading': loading_hours, 'Cast off': cast_off.strftime("%Y-%m-%d %H:%M:%S"),
            'Breakdown': breakdown_hours, 'Heavy Rain': heavy_rain_hours, 'Waiting': waiting_hours
        })
        current_time = cast_off + timedelta(hours=float(np.random.uniform(1.5, 6.0)))
        
    return pd.DataFrame(data_base), pd.DataFrame(data_base2)


# ======================================================================================
# 3. PENGAMBILAN DATA (DATA EXTRACTION VIA ST.CONNECTION)
# ======================================================================================
@st.cache_data(ttl=600)
def load_data(spreadsheet_url: str = None):
    if GSHEETS_AVAILABLE and spreadsheet_url:
        try:
            conn = st.connection("gsheets", type=GSheetsConnection)
            df_base = conn.read(spreadsheet=spreadsheet_url, worksheet="BASE")
            df_base2 = conn.read(spreadsheet=spreadsheet_url, worksheet="BASE2")
            return df_base, df_base2, "Terkoneksi ke Google Sheets Aktif"
        except Exception as e:
            st.warning(f"Koneksi Google Sheets via URL gagal ({str(e)}). Menggunakan data simulasi operasional.")
            df_base, df_base2 = generate_fallback_data()
            return df_base, df_base2, f"Fallback Data: {str(e)}"
    elif GSHEETS_AVAILABLE:
        try:
            conn = st.connection("gsheets", type=GSheetsConnection)
            df_base = conn.read(worksheet="BASE")
            df_base2 = conn.read(worksheet="BASE2")
            return df_base, df_base2, "Terkoneksi ke Google Sheets (Secrets)"
        except Exception:
            df_base, df_base2 = generate_fallback_data()
            return df_base, df_base2, "Menggunakan Data Simulasi (September & Oktober 2026)"
    else:
        df_base, df_base2 = generate_fallback_data()
        return df_base, df_base2, "Menggunakan Data Simulasi Operasional"


# ======================================================================================
# 4. LOGIKA PENGOLAHAN DATA & PREPROCESSING (PANDAS)
# ======================================================================================
def clean_and_preprocess_data(df_base_raw: pd.DataFrame, df_base2_raw: pd.DataFrame) -> pd.DataFrame:
    df_base = df_base_raw.copy()
    df_base2 = df_base2_raw.copy()
    
    df_base.columns = df_base.columns.astype(str).str.strip()
    df_base2.columns = df_base2.columns.astype(str).str.strip()
    
    if 'Date' in df_base.columns and 'DD' not in df_base.columns:
        df_base.rename(columns={'Date': 'DD'}, inplace=True)
    if 'Date' in df_base2.columns and 'DD' not in df_base2.columns:
        df_base2.rename(columns={'Date': 'DD'}, inplace=True)
        
    df_base.dropna(subset=['BG', 'DD'], inplace=True)
    df_base2.dropna(subset=['BG', 'DD'], inplace=True)
    
    df_base['BG'] = df_base['BG'].astype(str).str.strip().str.upper()
    df_base2['BG'] = df_base2['BG'].astype(str).str.strip().str.upper()
    
    df_base['DD'] = pd.to_datetime(df_base['DD']).dt.strftime('%Y-%m-%d')
    df_base2['DD'] = pd.to_datetime(df_base2['DD']).dt.strftime('%Y-%m-%d')
    
    df_base['Ton/Rit'] = pd.to_numeric(df_base['Ton/Rit'].astype(str).str.replace(',', '.'), errors='coerce').fillna(0)
    
    for col in ['Loading', 'Breakdown', 'Heavy Rain', 'Waiting']:
        if col in df_base2.columns:
            df_base2[col] = pd.to_numeric(df_base2[col].astype(str).str.replace(',', '.'), errors='coerce').fillna(0)
    
    df_merged = pd.merge(df_base2, df_base, on=['BG', 'DD'], how='left')
    
    df_merged['Cast-in'] = pd.to_datetime(df_merged['Cast-in'])
    df_merged['Cast off'] = pd.to_datetime(df_merged['Cast off'])
    df_merged['Month_Year'] = df_merged['Cast-in'].dt.strftime('%B %Y')
    
    # Idle Time: Urutkan data berdasarkan 'Cast off'. Gunakan shift(1)
    df_merged = df_merged.sort_values(by='Cast off').reset_index(drop=True)
    df_merged['Prev_Cast_Off'] = df_merged['Cast off'].shift(1)
    df_merged['Idle_Time'] = (df_merged['Cast-in'] - df_merged['Prev_Cast_Off']).dt.total_seconds() / 3600.0
    df_merged['Idle_Time'] = df_merged['Idle_Time'].apply(lambda x: max(0.0, float(x)) if pd.notnull(x) else 0.0)
    
    # Performa BLC: Target = 1350 Ton/Jam
    TARGET_BLC = 1350.0
    df_merged['Waktu Target'] = df_merged['Ton/Rit'] / TARGET_BLC
    df_merged['Aktual Produktivitas'] = np.where(
        df_merged['Loading'] > 0,
        df_merged['Ton/Rit'] / df_merged['Loading'],
        0.0
    )
    df_merged['Status'] = np.where(
        df_merged['Loading'] <= df_merged['Waktu Target'],
        "Sesuai Target",
        "Over Time"
    )
    return df_merged
`;

export default function App() {
  const [baseRecords, setBaseRecords] = useState<BaseRecord[]>(INITIAL_BASE_DATA);
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

  const [base2Records, setBase2Records] = useState<Base2Record[]>(INITIAL_BASE2_DATA);
  const [selectedMonth, setSelectedMonth] = useState<string>('Januari 2026');
  const [activeTab, setActiveTab] = useState<'summary' | 'timeline' | 'delay' | 'data' | 'python'>('summary');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showGSheetsModal, setShowGSheetsModal] = useState(false);

  const [sheetsConfig, setSheetsConfig] = useState<GSheetsConfig>({
    spreadsheetUrl: '',
    sheetBaseName: 'BASE',
    sheetBase2Name: 'BASE2',
    cacheTtlSeconds: 600,
    status: 'sample_data',
    lastSynced: new Date()
  });

  // Preprocessing dataset
  const processedAllBarges = useMemo(() => {
    return preprocessBargeData(baseRecords, base2Records);
  }, [baseRecords, base2Records]);

  // Extract available months: Januari 2026 s/d Desember 2026
  const availableMonths = useMemo(() => {
    const monthsInDataset = new Set(processedAllBarges.map((b) => b.Month_Year));
    // Susun secara urut Januari 2026 sampai Desember 2026
    return MONTH_LIST_2026.filter((m) => monthsInDataset.has(m) || true);
  }, [processedAllBarges, MONTH_LIST_2026]);

  // Filtered barges based on active month
  const filteredBarges = useMemo(() => {
    if (selectedMonth.startsWith('Semua Periode')) {
      return processedAllBarges;
    }
    return processedAllBarges.filter((b) => b.Month_Year === selectedMonth);
  }, [processedAllBarges, selectedMonth]);

  // Executive summary calculations
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

  // Delay metrics for Tab 3 Pareto
  const delayMetrics = useMemo(() => {
    return calculateDelayPareto(filteredBarges);
  }, [filteredBarges]);

  // Handler Refresh Cache
  const handleRefreshCache = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setSheetsConfig((prev) => ({
        ...prev,
        lastSynced: new Date()
      }));
    }, 600);
  };

  // Handler add record
  const handleAddRecord = (base: BaseRecord, base2: Base2Record) => {
    setBaseRecords((prev) => [base, ...prev]);
    setBase2Records((prev) => [base2, ...prev]);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        selectedMonth={selectedMonth}
        onRefreshCache={handleRefreshCache}
        onOpenGSheetsModal={() => setShowGSheetsModal(true)}
        isRefreshing={isRefreshing}
        sheetsConfig={sheetsConfig}
      />

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col lg:flex-row gap-6">
        {/* SIDEBAR OPERASIONAL (According to PRD Sidebar specifications) */}
        <aside className="w-full lg:w-72 shrink-0 space-y-5">
          {/* Main Filter Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Filter className="w-4 h-4 text-indigo-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Filter & Periode
              </h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Pilih Bulan (Month_Year):
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="Semua Periode (Januari - Desember 2026)">
                  Semua Periode (Januari - Desember 2026)
                </option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">
                Secara otomatis memfilter seluruh metrik, Gantt chart, dan analisis delay di halaman utama.
              </p>
            </div>

            {/* Quick Stat Summary in Sidebar */}
            <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Total Tongkang:</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                  {filteredBarges.length} Unit
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Target Rate BLC:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  1.350 MT/Jam
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Rasio Capai Target:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full ${
                    targetCompliance.ratio >= 70
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-amber-700 bg-amber-50'
                  }`}
                >
                  {targetCompliance.ratio.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

        </aside>

        {/* MAIN DASHBOARD CONTENT AREA */}
        <main className="flex-1 space-y-6 min-w-0">
          {/* TAB NAVIGATION (3 Bagian Sesuai PRD + Data Inspector & Python Viewer) */}
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
              Tabel & Detail Data
            </button>
          </div>

          {/* ==================================================================== */}
          {/* TAB 1: EXECUTIVE SUMMARY */}
          {/* ==================================================================== */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Cupertino Metric Cards (st.columns & st.metric style) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <CupertinoMetricCard
                  title="Total Volume Loading"
                  value={totalVolume.toLocaleString('id-ID')}
                  unit="MT"
                  deltaText={`${filteredBarges.length} Tongkang Selesai`}
                  deltaType="neutral"
                  icon={<Ship className="w-4 h-4 text-blue-600" />}
                  footerText="Akumulasi batu bara termuat"
                />

                <CupertinoMetricCard
                  title="Rata-rata Loading Rate (BLC)"
                  value={avgLoadingRate.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                  unit="Ton/Jam"
                  deltaText={
                    avgLoadingRate >= TARGET_BLC_RATE
                      ? `+${(avgLoadingRate - TARGET_BLC_RATE).toFixed(1)} T/h vs Target`
                      : `${(avgLoadingRate - TARGET_BLC_RATE).toFixed(1)} T/h vs Target`
                  }
                  deltaType={avgLoadingRate >= TARGET_BLC_RATE ? 'positive' : 'negative'}
                  icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                  footerText="Standar Target: 1.350 Ton/Jam"
                />

                <CupertinoMetricCard
                  title="Rata-rata Idle Time Jetty"
                  value={avgIdleTime.toFixed(2)}
                  unit="Jam"
                  deltaText="Jeda Antar Tongkang"
                  deltaType="neutral"
                  icon={<Clock className="w-4 h-4 text-indigo-600" />}
                  footerText="Waktu tunggu jetty tak termuat"
                />

                <CupertinoMetricCard
                  title="Kepatuhan Waktu Target"
                  value={`${targetCompliance.ratio.toFixed(1)}%`}
                  deltaText={`${targetCompliance.onTime} dari ${filteredBarges.length} On-Time`}
                  deltaType={targetCompliance.ratio >= 70 ? 'positive' : 'negative'}
                  icon={<CheckCircle2 className="w-4 h-4 text-amber-600" />}
                  footerText="Loading <= Waktu Target"
                />
              </div>

              {/* Gauge Chart & Barge Productivity Bar */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Gauge Chart Plotly (PRD requirement) */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
                  <div className="pb-3 border-b border-slate-100">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                      Produktivitas BLC vs Target 1.350 T/h
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Gauge meter penunjuk performa kecepatan pengisian alat muat batubara.
                    </p>
                  </div>

                  <div className="my-auto py-2">
                    <GaugeChart value={avgLoadingRate} target={TARGET_BLC_RATE} />
                  </div>

                  <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                    <span>Zona Kritis: &lt; 1.100 T/h</span>
                    <span>Zona Optimal: &ge; 1.350 T/h</span>
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
                            <span className="font-bold text-slate-800 truncate w-40" title={barge.BG}>
                              {barge.BG}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900">
                                {barge.AktualProduktivitas.toFixed(1)} T/h
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

              {/* Data Resmi Rekonsiliasi Spreadsheet PT WBS (Daily, Weekly, Monthly, Yearly 2026) */}
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
                        <th className="py-2.5 px-3">Nama Tongkang (BG)</th>
                        <th className="py-2.5 px-2">Tanggal (DD)</th>
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
                        <tr key={barge.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{barge.BG}</td>
                          <td className="py-2.5 px-2 text-slate-500">{barge.DD}</td>
                          <td className="py-2.5 px-2 text-right font-semibold">
                            {barge.TonRit.toLocaleString('id-ID')} MT
                          </td>
                          <td className="py-2.5 px-2 text-right">{barge.Loading.toFixed(1)} h</td>
                          <td className="py-2.5 px-2 text-right text-slate-500">
                            {barge.WaktuTarget.toFixed(2)} h
                          </td>
                          <td className="py-2.5 px-2 text-right font-bold text-slate-900">
                            {barge.AktualProduktivitas.toFixed(1)} T/h
                          </td>
                          <td className="py-2.5 px-2 text-right text-indigo-600">
                            {barge.IdleTime.toFixed(1)} h
                          </td>
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
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <GanttChart barges={filteredBarges} />

              {/* Additional Metric Summary for Tab 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Total Waktu Sandar (Berthing)
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {filteredBarges
                      .reduce((acc, b) => acc + b.BerthDuration, 0)
                      .toFixed(1)}{' '}
                    <span className="text-sm font-semibold text-slate-500">Jam</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Cast-in hingga Cast off seluruh armada</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Total Waktu Pengisian Netto
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {totalLoadingHours.toFixed(1)}{' '}
                    <span className="text-sm font-semibold text-slate-500">Jam</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Waktu murni transfer batubara BLC</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Akumulasi Idle Time Jetty
                  </div>
                  <div className="text-2xl font-extrabold text-indigo-600 mt-1">
                    {filteredBarges.reduce((acc, b) => acc + b.IdleTime, 0).toFixed(1)}{' '}
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
          {activeTab === 'delay' && (
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
              onSaveSheetsConfig={(updated) => setSheetsConfig((prev) => ({ ...prev, ...updated }))}
              onResetCache={handleRefreshCache}
              onAddRecord={handleAddRecord}
            />
          )}

          {/* ==================================================================== */}
          {/* TAB 5: PYTHON CODE VIEWER & DEPLOYMENT GUIDE */}
          {/* ==================================================================== */}
          {activeTab === 'python' && (
            <PythonCodeViewer pythonCode={PYTHON_APP_SCRIPT} />
          )}
        </main>
      </div>

      {/* Subtle Operational Footer */}
      <footer className="mt-auto py-4 border-t border-slate-200/60 bg-white/50 text-[11px] text-slate-400 text-center flex items-center justify-center gap-4">
        <span>PT WBS Operational Logistics • Jetty Performance & BLC Productivity</span>
        <span className="text-slate-300">•</span>
        <button
          onClick={() => setActiveTab(activeTab === 'python' ? 'summary' : 'python')}
          className="text-slate-400 hover:text-slate-600 transition"
        >
          {activeTab === 'python' ? 'Kembali ke Dasbor Utama' : 'Lihat Skrip app.py'}
        </button>
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
