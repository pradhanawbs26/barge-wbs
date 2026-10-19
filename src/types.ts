export interface BaseRecord {
  BG: string;       // Nama Tongkang
  DD: string;       // Tanggal format YYYY-MM-DD
  'Ton/Rit': number; // Volume aktual batubara dalam MT
}

export interface Base2Record {
  BG: string;         // Nama Tongkang
  DD: string;         // Tanggal format YYYY-MM-DD
  'Cast-in': string;  // Datetime format YYYY-MM-DD HH:mm:ss
  Loading: number;    // Durasi pengisian netto (jam)
  'Cast off': string; // Datetime format YYYY-MM-DD HH:mm:ss
  Breakdown: number;  // Durasi kendala mesin/BLC (jam)
  'Heavy Rain': number; // Durasi kendala hujan lebat (jam)
  Waiting: number;    // Durasi tunggu tongkang/tugboat/draft (jam)
}

export interface ProcessedBarge {
  id: string;
  BG: string;
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
