export interface ActivityLogItem {
  rowNumber: number;
  voyageNo?: string;      // Column A
  tb?: string;            // Column B (Tug Boat)
  bg?: string;            // Column C (Barge)
  loadingDate?: string;   // Column D (DD Pemuatan)
  activityDate?: string;  // Column E (Date Aktual Aktifitas, bisa lintas hari)
  startTime?: string;     // Column F (Start Time HH:MM)
  endTime?: string;       // Column G (End Time HH:MM)
  activityName: string;   // Column H..AA Name
  durationHours: number;  // Durasi dalam jam desimal
  durationFormatted?: string; // Format teks HH:MM (contoh: "1:35")
  category: 'Loading' | 'Breakdown' | 'Heavy Rain' | 'Waiting' | 'Standby' | 'Shift / Rest' | 'Surveyor' | 'Other';
  rawDetails?: string;
}

export interface BaseRecord {
  BG: string;       // Nama Tongkang
  DD: string;       // Tanggal format YYYY-MM-DD
  'Ton/Rit': number; // Volume aktual batubara dalam MT
  TB?: string;      // Nama Tug Boat (opsional jika ada)
  voyageNo?: string;
}

export interface Base2Record {
  voyageNo?: string;  // Column A: Voyage ID
  TB?: string;        // Column B: Nama Tug Boat
  BG: string;         // Column C: Nama Tongkang / Barge
  DD: string;         // Column D: Tanggal Pemuatan
  actualDate?: string;// Column E: Tanggal Aktual Aktifitas
  startTime?: string; // Column F: Start Time (HH:MM)
  endTime?: string;   // Column G: End Time (HH:MM)
  'Cast-in': string;  // Datetime format YYYY-MM-DD HH:mm:ss
  Loading: number;    // Durasi pengisian netto (jam)
  'Cast off': string; // Datetime format YYYY-MM-DD HH:mm:ss
  Breakdown: number;  // Durasi kendala mesin/BLC (jam)
  'Heavy Rain': number; // Durasi kendala hujan lebat (jam)
  Waiting: number;    // Durasi tunggu tongkang/tugboat/draft (jam)
  shiftRest?: number; // Durasi Change Shift / Rest Time (jam)
  surveyorTime?: number; // Durasi Surveyor Draft Initial/Final (jam)
  activityDetails?: ActivityLogItem[]; // Rincian aktivitas & delay dari Kolom H s/d AA
  rawRowIndex?: number;
}

export interface ProcessedBarge {
  id: string;
  voyageNo?: string; // Column A: Nomor Voyage
  TB?: string; // Column B: Nama Tug Boat
  BG: string;  // Column C: Nama Tongkang
  DD: string;
  TonRit: number;
  CastIn: string;
  CastInDate: Date;
  Loading: number;
  CastOff: string;
  CastOffDate: Date;
  Breakdown: number;
  HeavyRain: number;
  Waiting: number;
  TotalDelay: number;
  BerthDuration: number;
  Month_Year: string;
  PrevCastOff?: string;
  IdleTime: number; // Jam menganggur jetty sebelum tongkang ini sandar
  WaktuTarget: number; // TonRit / 1350
  AktualProduktivitas: number; // TonRit / Loading
  Status: 'Sesuai Target' | 'Over Time';
  activityDetails?: ActivityLogItem[]; // Daftar aktivitas & delay dari kolom H s/d AA
  rowCount?: number; // Jumlah baris log aktivitas untuk tongkang ini
}

export interface DelayMetric {
  kategori: string;
  totalJam: number;
  kumulatifJam: number;
  kumulatifPersen: number;
  color: string;
}

export interface GSheetsConfig {
  spreadsheetUrl: string;
  sheetBaseName: string;
  sheetBase2Name: string;
  cacheTtlSeconds: number;
  lastSynced?: Date;
  status: 'connected' | 'sample_data' | 'syncing' | 'error';
  errorMessage?: string;
}

export interface DepartmentKpiRecord {
  periodName: string;
  dateRange: string;
  haulingPlan: number;
  haulingActual: number;
  haulingAchPct: number;
  bargingPlan: number;
  bargingActual: number;
  bargingAchPct: number;
  cycleTimePlan: number;
  cycleTimeActual: number;
  unitsRunningPlan: number;
  unitsRunningActual: number;
  loadingDurationPlan: number;
  loadingDurationActual: number;
  blcRatePlan: number;
  blcRateActual: number;
}
