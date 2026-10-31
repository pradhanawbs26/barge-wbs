/**
 * Konfigurasi Target & Parameter KPI Hauling (Bongkar KA -> Stockpile)
 * Semua perhitungan dibatasi hanya untuk tahun FOCUS_YEAR (2026).
 */

export const FOCUS_YEAR = 2026;

export interface HaulingConfig {
  focusYear: number;
  defaultRefDateIso: string;
  /**
   * Plan tonase hauling bulanan (MT).
   * Plan ton harian = plan bulan / jumlah hari kalender bulan tersebut.
   * Jika sebuah bulan belum diisi (undefined / null), UI akan menampilkan "–" untuk Plan dan %Ach.
   */
  planTonPerBulan: Record<string, number | undefined>;
  /** Target durasi bongkar maksimal per KA (menit) — lebih rendah lebih baik */
  planDurasiMenit: number;
  /** Target jumlah truk Flat Deck (FD) per KA */
  planFdPerKa: number;
  /** Standar tonase per rangkaian KA (MT) */
  planTonPerKa: number;
  /** Target jumlah rangkaian KA yang dibongkar per hari (KA/hari) */
  planKaPerHari: number;
  /** Flag arah evaluasi FD: true = Actual >= Plan hijau; false = Actual <= Plan hijau */
  fdHigherIsBetter: boolean;
  /** Ambang batas outlier durasi bongkar KA (menit) untuk fitur toggle exclude outlier */
  outlierDurationThresholdMinutes: number;
}

export const HAULING_CONFIG: HaulingConfig = {
  focusYear: FOCUS_YEAR,
  defaultRefDateIso: '2026-10-30',
  planTonPerBulan: {
    '2026-01': 507459,
    '2026-02': 458720,
    '2026-03': 513193,
    '2026-04': 495991,
    '2026-05': 510326,
    '2026-06': 493124,
    '2026-07': 516060,
    '2026-08': 510326,
    '2026-09': 493124,
    '2026-10': 516060,
    // '2026-11' dan '2026-12' belum diisi -> otomatis tampil "–" untuk plan & %Ach jika dipilih
  },
  planDurasiMenit: 120,
  planFdPerKa: 40,
  planTonPerKa: 2800,
  planKaPerHari: 7,
  fdHigherIsBetter: true,
  outlierDurationThresholdMinutes: 400,
};
