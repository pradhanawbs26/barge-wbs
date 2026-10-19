import { BaseRecord, Base2Record } from '../types';

// Daftar nama armada tongkang batubara operasional PT WBS
const BARGE_FLEET = [
  'BG. KALIMANTAN 01', 'BG. PACIFIC STAR', 'BG. TRANS POWER 08', 'BG. MEGA JAYA 03',
  'BG. SAMUDRA 12', 'BG. BORNEO COAL 05', 'BG. BUMI NUSANTARA', 'BG. INDO COAL 21',
  'BG. SEJAHTERA 09', 'BG. MARITIM ABADI', 'BG. ANDALAS 07', 'BG. WIRA BARA 02',
  'BG. SUMATERA EMAS', 'BG. MITRA JAYA 88', 'BG. SELATAN EXPRESS', 'BG. CAHAYA BARA',
  'BG. BINA COAL 15', 'BG. ALAM MAKMUR', 'BG. BARITO GLORY', 'BG. KARTIKA PRIMA',
  'BG. OCEAN PERKASA', 'BG. NUSANTARA STAR', 'BG. BINTANG TIMUR 06', 'BG. PELITA BAHARI'
];

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

// Generator data logis 12 bulan (Januari 2026 - Desember 2026)
function generateYearlyMockData(): { base: BaseRecord[]; base2: Base2Record[] } {
  const baseData: BaseRecord[] = [];
  const base2Data: Base2Record[] = [];

  // Seeded pseudo-random generator agar konsisten
  let seed = 12345;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  // Loop setiap bulan 1 sampai 12 tahun 2026
  for (let month = 1; month <= 12; month++) {
    // 6 hingga 9 siklus per bulan
    const tripsCount = 7 + (month % 3);
    const daysInMonth = month === 2 ? 28 : [4, 6, 9, 11].includes(month) ? 30 : 31;
    const intervalDays = Math.floor(daysInMonth / (tripsCount + 1));

    for (let trip = 0; trip < tripsCount; trip++) {
      const day = Math.min(daysInMonth - 1, 2 + trip * intervalDays + ((trip + month) % 2));
      const bgIndex = (month * 5 + trip * 3) % BARGE_FLEET.length;
      const bg = BARGE_FLEET[bgIndex];

      const dateStr = `2026-${pad(month)}-${pad(day)}`;

      // Volume batubara (Ton/Rit) standar tongkang 300ft: 7.500 - 10.300 MT
      const tonVolumes = [7650, 7850, 8100, 8250, 8400, 8800, 9200, 9500, 10100, 10250];
      const tonRit = tonVolumes[(month + trip) % tonVolumes.length] + Math.floor(rnd() * 20) * 10;

      // Target BLC = 1350 MT/h
      // Loading normal berkisar 5.0 - 7.5 jam
      const targetTime = tonRit / 1350.0;
      // Rasio performa: sebagian sesuai target (0.85-0.98x), sebagian overtime (1.05-1.25x)
      const factor = (trip + month) % 3 === 0 ? 1.08 + rnd() * 0.18 : 0.86 + rnd() * 0.12;
      const loading = parseFloat((targetTime * factor).toFixed(1));

      // Delay factors
      const hasBreakdown = (trip + month) % 4 === 1;
      const breakdown = hasBreakdown ? parseFloat((0.8 + rnd() * 1.4).toFixed(1)) : 0.0;

      // Cuaca hujan lebat (Heavy Rain) lebih sering di bulan basah (Jan, Feb, Okt, Nov, Des)
      const isRainySeason = [1, 2, 10, 11, 12].includes(month);
      const hasRain = isRainySeason ? (trip % 3 === 0) : (trip % 5 === 0);
      const heavyRain = hasRain ? parseFloat((0.6 + rnd() * 1.8).toFixed(1)) : 0.0;

      // Waiting (tunggu cargo/tug)
      const waiting = parseFloat((0.3 + rnd() * 0.7).toFixed(1));

      // Waktu sandar
      const startHour = 6 + ((trip * 3) % 12);
      const startMinute = (trip * 15) % 60;
      const castInDate = new Date(Date.UTC(2026, month - 1, day, startHour, startMinute, 0));

      const totalBerthHours = loading + breakdown + heavyRain + waiting;
      const castOffDate = new Date(castInDate.getTime() + totalBerthHours * 3600 * 1000);

      const formatIso = (d: Date) =>
        `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;

      baseData.push({
        BG: bg,
        DD: dateStr,
        'Ton/Rit': tonRit
      });

      base2Data.push({
        BG: bg,
        DD: dateStr,
        'Cast-in': formatIso(castInDate),
        Loading: loading,
        'Cast off': formatIso(castOffDate),
        Breakdown: breakdown,
        'Heavy Rain': heavyRain,
        Waiting: waiting
      });
    }
  }

  return { base: baseData, base2: base2Data };
}

const generated = generateYearlyMockData();

export const INITIAL_BASE_DATA: BaseRecord[] = generated.base;
export const INITIAL_BASE2_DATA: Base2Record[] = generated.base2;
