export type PeriodType = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

export interface ColumnMapping {
  base: {
    noBarge: number;
    date: number;
    tugBoat: number;
    barge: number;
    code: number;
    cargo: number;
    totalTonase: number;
    inPosition: number;
    commencedLoading: number;
    completedLoading: number;
    castOff: number;
    grossPdty: number;
    grossDuration: number;
    netDuration: number;
    planTonase: number;
  };
  base2: {
    noBarge: number;
    tugBoat: number;
    barge: number;
    date: number;
    startTime: number;
    endTime: number;
    castIn: number;
    waitingSurveyorInit: number;
    initialDraft: number;
    movingCargo: number;
    tambahanCargo: number;
    collectingCargo: number;
    prepareLoading: number;
    loadingToBarge: number;
    waitingCargo: number;
    breakdown: number;
    changeShift: number;
    restTime: number;
    safetyTalk: number;
    heavyRain: number;
    waitingSurveyorFinal: number;
    finalDraft: number;
    externalProblem: number;
    finalDraft2: number;
    waitingTugboat: number;
    castOff: number;
    remark: number;
    problem: number;
  };
}

export interface BargeRecord {
  id: string;
  noBarge: number;
  dateStr: string;
  dateObj: Date;
  monthKey: string; // e.g. '2026-10'
  weekKey: string;  // e.g. '2026-W43'
  tugBoat: string;
  bargeName: string;
  customerCode: string;
  cargoType: string;
  tonnage: number;
  planTonnage: number;
  ritase: number;
  tonPerRit: number;
  inPositionStr: string;
  commencedLoadingStr: string;
  completedLoadingStr: string;
  castOffStr: string;
  grossHours: number;
  effectiveLoadingHours: number;
  grossRateTph: number;
  effectiveRateTph: number;
  // Delay breakdown in hours (merged from BASE2 & BASE)
  standbyHours: number;      // Operational Standby / Idle (Yellow)
  breakdownHours: number;    // Equipment Breakdown (Red)
  weatherExternalHours: number; // Weather / Rain / External / Tidal (Blue)
  totalTurnaroundHours: number;
  // Specific sub-causes in hours for Pareto
  delayCauses: {
    waitingCargoStockpile: number;
    berthingDraftSurvey: number;
    shiftRestP5M: number;
    equipmentBreakdown: number;
    heavyRainWeather: number;
    tugboatExternalTidal: number;
  };
  fuelLiters: number;
  fuelRatioLPerTon: number; // Liter / Ton for Loading to Barge
  hmHours: number;
  hmRatioPerTon: number;    // HM / 1000 Ton or HM / Ton
  remarks: string[];
  isOverLaytime: boolean;
}

export interface PeriodScorecardMetric {
  plan: number;
  actual: number;
  variance: number;
  achievementPct: number;
}

export interface ExecutiveMatrix {
  periodLabel: Record<PeriodType, string>;
  loadingTonase: Record<PeriodType, PeriodScorecardMetric>;
  blcRate: Record<PeriodType, PeriodScorecardMetric>;
  portIdleDelay: Record<PeriodType, PeriodScorecardMetric>;
  haulingTonase: Record<PeriodType, PeriodScorecardMetric>;
  cycleTimeFlatDeck: Record<PeriodType, PeriodScorecardMetric>;
  flatDeckRunning: Record<PeriodType, PeriodScorecardMetric>;
}

export interface EfficiencyRecord {
  dateStr: string;
  dateObj: Date;
  monthKey: string;
  weekLabel: string;
  tonnageLoaded: number;
  // Loading to Barge specific
  loadingFuelRatioPlan: number;
  loadingFuelRatioActual: number;
  loadingHmRatioPlan: number;
  loadingHmRatioActual: number;
  // Total & Upstream Activities for comparison
  unloadingCyFuelActual: number;
  unloadingCyHmActual: number;
  coalHaulingFuelActual: number;
  coalHaulingHmActual: number;
  stockpileFuelActual: number;
  stockpileHmActual: number;
  movingCargoFuelActual: number;
  movingCargoHmActual: number;
  totalFuelActual: number;
  totalHmActual: number;
  cycleTimeFlatDeck: number;
  flatDeckUnits: number;
  isAnomaly: boolean;
  anomalyReason?: string;
}

export interface SheetSyncStatus {
  spreadsheetId: string;
  spreadsheetUrl: string;
  lastSyncedAt: string;
  isLive: boolean;
  isSyncing: boolean;
  error: string | null;
  counts: {
    baseTotalRows: number;
    base2026Rows: number;
    base2TotalRows: number;
    base2_2026Rows: number;
    mentariRows: number;
    rasioCyRows: number;
    hauling2026Rows?: number;
  };
}

export interface HaulingRecord {
  id: string;
  rowNumber: number;
  dateObj: Date;
  dateIso: string; // 'YYYY-MM-DD'
  dateStr: string; // e.g. '30-Okt-2026'
  monthKey: string; // e.g. '2026-10'
  code: string;
  cargo: string; // Normalized uppercase cargo without 'PRODUCT '
  incomingTon: number;
  noKa: string; // Cleaned string without spaces
  durasiMenit: number | null; // Null if missing/invalid so excluded from average
  jumlahFd: number | null; // Null if missing/invalid (e.g. 'MIP') so excluded from average
  shift: string; // Cleaned string without spaces (e.g. '1', '2', '1>2', '2>1')
  kendala: string;
  isOutlierDuration: boolean; // durasiMenit > 400
}

export interface HaulingPeriodMetrics {
  period: PeriodType;
  label: string;
  startDateIso: string;
  endDateIso: string;
  calendarDays: number;
  hasData: boolean;
  // 1. Tonase Hauling (MT)
  planTon: number | null;
  actualTon: number | null;
  tonAchievementPct: number | null;
  // 2. Durasi Bongkar per KA (menit)
  planDurasi: number;
  actualDurasi: number | null;
  selisihDurasi: number | null; // Actual - Plan (positif = Over, negatif = Hemat)
  outlierCount: number;
  // 3. Jumlah Truk FD per KA
  planFd: number;
  actualFd: number | null;
  selisihFd: number | null; // Actual - Plan
  // 4. KA Dibongkar per Hari
  totalKa: number;
  planKaPeriode: number | null;
  planKaPerHari: number | null;
  actualKaPerHari: number | null;
  kaAchievementPct: number | null;
}

export interface HaulingKpiResult {
  refDateIso: string;
  refDateLabel: string;
  excludeOutlierDuration: boolean;
  totalRows2026: number;
  byMonthCount: Record<string, number>;
  periods: Record<PeriodType, HaulingPeriodMetrics>;
}

export interface DailyKaItem {
  dateIso: string;
  dateLabel: string;
  fullDateLabel: string;
  monthKey: string;
  jumlahKa: number;
  planKa: number | null;
  totalTonase: number;
  avgDurasi: number | null;
  avgDurasiRaw: number | null;
  avgFd: number | null;
  kendalaList: string[];
  hasOutlier: boolean;
  outlierDetails: string[];
}

export interface MonthlyKaSummary {
  monthKey: string;
  monthLabel: string;
  fullMonthLabel: string;
  calendarDays: number;
  jumlahKa: number;
  kaPerHari: number;
  planKaPerHari: number | null;
  totalTonase: number;
  avgDurasi: number | null;
  avgFd: number | null;
  kendalaList: string[];
  hasOutlier: boolean;
  outlierDetails: string[];
}

