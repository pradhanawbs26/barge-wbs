"""
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
    /* Styling Container Metrik Cupertino */
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
    .metric-delta {
        font-size: 0.8rem;
        font-weight: 500;
        margin-top: 6px;
    }
    .metric-delta.positive {
        color: #10b981;
    }
    .metric-delta.negative {
        color: #ef4444;
    }
    .metric-delta.neutral {
        color: #6b7280;
    }
    
    /* Badge Status */
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
    
    /* Header styling */
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
    """
    Menghasilkan data acuan operasional lengkap dari Januari 2026 sampai Desember 2026
    sebagai fail-safe jika kredensial / URL Google Sheets pengguna belum dikonfigurasi.
    """
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
    
    # Generate untuk setiap bulan 1 sampai 12 tahun 2026
    for m in range(1, 13):
        days_in_month = 28 if m == 2 else 30 if m in [4, 6, 9, 11] else 31
        trips_count = 7 + (m % 3)
        interval = max(1, days_in_month // (trips_count + 1))
        
        current_time = datetime(2026, m, 2, 7, 0, 0)
        
        for t in range(trips_count):
            day = min(days_in_month - 1, 2 + t * interval)
            bg = barge_names[(m * 3 + t) % len(barge_names)]
            current_time = datetime(2026, m, day, 6 + (t % 8), (t * 20) % 60, 0)
            
            dd_str = current_time.strftime("%Y-%m-%d")
            np.random.seed(m * 100 + t)
            ton_rit = round(float(np.random.choice([7650, 7890, 8120, 8250, 9500, 10200, 7750, 8400, 9100])), 2)
            
            target_time = ton_rit / 1350.0
            factor = 1.05 + float(np.random.uniform(0.02, 0.22)) if (t + m) % 3 == 0 else 0.88 + float(np.random.uniform(0.01, 0.10))
            loading_hours = round(float(target_time * factor), 2)
            
            breakdown_hours = round(float(np.random.choice([0.0, 0.0, 0.8, 1.5, 0.0])), 2) if (t + m) % 4 == 1 else 0.0
            is_rainy = m in [1, 2, 10, 11, 12]
            heavy_rain_hours = round(float(np.random.choice([0.5, 1.2, 2.0, 0.0])), 2) if is_rainy and (t % 3 == 0) else 0.0
            waiting_hours = round(float(np.random.choice([0.3, 0.5, 0.8, 0.4])), 2)
            
            total_berth_duration = loading_hours + breakdown_hours + heavy_rain_hours + waiting_hours
            cast_in = current_time
            cast_off = cast_in + timedelta(hours=total_berth_duration)
            
            data_base.append({
                'BG': bg,
                'DD': dd_str,
                'Ton/Rit': ton_rit
            })
            
            data_base2.append({
                'BG': bg,
                'DD': dd_str,
                'Cast-in': cast_in.strftime("%Y-%m-%d %H:%M:%S"),
                'Loading': loading_hours,
                'Cast off': cast_off.strftime("%Y-%m-%d %H:%M:%S"),
                'Breakdown': breakdown_hours,
                'Heavy Rain': heavy_rain_hours,
                'Waiting': waiting_hours
            })
            
    return pd.DataFrame(data_base), pd.DataFrame(data_base2)


# ======================================================================================
# 3. PENGAMBILAN DATA (DATA EXTRACTION VIA ST.CONNECTION)
# ======================================================================================
@st.cache_data(ttl=600)
def load_data(spreadsheet_url: str = None):
    """
    Mengambil data dari Google Sheets menggunakan library streamlit-gsheets-connection.
    Membaca tab 'BASE' dan 'BASE2'.
    Menggunakan cache_data dengan TTL 600 detik (10 menit) untuk mencegah lag pemanggilan API berulang.
    """
    source_type = "Google Sheets API"
    
    # 1. Coba baca dari Google Sheets jika library dan URL tersedia
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
    
    # 2. Coba baca default connection dari .streamlit/secrets.toml jika URL tidak diisi manual
    elif GSHEETS_AVAILABLE:
        try:
            conn = st.connection("gsheets", type=GSheetsConnection)
            df_base = conn.read(worksheet="BASE")
            df_base2 = conn.read(worksheet="BASE2")
            return df_base, df_base2, "Terkoneksi ke Google Sheets (Secrets)"
        except Exception:
            # Gunakan data cadangan logis
            df_base, df_base2 = generate_fallback_data()
            return df_base, df_base2, "Menggunakan Data Simulasi (September & Oktober 2026)"
    else:
        df_base, df_base2 = generate_fallback_data()
        return df_base, df_base2, "Library streamlit-gsheets-connection belum terpasang. Menggunakan Data Simulasi."


# ======================================================================================
# 4. LOGIKA PENGOLAHAN DATA & PREPROCESSING (PANDAS)
# ======================================================================================
def clean_and_preprocess_data(df_base_raw: pd.DataFrame, df_base2_raw: pd.DataFrame) -> pd.DataFrame:
    """
    Fungsi preprocessing data operasional:
    a. Data Cleaning: Hapus spasi tak kasat mata pada nama kolom dan nilai string,
       hapus baris yang nilai 'BG' atau 'DD' (Date) kosong (NaN).
    b. Standarisasi dan Merge: Ubah kolom kunci 'BG' menjadi uppercase. Left Join df_base2 dengan df_base.
    c. Ekstraksi Bulan: Kolom 'Month_Year' (contoh: 'October 2026').
    d. Idle Time: Urutkan berdasarkan 'Cast off', hitung selisih dengan 'Cast-in' tongkang berikutnya memakai shift(1).
    e. Performa BLC: Target = 1350 Ton/Jam, Waktu Target, Aktual Produktivitas, Status.
    """
    df_base = df_base_raw.copy()
    df_base2 = df_base2_raw.copy()
    
    # 1. Bersihkan spasi pada nama kolom
    df_base.columns = df_base.columns.astype(str).str.strip()
    df_base2.columns = df_base2.columns.astype(str).str.strip()
    
    # 2. Tangani penamaan kolom tanggal jika di Google Sheets tertulis 'Date' atau 'DD'
    if 'Date' in df_base.columns and 'DD' not in df_base.columns:
        df_base.rename(columns={'Date': 'DD'}, inplace=True)
    if 'Date' in df_base2.columns and 'DD' not in df_base2.columns:
        df_base2.rename(columns={'Date': 'DD'}, inplace=True)
        
    # 3. Data Cleaning: Hapus baris dengan 'BG' atau 'DD' yang kosong (NaN)
    df_base.dropna(subset=['BG', 'DD'], inplace=True)
    df_base2.dropna(subset=['BG', 'DD'], inplace=True)
    
    # 4. Bersihkan spasi dan ubah kolom kunci 'BG' menjadi UPPERCASE
    df_base['BG'] = df_base['BG'].astype(str).str.strip().str.upper()
    df_base2['BG'] = df_base2['BG'].astype(str).str.strip().str.upper()
    
    # Standarisasi kolom DD menjadi string tanggal YYYY-MM-DD
    df_base['DD'] = pd.to_datetime(df_base['DD']).dt.strftime('%Y-%m-%d')
    df_base2['DD'] = pd.to_datetime(df_base2['DD']).dt.strftime('%Y-%m-%d')
    
    # Konversi kolom numerik di df_base
    df_base['Ton/Rit'] = pd.to_numeric(df_base['Ton/Rit'].astype(str).str.replace(',', '.'), errors='coerce').fillna(0)
    
    # Konversi kolom numerik di df_base2
    numeric_cols = ['Loading', 'Breakdown', 'Heavy Rain', 'Waiting']
    for col in numeric_cols:
        if col in df_base2.columns:
            df_base2[col] = pd.to_numeric(df_base2[col].astype(str).str.replace(',', '.'), errors='coerce').fillna(0)
    
    # 5. Left Join df_base2 dengan df_base berdasarkan ['BG', 'DD']
    df_merged = pd.merge(df_base2, df_base, on=['BG', 'DD'], how='left')
    
    # Konversi datetime untuk Cast-in dan Cast off
    df_merged['Cast-in'] = pd.to_datetime(df_merged['Cast-in'])
    df_merged['Cast off'] = pd.to_datetime(df_merged['Cast off'])
    
    # 6. Ekstraksi Bulan: Kolom 'Month_Year' (Januari 2026 s/d Desember 2026)
    month_id_map = {
        1: 'Januari 2026', 2: 'Februari 2026', 3: 'Maret 2026', 4: 'April 2026',
        5: 'Mei 2026', 6: 'Juni 2026', 7: 'Juli 2026', 8: 'Agustus 2026',
        9: 'September 2026', 10: 'Oktober 2026', 11: 'November 2026', 12: 'Desember 2026'
    }
    df_merged['Month_Year'] = df_merged['Cast-in'].dt.month.map(month_id_map).fillna(df_merged['Cast-in'].dt.strftime('%B %Y'))
    
    # 7. Perhitungan Idle Time:
    # Urutkan berdasarkan waktu Cast off
    df_merged = df_merged.sort_values(by='Cast off').reset_index(drop=True)
    
    # Gunakan shift(1) pada kolom 'Cast off' untuk mencari waktu selesainya tongkang sebelumnya
    df_merged['Prev_Cast_Off'] = df_merged['Cast off'].shift(1)
    
    # Idle Time (Jam) = Cast-in tongkang ini - Cast off tongkang sebelumnya
    df_merged['Idle_Time'] = (df_merged['Cast-in'] - df_merged['Prev_Cast_Off']).dt.total_seconds() / 3600.0
    
    # Jika baris pertama atau nilainya negatif (karena tumpang tindih jetty lain), set ke 0
    df_merged['Idle_Time'] = df_merged['Idle_Time'].apply(lambda x: max(0.0, float(x)) if pd.notnull(x) else 0.0)
    
    # 8. Performa BLC:
    TARGET_BLC = 1350.0  # Ton/Jam
    
    # Waktu Target = 'Ton/Rit' / 1350
    df_merged['Waktu Target'] = df_merged['Ton/Rit'] / TARGET_BLC
    
    # Aktual Produktivitas = 'Ton/Rit' / 'Loading'
    # Hindari pembagian dengan nol
    df_merged['Aktual Produktivitas'] = np.where(
        df_merged['Loading'] > 0,
        df_merged['Ton/Rit'] / df_merged['Loading'],
        0.0
    )
    
    # Status: Jika Waktu Aktual (Loading) <= Waktu Target maka "Sesuai Target", jika lebih maka "Over Time"
    df_merged['Status'] = np.where(
        df_merged['Loading'] <= df_merged['Waktu Target'],
        "Sesuai Target",
        "Over Time"
    )
    
    return df_merged


# ======================================================================================
# 5. RENDER KOMPONEN UI & CHART PLOTLY
# ======================================================================================

def render_gauge_chart(current_rate: float, target_rate: float = 1350.0):
    """
    Membuat Gauge Chart Plotly untuk membandingkan Produktivitas BLC aktual terhadap target 1350 Ton/Jam.
    """
    fig = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=current_rate,
        domain={'x': [0, 1], 'y': [0, 1]},
        delta={
            'reference': target_rate,
            'increasing': {'color': "#10b981"},
            'decreasing': {'color': "#ef4444"},
            'suffix': " T/h"
        },
        number={'suffix': " T/h", 'valueformat': ".1f", 'font': {'size': 36, 'color': '#0f172a'}},
        gauge={
            'axis': {'range': [None, 2000], 'tickwidth': 1, 'tickcolor': "#94a3b8"},
            'bar': {'color': "#2563eb" if current_rate >= target_rate else "#f59e0b", 'thickness': 0.75},
            'bgcolor': "#f1f5f9",
            'borderwidth': 0,
            'steps': [
                {'range': [0, 1100], 'color': '#fee2e2'},
                {'range': [1100, 1350], 'color': '#fef3c7'},
                {'range': [1350, 2000], 'color': '#d1fae5'}
            ],
            'threshold': {
                'line': {'color': "#dc2626", 'width': 4},
                'thickness': 0.85,
                'value': target_rate
            }
        }
    ))
    
    fig.update_layout(
        height=320,
        margin=dict(l=20, r=20, t=40, b=20),
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        font={'family': "Inter, system-ui, sans-serif"}
    )
    return fig


def render_timeline_gantt(df: pd.DataFrame):
    """
    TAB 2: Timeline Aktivitas (Gantt Chart)
    Menggunakan plotly.express.timeline dengan Sumbu Y = 'BG' dan Sumbu X = 'Cast-in' ke 'Cast off'.
    """
    color_map = {
        "Sesuai Target": "#10b981",
        "Over Time": "#ef4444"
    }
    
    fig = px.timeline(
        df,
        x_start="Cast-in",
        x_end="Cast off",
        y="BG",
        color="Status",
        color_discrete_map=color_map,
        hover_data={
            "Ton/Rit": ":,.0f MT",
            "Loading": ":.1f Jam",
            "Aktual Produktivitas": ":.1f T/h",
            "Idle_Time": ":.1f Jam"
        },
        title="Gantt Chart: Jadwal & Durasi Sandar Tongkang (Cast-in ke Cast off)"
    )
    
    fig.update_yaxes(autorange="reversed", title="")
    fig.update_xaxes(title="Waktu Operasional")
    fig.update_layout(
        height=480,
        margin=dict(l=20, r=20, t=50, b=20),
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='#fafafa',
        font={'family': "Inter, system-ui, sans-serif"},
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    return fig


def render_delay_pareto(df: pd.DataFrame):
    """
    TAB 3: Analisis Delay
    Agregasi kolom 'Breakdown', 'Heavy Rain', dan 'Waiting'.
    Ditampilkan dalam Pareto Chart (Bar Chart + Garis Kumulatif 80/20).
    """
    # 1. Agregasi total delay per kategori
    total_breakdown = df['Breakdown'].sum()
    total_rain = df['Heavy Rain'].sum()
    total_waiting = df['Waiting'].sum()
    
    delay_data = pd.DataFrame({
        'Kategori Delay': ['Breakdown Alat / BLC', 'Heavy Rain (Cuaca)', 'Waiting (Tunggu Cargo/Tug)'],
        'Total Jam': [total_breakdown, total_rain, total_waiting]
    })
    
    # Urutkan descending untuk Pareto
    delay_data = delay_data.sort_values(by='Total Jam', ascending=False).reset_index(drop=True)
    
    total_all_delays = delay_data['Total Jam'].sum()
    if total_all_delays > 0:
        delay_data['Kumulatif Jam'] = delay_data['Total Jam'].cumsum()
        delay_data['Kumulatif Persen'] = (delay_data['Kumulatif Jam'] / total_all_delays) * 100.0
    else:
        delay_data['Kumulatif Jam'] = 0
        delay_data['Kumulatif Persen'] = 0
        
    # Buat Pareto Chart dengan dual axis
    fig = go.Figure()
    
    # Bar Chart jam delay
    fig.add_trace(go.Bar(
        x=delay_data['Kategori Delay'],
        y=delay_data['Total Jam'],
        name="Total Jam Delay",
        marker_color=["#ef4444", "#3b82f6", "#f59e0b"],
        text=[f"{val:.1f} Jam" for val in delay_data['Total Jam']],
        textposition="auto"
    ))
    
    # Garis Pareto (Kumulatif Persentase)
    fig.add_trace(go.Scatter(
        x=delay_data['Kategori Delay'],
        y=delay_data['Kumulatif Persen'],
        name="Persentase Kumulatif (%)",
        yaxis="y2",
        mode="lines+markers",
        line=dict(color="#10b981", width=3),
        marker=dict(size=8, color="#065f46")
    ))
    
    # Garis batas 80% (Aturan Pareto)
    fig.add_hline(
        y=80,
        y_ref="y2",
        line_dash="dot",
        line_color="#94a3b8",
        annotation_text="Batas 80%",
        annotation_position="top left"
    )
    
    fig.update_layout(
        title="Pareto Chart: Distribusi & Kontribusi Delay Operasional",
        yaxis=dict(title="Durasi Delay (Jam)", side="left"),
        yaxis2=dict(title="Kumulatif (%)", side="right", overlaying="y", range=[0, 105]),
        height=420,
        margin=dict(l=20, r=20, t=50, b=20),
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='#fafafa',
        font={'family': "Inter, system-ui, sans-serif"},
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
    )
    return fig, delay_data


# ======================================================================================
# 6. APLIKASI UTAMA (MAIN CONTROLLER)
# ======================================================================================
def main():
    # Header Utama
    st.markdown("""
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px;">
            <div>
                <div class="main-header">🚢 Dashboard Barge Loading Operasional</div>
                <div class="sub-header">Monitoring Jetty Port Performance, BLC Productivity & Delay Management — PT WBS</div>
            </div>
            <div style="text-align: right;">
                <span class="badge-success">Target BLC: 1,350 MT/Jam</span>
            </div>
        </div>
    """, unsafe_allow_html=True)
    
    # ----------------------------------------------------------------------------------
    # SIDEBAR: KONEKSI & FILTER BULAN DINAMIS
    # ----------------------------------------------------------------------------------
    st.sidebar.image("https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.0.3", use_container_width=True)
    st.sidebar.title("Pengaturan Operasional")
    
    # Opsi Input URL Google Sheets
    with st.sidebar.expander("🔗 Konfigurasi Google Sheets", expanded=False):
        st.write("Menggunakan `st.connection('gsheets', type=GSheetsConnection)`")
        sheets_url_input = st.text_input(
            "URL Google Spreadsheet:",
            value="",
            placeholder="https://docs.google.com/spreadsheets/d/...",
            help="Pastikan spreadsheet memiliki tab 'BASE' dan 'BASE2' serta telah dibagikan hak akses view."
        )
        if st.button("🔄 Refresh Data Cache"):
            st.cache_data.clear()
            st.success("Cache 10 menit telah direset!")
            st.rerun()

    # Load data mentah dengan cache 10 menit
    raw_base, raw_base2, conn_status = load_data(sheets_url_input if sheets_url_input else None)
    
    st.sidebar.caption(f"Status Data: **{conn_status}**")
    
    # Preprocessing data
    df_clean = clean_and_preprocess_data(raw_base, raw_base2)
    
    # FILTER DINAMIS: Dropdown Bulan (Mulai dari Januari 2026 sampai Desember 2026)
    ordered_months_2026 = [
        "Januari 2026", "Februari 2026", "Maret 2026", "April 2026",
        "Mei 2026", "Juni 2026", "Juli 2026", "Agustus 2026",
        "September 2026", "Oktober 2026", "November 2026", "Desember 2026"
    ]
    months_in_data = set(df_clean['Month_Year'].unique())
    available_months = [m for m in ordered_months_2026 if m in months_in_data]
    if not available_months:
        available_months = ordered_months_2026
        
    # Pilihan default dimulai dari Januari 2026 sampai Desember 2026
    selected_month = st.sidebar.selectbox(
        "Pilih Periode Bulan (Month_Year):",
        options=available_months + ["Semua Periode (Januari - Desember 2026)"],
        index=0, # Mulai dari Januari 2026
        help="Memfilter metrik dan visualisasi di seluruh tab dashboard."
    )
    
    # Filter dataset berdasarkan pilihan bulan
    if not selected_month.startswith("Semua Periode"):
        df_filtered = df_clean[df_clean['Month_Year'] == selected_month].copy()
    else:
        df_filtered = df_clean.copy()
        
    st.sidebar.markdown("---")
    st.sidebar.markdown(f"**Ringkasan Filter Aktif:**")
    st.sidebar.write(f"- Periode: `{selected_month}`")
    st.sidebar.write(f"- Jumlah Tongkang: `{len(df_filtered)} Unit`")
    
    # ----------------------------------------------------------------------------------
    # TAB NAVIGASI UTAMA (3 BAGIAN SESUAI PRD)
    # ----------------------------------------------------------------------------------
    tab1, tab2, tab3, tab4 = st.tabs([
        "📊 Executive Summary",
        "⏱️ Timeline Aktivitas",
        "⚠️ Analisis Delay",
        "📋 Data Detail & Sheet Inspector"
    ])
    
    # ----------------------------------------------------------------------------------
    # TAB 1: EXECUTIVE SUMMARY
    # ----------------------------------------------------------------------------------
    with tab1:
        # Perhitungan Metrik Utama
        total_volume = df_filtered['Ton/Rit'].sum()
        total_loading_hours = df_filtered['Loading'].sum()
        avg_loading_rate = total_volume / total_loading_hours if total_loading_hours > 0 else 0
        avg_idle_time = df_filtered['Idle_Time'].mean() if len(df_filtered) > 0 else 0
        
        target_met_count = (df_filtered['Status'] == "Sesuai Target").sum()
        target_ratio = (target_met_count / len(df_filtered) * 100) if len(df_filtered) > 0 else 0
        
        # Grid Metrik Gaya Cupertino (Modern Cards)
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-title">Total Volume Coal Loading</div>
                <div class="metric-value">{total_volume:,.0f} <span style="font-size: 1rem; color: #64748b;">MT</span></div>
                <div class="metric-delta neutral">{len(df_filtered)} Tongkang Selesai Muat</div>
            </div>
            """, unsafe_allow_html=True)
            
        with col2:
            delta_class = "positive" if avg_loading_rate >= 1350 else "negative"
            delta_sign = "+" if avg_loading_rate >= 1350 else ""
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-title">Rata-rata Loading Rate (BLC)</div>
                <div class="metric-value">{avg_loading_rate:,.1f} <span style="font-size: 1rem; color: #64748b;">T/h</span></div>
                <div class="metric-delta {delta_class}">{delta_sign}{avg_loading_rate - 1350:,.1f} T/h vs Target 1,350</div>
            </div>
            """, unsafe_allow_html=True)
            
        with col3:
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-title">Rata-rata Idle Time Jetty</div>
                <div class="metric-value">{avg_idle_time:.2f} <span style="font-size: 1rem; color: #64748b;">Jam</span></div>
                <div class="metric-delta neutral">Waktu antrian antar tongkang</div>
            </div>
            """, unsafe_allow_html=True)
            
        with col4:
            ratio_class = "positive" if target_ratio >= 70 else "negative"
            st.markdown(f"""
            <div class="metric-card">
                <div class="metric-title">Kepatuhan Waktu Target</div>
                <div class="metric-value">{target_ratio:.1f}%</div>
                <div class="metric-delta {ratio_class}">{target_met_count} dari {len(df_filtered)} tongkang On-Time</div>
            </div>
            """, unsafe_allow_html=True)
            
        st.markdown("<br>", unsafe_allow_html=True)
        
        # Baris Gauge Chart & Distribusi Kinerja
        chart_col1, chart_col2 = st.columns([5, 7])
        
        with chart_col1:
            st.subheader("🎯 Produktivitas BLC vs Target 1,350 T/h")
            gauge_fig = render_gauge_chart(avg_loading_rate, target_rate=1350.0)
            st.plotly_chart(gauge_fig, use_container_width=True)
            
        with chart_col2:
            st.subheader("⚡ Distribusi Produktivitas Per Tongkang")
            fig_bar = px.bar(
                df_filtered,
                x="BG",
                y="Aktual Produktivitas",
                color="Status",
                color_discrete_map={"Sesuai Target": "#10b981", "Over Time": "#ef4444"},
                labels={"Aktual Produktivitas": "Ton / Jam"},
                text_auto=".0f"
            )
            fig_bar.add_hline(y=1350, line_dash="dash", line_color="#dc2626", annotation_text="Target: 1,350 T/h")
            fig_bar.update_layout(
                height=320,
                margin=dict(l=10, r=10, t=30, b=30),
                paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='#fafafa',
                font={'family': "Inter, system-ui, sans-serif"}
            )
            st.plotly_chart(fig_bar, use_container_width=True)
            
        # Data Resmi Spreadsheet Operasional PT WBS
        st.subheader("📑 Performance Departement Operation 2026 (Data Resmi Spreadsheet)")
        df_dept_kpi = pd.DataFrame([
            {"Parameter": "Coal Hauling Plan (MT)", "Daily (13-Okt)": "16.647", "Weekly (6-13 Okt)": "116.530", "Monthly": "499.413", "Yearly 2026": "4.744.423"},
            {"Parameter": "Coal Hauling Actual (MT)", "Daily (13-Okt)": "20.309", "Weekly (6-13 Okt)": "156.634", "Monthly": "270.993", "Yearly 2026": "4.833.891"},
            {"Parameter": "Pencapaian Hauling (%)", "Daily (13-Okt)": "122%", "Weekly (6-13 Okt)": "134%", "Monthly": "54%", "Yearly 2026": "102%"},
            {"Parameter": "Coal Barging Plan (MT)", "Daily (13-Okt)": "16.452", "Weekly (6-13 Okt)": "115.161", "Monthly": "493.548", "Yearly 2026": "4.688.710"},
            {"Parameter": "Coal Barging Actual (MT)", "Daily (13-Okt)": "12.627", "Weekly (6-13 Okt)": "157.982", "Monthly": "201.651", "Yearly 2026": "4.790.293"},
            {"Parameter": "Pencapaian Barging (%)", "Daily (13-Okt)": "77%", "Weekly (6-13 Okt)": "137%", "Monthly": "41%", "Yearly 2026": "102%"},
            {"Parameter": "Produktivitas BLC Plan (T/h)", "Daily (13-Okt)": "1.350,00", "Weekly (6-13 Okt)": "1.350,00", "Monthly": "1.350,00", "Yearly 2026": "1.350,00"},
            {"Parameter": "Produktivitas BLC Actual (T/h)", "Daily (13-Okt)": "1.510,70", "Weekly (6-13 Okt)": "1.413,51", "Monthly": "1.310,21", "Yearly 2026": "1.397,47"},
            {"Parameter": "Durasi Loading per Siklus (Jam)", "Daily (13-Okt)": "6,08", "Weekly (6-13 Okt)": "8,88", "Monthly": "9,84", "Yearly 2026": "9,07"},
            {"Parameter": "Cycle Time Flat Deck (Menit)", "Daily (13-Okt)": "145,29", "Weekly (6-13 Okt)": "134,28", "Monthly": "143,81", "Yearly 2026": "131,42"},
            {"Parameter": "Flat Deck Running (Unit)", "Daily (13-Okt)": "41", "Weekly (6-13 Okt)": "42", "Monthly": "37", "Yearly 2026": "41"}
        ])
        st.dataframe(df_dept_kpi, use_container_width=True)
            
        # Tabel Rekap Cepat Tongkang
        st.subheader("📋 Ringkasan Performa Tongkang Periode Terpilih")
        display_cols = ['BG', 'DD', 'Ton/Rit', 'Loading', 'Waktu Target', 'Aktual Produktivitas', 'Idle_Time', 'Status']
        st.dataframe(
            df_filtered[display_cols].style.format({
                'Ton/Rit': '{:,.0f} MT',
                'Loading': '{:.2f} Jam',
                'Waktu Target': '{:.2f} Jam',
                'Aktual Produktivitas': '{:.1f} T/h',
                'Idle_Time': '{:.2f} Jam'
            }),
            use_container_width=True
        )

    # ----------------------------------------------------------------------------------
    # TAB 2: TIMELINE AKTIVITAS (GANTT CHART)
    # ----------------------------------------------------------------------------------
    with tab2:
        st.subheader("⏱️ Visualisasi Timeline & Durasi Sandar (Cast-in ke Cast off)")
        st.caption("Memvisualisasikan urutan sandar, waktu mulai pengisian, durasi penundaan (delay), hingga pelepasan tali (Cast off).")
        
        timeline_fig = render_timeline_gantt(df_filtered)
        st.plotly_chart(timeline_fig, use_container_width=True)
        
        # Metrik durasi rata-rata
        gantt_col1, gantt_col2, gantt_col3 = st.columns(3)
        with gantt_col1:
            total_berth_hours = (df_filtered['Cast off'] - df_filtered['Cast-in']).dt.total_seconds().sum() / 3600.0
            st.metric("Total Waktu Sandar (Berthing)", f"{total_berth_hours:,.1f} Jam")
        with gantt_col2:
            st.metric("Total Waktu Pengisian Netto", f"{df_filtered['Loading'].sum():,.1f} Jam")
        with gantt_col3:
            total_idle = df_filtered['Idle_Time'].sum()
            st.metric("Akumulasi Idle Time Jetty", f"{total_idle:,.1f} Jam")

    # ----------------------------------------------------------------------------------
    # TAB 3: ANALISIS DELAY (PARETO & BAR CHART)
    # ----------------------------------------------------------------------------------
    with tab3:
        st.subheader("⚠️ Analisis Delay Operasional Jetty & BLC")
        st.caption("Identifikasi faktor penghambat utama loading menggunakan prinsip Pareto (Breakdown, Heavy Rain, Waiting).")
        
        pareto_fig, delay_summary = render_delay_pareto(df_filtered)
        st.plotly_chart(pareto_fig, use_container_width=True)
        
        # Detail Tabel Delay
        d_col1, d_col2 = st.columns([5, 7])
        with d_col1:
            st.markdown("##### Tabel Rincian Delay")
            st.dataframe(
                delay_summary.style.format({
                    'Total Jam': '{:.2f} Jam',
                    'Kumulatif Jam': '{:.2f} Jam',
                    'Kumulatif Persen': '{:.1f}%'
                }),
                use_container_width=True
            )
            
        with d_col2:
            st.markdown("##### Komparasi Rata-rata Delay per Tongkang")
            bar_comp = px.bar(
                df_filtered,
                x="BG",
                y=["Breakdown", "Heavy Rain", "Waiting"],
                title="Distribusi Delay per Tongkang (Jam)",
                barmode="stack",
                labels={"value": "Jam", "variable": "Faktor Delay"},
                color_discrete_map={
                    "Breakdown": "#ef4444",
                    "Heavy Rain": "#3b82f6",
                    "Waiting": "#f59e0b"
                }
            )
            bar_comp.update_layout(
                height=300,
                margin=dict(l=10, r=10, t=30, b=20),
                paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='#fafafa',
                font={'family': "Inter, system-ui, sans-serif"}
            )
            st.plotly_chart(bar_comp, use_container_width=True)

    # ----------------------------------------------------------------------------------
    # TAB 4: DATA DETAIL & INSPEKSI GOOGLE SHEETS
    # ----------------------------------------------------------------------------------
    with tab4:
        st.subheader("🔗 Menu Pemasangan Link Google Spreadsheet")
        st.caption("Hubungkan link Google Spreadsheet langsung untuk memperbarui dataset operasional 'BASE' dan 'BASE2'.")
        
        with st.form("form_link_spreadsheet"):
            col_url, col_btn = st.columns([8, 2])
            with col_url:
                new_url_input = st.text_input(
                    "URL Google Spreadsheet:",
                    value=sheets_url_input if sheets_url_input else "",
                    placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                )
            with col_btn:
                st.write("")
                st.write("")
                submit_url = st.form_submit_button("🔗 Pasang & Sinkronkan")
                
            if submit_url and new_url_input:
                st.success("Tautan spreadsheet berhasil dipasangkan!")
                st.cache_data.clear()
                st.rerun()

        st.markdown("---")
        st.subheader("🔍 Inspeksi Data Tab 'BASE' dan 'BASE2'")
        sheet_tab1, sheet_tab2, sheet_tab3 = st.tabs(["Dataset Gabungan (Merged)", "Tab BASE Mentah", "Tab BASE2 Mentah"])
        
        with sheet_tab1:
            st.write(f"Menampilkan {len(df_filtered)} data gabungan setelah pembersihan & kalkulasi.")
            st.dataframe(df_filtered, use_container_width=True)
            
        with sheet_tab2:
            st.write(f"Tab 'BASE' (Volume MT per Tongkang) — {len(raw_base)} baris.")
            st.dataframe(raw_base, use_container_width=True)
            
        with sheet_tab3:
            st.write(f"Tab 'BASE2' (Waktu Loading, Delay & Cast off) — {len(raw_base2)} baris.")
            st.dataframe(raw_base2, use_container_width=True)


if __name__ == "__main__":
    main()
