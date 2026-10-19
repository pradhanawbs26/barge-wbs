import { BaseRecord, Base2Record, ProcessedBarge, DelayMetric } from '../types';

export const TARGET_BLC_RATE = 1350.0; // Ton / Jam

/**
 * Memproses dan memvalidasi dataset persis seperti logika Pandas dalam skrip Python:
 * a. Bersihkan spasi dan baris NaN
 * b. Standarisasi kolom kunci 'BG' menjadi uppercase
 * c. Left Join df_base2 dengan df_base berdasarkan ['BG', 'DD']
 * d. Ekstraksi Month_Year (contoh: "October 2026")
 * e. Hitung Idle Time berurutan berdasarkan 'Cast off' menggunakan shift(1)
 * f. Hitung performa BLC: Waktu Target, Aktual Produktivitas, dan Status
 */
export function preprocessBargeData(
  baseRecords: BaseRecord[],
  base2Records: Base2Record[]
): ProcessedBarge[] {
  // 1. Data Cleaning: Hapus baris dengan 'BG' atau 'DD' kosong
  const validBase = baseRecords.filter(
    (b) => b && b.BG && b.BG.trim() !== '' && b.DD && b.DD.trim() !== ''
  );
  const validBase2 = base2Records.filter(
    (b2) => b2 && b2.BG && b2.BG.trim() !== '' && b2.DD && b2.DD.trim() !== ''
  );

  // Buat lookup map dari base (Ton/Rit) dengan key: UPPERCASE_BG__DD
  const baseMap = new Map<string, number>();
  validBase.forEach((item) => {
    const key = `${item.BG.trim().toUpperCase()}__${item.DD.trim()}`;
    baseMap.set(key, Number(item['Ton/Rit']) || 0);
  });

  // 2. Left Join base2 dengan base
  const mergedRaw = validBase2.map((item, index) => {
    const cleanBg = item.BG.trim().toUpperCase();
    const cleanDd = item.DD.trim();
    const key = `${cleanBg}__${cleanDd}`;
    const tonRit = baseMap.get(key) ?? 8000; // fallback default tonase jika belum match

    const castInDate = new Date(item['Cast-in']);
    const castOffDate = new Date(item['Cast off']);

    // Hitung Month_Year (Januari 2026 s/d Desember 2026)
    const monthNamesId = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthYear = !isNaN(castInDate.getTime())
      ? `${monthNamesId[castInDate.getMonth()]} ${castInDate.getFullYear()}`
      : 'Oktober 2026';

    const loading = Number(item.Loading) || 0;
    const breakdown = Number(item.Breakdown) || 0;
    const heavyRain = Number(item['Heavy Rain']) || 0;
    const waiting = Number(item.Waiting) || 0;
    const totalDelay = breakdown + heavyRain + waiting;
    const berthDuration = !isNaN(castInDate.getTime()) && !isNaN(castOffDate.getTime())
      ? (castOffDate.getTime() - castInDate.getTime()) / (1000 * 3600)
      : loading + totalDelay;

    // Performa BLC:
    // Waktu Target = Ton/Rit / 1350
    const waktuTarget = tonRit / TARGET_BLC_RATE;
    // Aktual Produktivitas = Ton/Rit / Loading
    const aktualProduktivitas = loading > 0 ? tonRit / loading : 0;
    // Status = Jika Waktu Aktual (Loading) <= Waktu Target maka "Sesuai Target", jika lebih maka "Over Time"
    const status: 'Sesuai Target' | 'Over Time' =
      loading <= waktuTarget ? 'Sesuai Target' : 'Over Time';

    return {
      id: `barge-${index}-${cleanBg}`,
      BG: cleanBg,
      DD: cleanDd,
      TonRit: tonRit,
      CastIn: item['Cast-in'],
      CastInDate: castInDate,
      Loading: loading,
      CastOff: item['Cast off'],
      CastOffDate: castOffDate,
      Breakdown: breakdown,
      HeavyRain: heavyRain,
      Waiting: waiting,
      TotalDelay: totalDelay,
      BerthDuration: berthDuration,
      Month_Year: monthYear,
      WaktuTarget: waktuTarget,
      AktualProduktivitas: aktualProduktivitas,
      Status: status,
      IdleTime: 0 // dihitung setelah disortir
    };
  });

  // 3. Urutkan data berdasarkan 'Cast off' (seperti: df.sort_values(by='Cast off'))
  mergedRaw.sort((a, b) => a.CastOffDate.getTime() - b.CastOffDate.getTime());

  // 4. Hitung Idle Time menggunakan logika shift(1) pada kolom 'Cast off'
  // Idle Time = Cast-in tongkang ini - Cast off tongkang sebelumnya
  const processed: ProcessedBarge[] = mergedRaw.map((barge, idx, array) => {
    if (idx === 0) {
      return {
        ...barge,
        IdleTime: 0,
        PrevCastOff: undefined
      };
    }
    const prevBarge = array[idx - 1];
    const prevCastOff = prevBarge.CastOff;
    const diffHours =
      (barge.CastInDate.getTime() - prevBarge.CastOffDate.getTime()) / (1000 * 3600);
    // Jika jeda negatif (misal tumpang tindih jetty), jadikan 0
    const idleTime = Math.max(0, diffHours);

    return {
      ...barge,
      IdleTime: parseFloat(idleTime.toFixed(2)),
      PrevCastOff: prevCastOff
    };
  });

  return processed;
}

/**
 * Menghitung metrik Pareto Delay (Breakdown, Heavy Rain, Waiting)
 */
export function calculateDelayPareto(barges: ProcessedBarge[]): DelayMetric[] {
  const totalBreakdown = barges.reduce((acc, b) => acc + (b.Breakdown || 0), 0);
  const totalRain = barges.reduce((acc, b) => acc + (b.HeavyRain || 0), 0);
  const totalWaiting = barges.reduce((acc, b) => acc + (b.Waiting || 0), 0);

  const categories = [
    { kategori: 'Breakdown Alat / BLC', totalJam: totalBreakdown, color: '#ef4444' },
    { kategori: 'Heavy Rain (Cuaca)', totalJam: totalRain, color: '#3b82f6' },
    { kategori: 'Waiting (Tunggu Cargo/Tug)', totalJam: totalWaiting, color: '#f59e0b' }
  ];

  // Urutkan descending untuk Pareto
  categories.sort((a, b) => b.totalJam - a.totalJam);

  const totalAll = categories.reduce((sum, item) => sum + item.totalJam, 0);

  let cumulative = 0;
  return categories.map((cat) => {
    cumulative += cat.totalJam;
    const pct = totalAll > 0 ? (cumulative / totalAll) * 100 : 0;
    return {
      kategori: cat.kategori,
      totalJam: parseFloat(cat.totalJam.toFixed(2)),
      kumulatifJam: parseFloat(cumulative.toFixed(2)),
      kumulatifPersen: parseFloat(pct.toFixed(1)),
      color: cat.color
    };
  });
}
