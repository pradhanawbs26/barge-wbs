import { BaseRecord, Base2Record, ActivityLogItem } from '../types';

export const MONTH_NAMES_ID = [
  'Januari 2026', 'Februari 2026', 'Maret 2026', 'April 2026',
  'Mei 2026', 'Juni 2026', 'Juli 2026', 'Agustus 2026',
  'September 2026', 'Oktober 2026', 'November 2026', 'Desember 2026'
];

export const MONTH_NAMES_EN = [
  'January 2026', 'February 2026', 'March 2026', 'April 2026',
  'May 2026', 'June 2026', 'July 2026', 'August 2026',
  'September 2026', 'October 2026', 'November 2026', 'December 2026'
];

/**
 * Dataset Acuan Operasional PT WBS:
 * - Menggunakan sequence nomor urutan di Kolom A (mulai dari September Voyage 987, lalu Oktober 988, 989, 990, 991, dst.)
 * - Nama kapal Tug Boat di Kolom B (ELWOOD, KARYA PACIFIC 2270, MBP 2206, MBP 2211, KARYA PACIFIC 2251, dst.)
 * - Nama tongkang di Kolom C (PIPPA, PACIFIC STAR 8722, MBP 9006, MBP 9003, PACIFIC STAR 8710, dst.)
 * - Tanggal pemuatan di Kolom D persis (30-Sep-26, 1-Okt-26, 2-Okt-26, 3-Okt-26, dst.)
 * - Rincian aktivitas & delay persis Kolom H s/d AA
 */
function buildOperationalDataset(): { base: BaseRecord[]; base2: Base2Record[] } {
  const baseData: BaseRecord[] = [];
  const base2Data: Base2Record[] = [];

  // 1. DATA ACUAN EKSPLISIT: SEPTEMBER & OKTOBER 2026 (PERSIS SPREADSHEET SHEET BASE & BASE2)
  interface ExplicitVoyage {
    voyageNo: string;
    tb: string;
    bg: string;
    dd: string; // Kolom D format Indonesia: e.g. "1-Okt-26"
    actualDate: string; // Kolom E
    castInTime: string;
    castOffTime: string;
    castInIso: string;
    castOffIso: string;
    tonRit: number;
    loadingNetto: number;
    breakdown: number;
    waiting: number;
    shiftRest: number;
    logs: ActivityLogItem[];
  }

  const explicitOctoberVoyages: ExplicitVoyage[] = [
    // --- AKHIR SEPTEMBER (Siklus penyeberang ke 1-Okt-26) ---
    {
      voyageNo: '987',
      tb: 'ELWOOD',
      bg: 'PIPPA',
      dd: '30-Sep-26',
      actualDate: '30-Sep-26',
      castInTime: '22:50',
      castOffTime: '06:10',
      castInIso: '2026-09-30 22:50:00',
      castOffIso: '2026-10-01 06:10:00',
      tonRit: 8250,
      loadingNetto: 5.67,
      breakdown: 0.0,
      waiting: 0.0,
      shiftRest: 1.25,
      logs: [
        { rowNumber: 1, voyageNo: '987', tb: 'ELWOOD', bg: 'PIPPA', loadingDate: '30-Sep-26', activityDate: '30-Sep-26', startTime: '22:50', endTime: '23:00', activityName: 'Initial draft survey', category: 'Surveyor', durationHours: 0.17, durationFormatted: '0:10' },
        { rowNumber: 2, voyageNo: '987', tb: 'ELWOOD', bg: 'PIPPA', loadingDate: '30-Sep-26', activityDate: '30-Sep-26', startTime: '23:00', endTime: '00:00', activityName: 'Loading to Barge', category: 'Loading', durationHours: 1.0, durationFormatted: '1:00' },
        { rowNumber: 3, voyageNo: '987', tb: 'ELWOOD', bg: 'PIPPA', loadingDate: '30-Sep-26', activityDate: '30-Sep-26', startTime: '00:00', endTime: '01:05', activityName: 'Rest Time (ISTIRAHAT)', category: 'Shift / Rest', durationHours: 1.08, durationFormatted: '1:05' },
        { rowNumber: 4, voyageNo: '987', tb: 'ELWOOD', bg: 'PIPPA', loadingDate: '1-Okt-26', activityDate: '30-Sep-26', startTime: '01:05', endTime: '03:25', activityName: 'Loading to Barge', category: 'Loading', durationHours: 2.33, durationFormatted: '2:20' },
        { rowNumber: 5, voyageNo: '987', tb: 'ELWOOD', bg: 'PIPPA', loadingDate: '1-Okt-26', activityDate: '30-Sep-26', startTime: '03:25', endTime: '03:35', activityName: 'Rest Time (ISTIRAHAT)', category: 'Shift / Rest', durationHours: 0.17, durationFormatted: '0:10' },
        { rowNumber: 6, voyageNo: '987', tb: 'ELWOOD', bg: 'PIPPA', loadingDate: '1-Okt-26', activityDate: '30-Sep-26', startTime: '03:35', endTime: '05:55', activityName: 'Loading to Barge', category: 'Loading', durationHours: 2.33, durationFormatted: '2:20' },
        { rowNumber: 7, voyageNo: '987', tb: 'ELWOOD', bg: 'PIPPA', loadingDate: '1-Okt-26', activityDate: '30-Sep-26', startTime: '05:55', endTime: '06:10', activityName: 'Final Draft Survey', category: 'Surveyor', durationHours: 0.25, durationFormatted: '0:15' },
        { rowNumber: 8, voyageNo: '987', tb: 'ELWOOD', bg: 'PIPPA', loadingDate: '1-Okt-26', activityDate: '30-Sep-26', startTime: '06:10', endTime: '06:10', activityName: 'Waiting Tugboat Assist', category: 'Waiting', durationHours: 0.0, durationFormatted: '0:00' },
        { rowNumber: 9, voyageNo: '987', tb: 'ELWOOD', bg: 'PIPPA', loadingDate: '1-Okt-26', activityDate: '30-Sep-26', startTime: '06:10', endTime: '06:10', activityName: 'Cast off', category: 'Standby', durationHours: 0.0, durationFormatted: '0:00' }
      ]
    },
    // --- OKTOBER 2026 (PERSIS SPREADSHEET ROW 11389 - 11424) ---
    {
      voyageNo: '988',
      tb: 'KARYA PACIFIC 2270',
      bg: 'PACIFIC STAR 8722',
      dd: '1-Okt-26',
      actualDate: '1-Okt-26',
      castInTime: '08:15',
      castOffTime: '17:10',
      castInIso: '2026-10-01 08:15:00',
      castOffIso: '2026-10-01 17:10:00',
      tonRit: 8400,
      loadingNetto: 6.92, // 3:25 + 3:30 = 6 jam 55 menit
      breakdown: 0.0,
      waiting: 0.0,
      shiftRest: 1.0,
      logs: [
        { rowNumber: 1, voyageNo: '988', tb: 'KARYA PACIFIC 2270', bg: 'PACIFIC STAR 8722', loadingDate: '1-Okt-26', activityDate: '1-Okt-26', startTime: '08:15', endTime: '08:25', activityName: 'Cast-in (Barge Sandar)', category: 'Standby', durationHours: 0.17, durationFormatted: '0:10' },
        { rowNumber: 2, voyageNo: '988', tb: 'KARYA PACIFIC 2270', bg: 'PACIFIC STAR 8722', loadingDate: '1-Okt-26', activityDate: '1-Okt-26', startTime: '08:25', endTime: '08:35', activityName: 'Initial draft survey', category: 'Surveyor', durationHours: 0.17, durationFormatted: '0:10' },
        { rowNumber: 3, voyageNo: '988', tb: 'KARYA PACIFIC 2270', bg: 'PACIFIC STAR 8722', loadingDate: '1-Okt-26', activityDate: '1-Okt-26', startTime: '08:35', endTime: '12:00', activityName: 'Loading to Barge', category: 'Loading', durationHours: 3.42, durationFormatted: '3:25' },
        { rowNumber: 4, voyageNo: '988', tb: 'KARYA PACIFIC 2270', bg: 'PACIFIC STAR 8722', loadingDate: '1-Okt-26', activityDate: '1-Okt-26', startTime: '12:00', endTime: '13:00', activityName: 'Rest Time (ISTIRAHAT)', category: 'Shift / Rest', durationHours: 1.0, durationFormatted: '1:00' },
        { rowNumber: 5, voyageNo: '988', tb: 'KARYA PACIFIC 2270', bg: 'PACIFIC STAR 8722', loadingDate: '1-Okt-26', activityDate: '1-Okt-26', startTime: '13:00', endTime: '16:30', activityName: 'Loading to Barge', category: 'Loading', durationHours: 3.5, durationFormatted: '3:30' },
        { rowNumber: 6, voyageNo: '988', tb: 'KARYA PACIFIC 2270', bg: 'PACIFIC STAR 8722', loadingDate: '1-Okt-26', activityDate: '1-Okt-26', startTime: '16:30', endTime: '16:45', activityName: 'Final Draft Survey', category: 'Surveyor', durationHours: 0.25, durationFormatted: '0:15' },
        { rowNumber: 7, voyageNo: '988', tb: 'KARYA PACIFIC 2270', bg: 'PACIFIC STAR 8722', loadingDate: '1-Okt-26', activityDate: '1-Okt-26', startTime: '16:45', endTime: '16:45', activityName: 'Waiting Tugboat Assist', category: 'Waiting', durationHours: 0.0, durationFormatted: '0:00' },
        { rowNumber: 8, voyageNo: '988', tb: 'KARYA PACIFIC 2270', bg: 'PACIFIC STAR 8722', loadingDate: '1-Okt-26', activityDate: '1-Okt-26', startTime: '16:45', endTime: '17:10', activityName: 'Cast off (CAST Off)', category: 'Standby', durationHours: 0.42, durationFormatted: '0:25' }
      ]
    },
    {
      voyageNo: '989',
      tb: 'MBP 2206',
      bg: 'MBP 9006',
      dd: '2-Okt-26',
      actualDate: '2-Okt-26',
      castInTime: '15:50',
      castOffTime: '22:40',
      castInIso: '2026-10-02 15:50:00',
      castOffIso: '2026-10-02 22:40:00',
      tonRit: 7950,
      loadingNetto: 5.67, // 2:00 + 3:40 = 5 jam 40 menit
      breakdown: 0.0,
      waiting: 0.0,
      shiftRest: 0.5,
      logs: [
        { rowNumber: 1, voyageNo: '989', tb: 'MBP 2206', bg: 'MBP 9006', loadingDate: '2-Okt-26', activityDate: '2-Okt-26', startTime: '15:50', endTime: '16:00', activityName: 'Cast-in (Barge Sandar)', category: 'Standby', durationHours: 0.17, durationFormatted: '0:10' },
        { rowNumber: 2, voyageNo: '989', tb: 'MBP 2206', bg: 'MBP 9006', loadingDate: '2-Okt-26', activityDate: '2-Okt-26', startTime: '16:00', endTime: '16:10', activityName: 'Initial draft survey', category: 'Surveyor', durationHours: 0.17, durationFormatted: '0:10' },
        { rowNumber: 3, voyageNo: '989', tb: 'MBP 2206', bg: 'MBP 9006', loadingDate: '2-Okt-26', activityDate: '2-Okt-26', startTime: '16:10', endTime: '18:10', activityName: 'Loading to Barge', category: 'Loading', durationHours: 2.0, durationFormatted: '2:00' },
        { rowNumber: 4, voyageNo: '989', tb: 'MBP 2206', bg: 'MBP 9006', loadingDate: '2-Okt-26', activityDate: '2-Okt-26', startTime: '18:10', endTime: '18:30', activityName: 'OVER Shift', category: 'Shift / Rest', durationHours: 0.33, durationFormatted: '0:20' },
        { rowNumber: 5, voyageNo: '989', tb: 'MBP 2206', bg: 'MBP 9006', loadingDate: '2-Okt-26', activityDate: '2-Okt-26', startTime: '18:30', endTime: '18:40', activityName: 'P5M, P2H dan Safety Talk', category: 'Shift / Rest', durationHours: 0.17, durationFormatted: '0:10' },
        { rowNumber: 6, voyageNo: '989', tb: 'MBP 2206', bg: 'MBP 9006', loadingDate: '2-Okt-26', activityDate: '2-Okt-26', startTime: '18:40', endTime: '22:20', activityName: 'Loading to Barge', category: 'Loading', durationHours: 3.67, durationFormatted: '3:40' },
        { rowNumber: 7, voyageNo: '989', tb: 'MBP 2206', bg: 'MBP 9006', loadingDate: '2-Okt-26', activityDate: '2-Okt-26', startTime: '22:20', endTime: '22:35', activityName: 'Final Draft Survey', category: 'Surveyor', durationHours: 0.25, durationFormatted: '0:15' },
        { rowNumber: 8, voyageNo: '989', tb: 'MBP 2206', bg: 'MBP 9006', loadingDate: '2-Okt-26', activityDate: '2-Okt-26', startTime: '22:35', endTime: '22:40', activityName: 'Cast off (CAST Off)', category: 'Standby', durationHours: 0.08, durationFormatted: '0:05' }
      ]
    },
    {
      voyageNo: '990',
      tb: 'MBP 2211',
      bg: 'MBP 9003',
      dd: '3-Okt-26',
      actualDate: '3-Okt-26',
      castInTime: '00:30',
      castOffTime: '09:15',
      castInIso: '2026-10-03 00:30:00',
      castOffIso: '2026-10-03 09:15:00',
      tonRit: 8850,
      loadingNetto: 7.17, // 5:10 + 2:00 = 7 jam 10 menit
      breakdown: 0.0,
      waiting: 0.0,
      shiftRest: 0.42,
      logs: [
        { rowNumber: 1, voyageNo: '990', tb: 'MBP 2211', bg: 'MBP 9003', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '00:30', endTime: '00:50', activityName: 'Cast-in (Barge Sandar)', category: 'Standby', durationHours: 0.33, durationFormatted: '0:20' },
        { rowNumber: 2, voyageNo: '990', tb: 'MBP 2211', bg: 'MBP 9003', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '00:50', endTime: '01:00', activityName: 'Initial draft survey', category: 'Surveyor', durationHours: 0.17, durationFormatted: '0:10' },
        { rowNumber: 3, voyageNo: '990', tb: 'MBP 2211', bg: 'MBP 9003', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '01:00', endTime: '06:10', activityName: 'Loading to Barge', category: 'Loading', durationHours: 5.17, durationFormatted: '5:10' },
        { rowNumber: 4, voyageNo: '990', tb: 'MBP 2211', bg: 'MBP 9003', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '06:10', endTime: '06:30', activityName: 'OVER Shift', category: 'Shift / Rest', durationHours: 0.33, durationFormatted: '0:20' },
        { rowNumber: 5, voyageNo: '990', tb: 'MBP 2211', bg: 'MBP 9003', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '06:30', endTime: '06:35', activityName: 'P5M, P2H dan Safety Talk', category: 'Shift / Rest', durationHours: 0.08, durationFormatted: '0:05' },
        { rowNumber: 6, voyageNo: '990', tb: 'MBP 2211', bg: 'MBP 9003', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '06:35', endTime: '08:35', activityName: 'Loading to Barge', category: 'Loading', durationHours: 2.0, durationFormatted: '2:00' },
        { rowNumber: 7, voyageNo: '990', tb: 'MBP 2211', bg: 'MBP 9003', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '08:35', endTime: '08:50', activityName: 'Final Draft Survey', category: 'Surveyor', durationHours: 0.25, durationFormatted: '0:15' },
        { rowNumber: 8, voyageNo: '990', tb: 'MBP 2211', bg: 'MBP 9003', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '08:50', endTime: '08:50', activityName: 'Waiting Tugboat Assist', category: 'Waiting', durationHours: 0.0, durationFormatted: '0:00' },
        { rowNumber: 9, voyageNo: '990', tb: 'MBP 2211', bg: 'MBP 9003', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '08:50', endTime: '09:15', activityName: 'Cast off (CAST Off)', category: 'Standby', durationHours: 0.42, durationFormatted: '0:25' }
      ]
    },
    {
      voyageNo: '991',
      tb: 'KARYA PACIFIC 2251',
      bg: 'PACIFIC STAR 8710',
      dd: '3-Okt-26',
      actualDate: '3-Okt-26',
      castInTime: '13:30',
      castOffTime: '20:35',
      castInIso: '2026-10-03 13:30:00',
      castOffIso: '2026-10-03 20:35:00',
      tonRit: 8100,
      loadingNetto: 5.92, // 1:35 + 2:40 + 1:40 = 5 jam 55 menit
      breakdown: 0.08, // External Problem 0:05
      waiting: 0.0,
      shiftRest: 0.42,
      logs: [
        { rowNumber: 1, voyageNo: '991', tb: 'KARYA PACIFIC 2251', bg: 'PACIFIC STAR 8710', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '13:30', endTime: '13:40', activityName: 'Cast-in (Barge Sandar)', category: 'Standby', durationHours: 0.17, durationFormatted: '0:10' },
        { rowNumber: 2, voyageNo: '991', tb: 'KARYA PACIFIC 2251', bg: 'PACIFIC STAR 8710', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '13:40', endTime: '13:50', activityName: 'Initial draft survey', category: 'Surveyor', durationHours: 0.17, durationFormatted: '0:10' },
        { rowNumber: 3, voyageNo: '991', tb: 'KARYA PACIFIC 2251', bg: 'PACIFIC STAR 8710', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '13:50', endTime: '15:25', activityName: 'Loading to Barge', category: 'Loading', durationHours: 1.58, durationFormatted: '1:35' },
        { rowNumber: 4, voyageNo: '991', tb: 'KARYA PACIFIC 2251', bg: 'PACIFIC STAR 8710', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '15:25', endTime: '15:30', activityName: 'External Problem', category: 'Breakdown', durationHours: 0.08, durationFormatted: '0:05' },
        { rowNumber: 5, voyageNo: '991', tb: 'KARYA PACIFIC 2251', bg: 'PACIFIC STAR 8710', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '15:30', endTime: '18:10', activityName: 'Loading to Barge', category: 'Loading', durationHours: 2.67, durationFormatted: '2:40' },
        { rowNumber: 6, voyageNo: '991', tb: 'KARYA PACIFIC 2251', bg: 'PACIFIC STAR 8710', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '18:10', endTime: '18:20', activityName: 'OVER Shift', category: 'Shift / Rest', durationHours: 0.17, durationFormatted: '0:10' },
        { rowNumber: 7, voyageNo: '991', tb: 'KARYA PACIFIC 2251', bg: 'PACIFIC STAR 8710', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '18:20', endTime: '18:35', activityName: 'P5M, P2H dan Safety Talk', category: 'Shift / Rest', durationHours: 0.25, durationFormatted: '0:15' },
        { rowNumber: 8, voyageNo: '991', tb: 'KARYA PACIFIC 2251', bg: 'PACIFIC STAR 8710', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '18:35', endTime: '18:40', activityName: 'Prepare Loading', category: 'Standby', durationHours: 0.08, durationFormatted: '0:05' },
        { rowNumber: 9, voyageNo: '991', tb: 'KARYA PACIFIC 2251', bg: 'PACIFIC STAR 8710', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '18:40', endTime: '20:20', activityName: 'Loading to Barge', category: 'Loading', durationHours: 1.67, durationFormatted: '1:40' },
        { rowNumber: 10, voyageNo: '991', tb: 'KARYA PACIFIC 2251', bg: 'PACIFIC STAR 8710', loadingDate: '3-Okt-26', activityDate: '3-Okt-26', startTime: '20:20', endTime: '20:35', activityName: 'Final Draft Survey', category: 'Surveyor', durationHours: 0.25, durationFormatted: '0:15' }
      ]
    },
    // --- KELANJUTAN SIKLUS OKTOBER 2026 ---
    {
      voyageNo: '992',
      tb: 'MBP 2212',
      bg: 'MBP 9008',
      dd: '5-Okt-26',
      actualDate: '5-Okt-26',
      castInTime: '09:00',
      castOffTime: '16:00',
      castInIso: '2026-10-05 09:00:00',
      castOffIso: '2026-10-05 16:00:00',
      tonRit: 8350,
      loadingNetto: 6.1,
      breakdown: 0.0,
      waiting: 0.25,
      shiftRest: 0.4,
      logs: [
        { rowNumber: 1, voyageNo: '992', tb: 'MBP 2212', bg: 'MBP 9008', loadingDate: '5-Okt-26', activityDate: '5-Okt-26', startTime: '09:00', endTime: '09:15', activityName: 'Cast-in', category: 'Standby', durationHours: 0.25, durationFormatted: '0:15' },
        { rowNumber: 2, voyageNo: '992', tb: 'MBP 2212', bg: 'MBP 9008', loadingDate: '5-Okt-26', activityDate: '5-Okt-26', startTime: '09:15', endTime: '15:20', activityName: 'Loading to Barge', category: 'Loading', durationHours: 6.1, durationFormatted: '6:05' },
        { rowNumber: 3, voyageNo: '992', tb: 'MBP 2212', bg: 'MBP 9008', loadingDate: '5-Okt-26', activityDate: '5-Okt-26', startTime: '15:20', endTime: '16:00', activityName: 'Cast off', category: 'Standby', durationHours: 0.67, durationFormatted: '0:40' }
      ]
    },
    {
      voyageNo: '993',
      tb: 'LEO POWER 2222',
      bg: 'ELO MARINE 9002',
      dd: '8-Okt-26',
      actualDate: '8-Okt-26',
      castInTime: '07:30',
      castOffTime: '14:45',
      castInIso: '2026-10-08 07:30:00',
      castOffIso: '2026-10-08 14:45:00',
      tonRit: 8600,
      loadingNetto: 6.3,
      breakdown: 0.0,
      waiting: 0.2,
      shiftRest: 0.35,
      logs: [
        { rowNumber: 1, voyageNo: '993', tb: 'LEO POWER 2222', bg: 'ELO MARINE 9002', loadingDate: '8-Okt-26', activityDate: '8-Okt-26', startTime: '07:30', endTime: '07:45', activityName: 'Cast-in', category: 'Standby', durationHours: 0.25, durationFormatted: '0:15' },
        { rowNumber: 2, voyageNo: '993', tb: 'LEO POWER 2222', bg: 'ELO MARINE 9002', loadingDate: '8-Okt-26', activityDate: '8-Okt-26', startTime: '07:45', endTime: '14:05', activityName: 'Loading to Barge', category: 'Loading', durationHours: 6.3, durationFormatted: '6:20' },
        { rowNumber: 3, voyageNo: '993', tb: 'LEO POWER 2222', bg: 'ELO MARINE 9002', loadingDate: '8-Okt-26', activityDate: '8-Okt-26', startTime: '14:05', endTime: '14:45', activityName: 'Cast off', category: 'Standby', durationHours: 0.67, durationFormatted: '0:40' }
      ]
    },
    {
      voyageNo: '994',
      tb: 'ELWOOD',
      bg: 'PIPPA',
      dd: '12-Okt-26',
      actualDate: '12-Okt-26',
      castInTime: '10:00',
      castOffTime: '17:15',
      castInIso: '2026-10-12 10:00:00',
      castOffIso: '2026-10-12 17:15:00',
      tonRit: 8250,
      loadingNetto: 5.8,
      breakdown: 0.5,
      waiting: 0.3,
      shiftRest: 0.35,
      logs: [
        { rowNumber: 1, voyageNo: '994', tb: 'ELWOOD', bg: 'PIPPA', loadingDate: '12-Okt-26', activityDate: '12-Okt-26', startTime: '10:00', endTime: '10:15', activityName: 'Cast-in', category: 'Standby', durationHours: 0.25, durationFormatted: '0:15' },
        { rowNumber: 2, voyageNo: '994', tb: 'ELWOOD', bg: 'PIPPA', loadingDate: '12-Okt-26', activityDate: '12-Okt-26', startTime: '10:15', endTime: '16:05', activityName: 'Loading to Barge', category: 'Loading', durationHours: 5.8, durationFormatted: '5:50' },
        { rowNumber: 3, voyageNo: '994', tb: 'ELWOOD', bg: 'PIPPA', loadingDate: '12-Okt-26', activityDate: '12-Okt-26', startTime: '16:05', endTime: '17:15', activityName: 'Cast off', category: 'Standby', durationHours: 1.17, durationFormatted: '1:10' }
      ]
    },
    {
      voyageNo: '995',
      tb: 'KARYA PACIFIC 2270',
      bg: 'PACIFIC STAR 8722',
      dd: '16-Okt-26',
      actualDate: '16-Okt-26',
      castInTime: '06:30',
      castOffTime: '14:20',
      castInIso: '2026-10-16 06:30:00',
      castOffIso: '2026-10-16 14:20:00',
      tonRit: 8450,
      loadingNetto: 6.8,
      breakdown: 0.0,
      waiting: 0.4,
      shiftRest: 0.5,
      logs: [
        { rowNumber: 1, voyageNo: '995', tb: 'KARYA PACIFIC 2270', bg: 'PACIFIC STAR 8722', loadingDate: '16-Okt-26', activityDate: '16-Okt-26', startTime: '06:30', endTime: '06:45', activityName: 'Cast-in', category: 'Standby', durationHours: 0.25, durationFormatted: '0:15' },
        { rowNumber: 2, voyageNo: '995', tb: 'KARYA PACIFIC 2270', bg: 'PACIFIC STAR 8722', loadingDate: '16-Okt-26', activityDate: '16-Okt-26', startTime: '06:45', endTime: '13:35', activityName: 'Loading to Barge', category: 'Loading', durationHours: 6.8, durationFormatted: '6:50' },
        { rowNumber: 3, voyageNo: '995', tb: 'KARYA PACIFIC 2270', bg: 'PACIFIC STAR 8722', loadingDate: '16-Okt-26', activityDate: '16-Okt-26', startTime: '13:35', endTime: '14:20', activityName: 'Cast off', category: 'Standby', durationHours: 0.75, durationFormatted: '0:45' }
      ]
    },
    {
      voyageNo: '996',
      tb: 'MBP 2206',
      bg: 'MBP 9006',
      dd: '20-Okt-26',
      actualDate: '20-Okt-26',
      castInTime: '11:00',
      castOffTime: '18:15',
      castInIso: '2026-10-20 11:00:00',
      castOffIso: '2026-10-20 18:15:00',
      tonRit: 8050,
      loadingNetto: 5.75,
      breakdown: 0.0,
      waiting: 0.3,
      shiftRest: 0.25,
      logs: [
        { rowNumber: 1, voyageNo: '996', tb: 'MBP 2206', bg: 'MBP 9006', loadingDate: '20-Okt-26', activityDate: '20-Okt-26', startTime: '11:00', endTime: '11:15', activityName: 'Cast-in', category: 'Standby', durationHours: 0.25, durationFormatted: '0:15' },
        { rowNumber: 2, voyageNo: '996', tb: 'MBP 2206', bg: 'MBP 9006', loadingDate: '20-Okt-26', activityDate: '20-Okt-26', startTime: '11:15', endTime: '17:00', activityName: 'Loading to Barge', category: 'Loading', durationHours: 5.75, durationFormatted: '5:45' },
        { rowNumber: 3, voyageNo: '996', tb: 'MBP 2206', bg: 'MBP 9006', loadingDate: '20-Okt-26', activityDate: '20-Okt-26', startTime: '17:00', endTime: '18:15', activityName: 'Cast off', category: 'Standby', durationHours: 1.25, durationFormatted: '1:15' }
      ]
    },
    {
      voyageNo: '997',
      tb: 'MBP 2211',
      bg: 'MBP 9003',
      dd: '24-Okt-26',
      actualDate: '24-Okt-26',
      castInTime: '14:00',
      castOffTime: '22:10',
      castInIso: '2026-10-24 14:00:00',
      castOffIso: '2026-10-24 22:10:00',
      tonRit: 8700,
      loadingNetto: 6.9,
      breakdown: 0.0,
      waiting: 0.4,
      shiftRest: 0.3,
      logs: [
        { rowNumber: 1, voyageNo: '997', tb: 'MBP 2211', bg: 'MBP 9003', loadingDate: '24-Okt-26', activityDate: '24-Okt-26', startTime: '14:00', endTime: '14:15', activityName: 'Cast-in', category: 'Standby', durationHours: 0.25, durationFormatted: '0:15' },
        { rowNumber: 2, voyageNo: '997', tb: 'MBP 2211', bg: 'MBP 9003', loadingDate: '24-Okt-26', activityDate: '24-Okt-26', startTime: '14:15', endTime: '21:10', activityName: 'Loading to Barge', category: 'Loading', durationHours: 6.9, durationFormatted: '6:55' },
        { rowNumber: 3, voyageNo: '997', tb: 'MBP 2211', bg: 'MBP 9003', loadingDate: '24-Okt-26', activityDate: '24-Okt-26', startTime: '21:10', endTime: '22:10', activityName: 'Cast off', category: 'Standby', durationHours: 1.0, durationFormatted: '1:00' }
      ]
    },
    {
      voyageNo: '998',
      tb: 'KARYA PACIFIC 2251',
      bg: 'PACIFIC STAR 8710',
      dd: '28-Okt-26',
      actualDate: '28-Okt-26',
      castInTime: '08:00',
      castOffTime: '15:20',
      castInIso: '2026-10-28 08:00:00',
      castOffIso: '2026-10-28 15:20:00',
      tonRit: 8200,
      loadingNetto: 6.0,
      breakdown: 0.0,
      waiting: 0.3,
      shiftRest: 0.4,
      logs: [
        { rowNumber: 1, voyageNo: '998', tb: 'KARYA PACIFIC 2251', bg: 'PACIFIC STAR 8710', loadingDate: '28-Okt-26', activityDate: '28-Okt-26', startTime: '08:00', endTime: '08:15', activityName: 'Cast-in', category: 'Standby', durationHours: 0.25, durationFormatted: '0:15' },
        { rowNumber: 2, voyageNo: '998', tb: 'KARYA PACIFIC 2251', bg: 'PACIFIC STAR 8710', loadingDate: '28-Okt-26', activityDate: '28-Okt-26', startTime: '08:15', endTime: '14:15', activityName: 'Loading to Barge', category: 'Loading', durationHours: 6.0, durationFormatted: '6:00' },
        { rowNumber: 3, voyageNo: '998', tb: 'KARYA PACIFIC 2251', bg: 'PACIFIC STAR 8710', loadingDate: '28-Okt-26', activityDate: '28-Okt-26', startTime: '14:15', endTime: '15:20', activityName: 'Cast off', category: 'Standby', durationHours: 1.08, durationFormatted: '1:05' }
      ]
    }
  ];

  // Masukkan data acuan eksplisit ke dataset
  explicitOctoberVoyages.forEach((v) => {
    baseData.push({
      voyageNo: v.voyageNo,
      TB: v.tb,
      BG: v.bg,
      DD: v.dd,
      'Ton/Rit': v.tonRit
    });

    base2Data.push({
      voyageNo: v.voyageNo,
      TB: v.tb,
      BG: v.bg,
      DD: v.dd,
      actualDate: v.actualDate,
      startTime: v.castInTime,
      endTime: v.castOffTime,
      'Cast-in': v.castInIso,
      Loading: v.loadingNetto,
      'Cast off': v.castOffIso,
      Breakdown: v.breakdown,
      'Heavy Rain': 0.0,
      Waiting: v.waiting,
      shiftRest: v.shiftRest,
      surveyorTime: 0.35,
      activityDetails: v.logs
    });
  });

  // 2. GENERATE BULAN LAIN (JANUARI s/d AGUSTUS & NOVEMBER-DESEMBER 2026) SECARA KONSISTEN
  const REAL_FLEET_PAIRS = [
    { tb: 'ELWOOD', bg: 'PIPPA' },
    { tb: 'KARYA PACIFIC 2270', bg: 'PACIFIC STAR 8722' },
    { tb: 'MBP 2206', bg: 'MBP 9006' },
    { tb: 'MBP 2211', bg: 'MBP 9003' },
    { tb: 'KARYA PACIFIC 2251', bg: 'PACIFIC STAR 8710' },
    { tb: 'MBP 2212', bg: 'MBP 9008' },
    { tb: 'LEO POWER 2222', bg: 'ELO MARINE 9002' },
    { tb: 'TB. TRANS POWER 01', bg: 'BG. KALIMANTAN 01' }
  ];

  const monthShorts = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  for (let month = 1; month <= 12; month++) {
    // Lewati September dan Oktober karena sudah diisi data acuan eksplisit
    if (month === 9 || month === 10) continue;

    const tripsCount = 7 + (month % 3);
    const startVoyage = 900 + (month - 1) * 8;

    for (let t = 0; t < tripsCount; t++) {
      const vNo = String(startVoyage + t);
      const pair = REAL_FLEET_PAIRS[t % REAL_FLEET_PAIRS.length];
      const day = 2 + t * 3 + (month % 2);
      const ddStr = `${day}-${monthShorts[month - 1]}-26`;
      const padM = month < 10 ? `0${month}` : `${month}`;
      const padD = day < 10 ? `0${day}` : `${day}`;
      const isoDate = `2026-${padM}-${padD}`;

      const tonRit = 8000 + (t % 5) * 200 + ((month * 7) % 300);
      const loading = parseFloat((tonRit / 1350 * (0.92 + (t % 3) * 0.08)).toFixed(1));
      const castInIso = `${isoDate} 08:00:00`;
      const castOffHour = Math.min(23, Math.floor(8 + loading + 1));
      const castOffIso = `${isoDate} ${String(castOffHour).padStart(2, '0')}:30:00`;

      baseData.push({
        voyageNo: vNo,
        TB: pair.tb,
        BG: pair.bg,
        DD: ddStr,
        'Ton/Rit': tonRit
      });

      base2Data.push({
        voyageNo: vNo,
        TB: pair.tb,
        BG: pair.bg,
        DD: ddStr,
        actualDate: ddStr,
        startTime: '08:00',
        endTime: `${String(castOffHour).padStart(2, '0')}:30`,
        'Cast-in': castInIso,
        Loading: loading,
        'Cast off': castOffIso,
        Breakdown: t % 4 === 1 ? 0.8 : 0.0,
        'Heavy Rain': [1, 2, 11, 12].includes(month) && t % 3 === 0 ? 1.0 : 0.0,
        Waiting: 0.3,
        shiftRest: 0.3,
        surveyorTime: 0.3,
        activityDetails: [
          { rowNumber: 1, voyageNo: vNo, tb: pair.tb, bg: pair.bg, loadingDate: ddStr, activityDate: ddStr, startTime: '08:00', endTime: '08:15', activityName: 'Cast-in', category: 'Standby', durationHours: 0.25, durationFormatted: '0:15' },
          { rowNumber: 2, voyageNo: vNo, tb: pair.tb, bg: pair.bg, loadingDate: ddStr, activityDate: ddStr, startTime: '08:15', endTime: `${String(castOffHour - 1).padStart(2, '0')}:30`, activityName: 'Loading to Barge', category: 'Loading', durationHours: loading, durationFormatted: `${Math.floor(loading)}:00` },
          { rowNumber: 3, voyageNo: vNo, tb: pair.tb, bg: pair.bg, loadingDate: ddStr, activityDate: ddStr, startTime: `${String(castOffHour - 1).padStart(2, '0')}:30`, endTime: `${String(castOffHour).padStart(2, '0')}:30`, activityName: 'Cast off', category: 'Standby', durationHours: 1.0, durationFormatted: '1:00' }
        ]
      });
    }
  }

  return { base: baseData, base2: base2Data };
}

const operationalData = buildOperationalDataset();

export const INITIAL_BASE_DATA: BaseRecord[] = operationalData.base;
export const INITIAL_BASE2_DATA: Base2Record[] = operationalData.base2;
