import React from 'react';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';

interface GaugeChartProps {
  value: number;
  target?: number;
  max?: number;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  target = 1350,
  max = 2000
}) => {
  // Clamping value between 0 and max
  const clampedValue = Math.min(Math.max(value, 0), max);
  const percentage = clampedValue / max;
  
  // Angle: from -180 deg (left) to 0 deg (right) for semi-circle
  // In radians: PI to 2*PI, or semi-circle SVG path
  const radius = 120;
  const strokeWidth = 24;
  const cx = 160;
  const cy = 150;

  // Function to calculate point on circle
  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 180) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians)
    };
  };

  const describeArc = (x: number, y: number, r: number, startAngle: number, endAngle: number) => {
    const start = polarToCartesian(x, y, r, endAngle);
    const end = polarToCartesian(x, y, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  // Angles (0 to 180 degrees)
  // Zone 1: 0 - 1100 (0 deg to (1100/2000)*180 = 99 deg)
  const angle1100 = (1100 / max) * 180;
  // Zone 2: 1100 - 1350 (99 deg to (1350/2000)*180 = 121.5 deg)
  const angle1350 = (target / max) * 180;
  // Zone 3: 1350 - 2000 (121.5 deg to 180 deg)

  const valueAngle = Math.min(180, (clampedValue / max) * 180);

  // Target needle marker
  const targetPoint = polarToCartesian(cx, cy, radius + 14, angle1350);
  const targetInnerPoint = polarToCartesian(cx, cy, radius - 16, angle1350);

  const delta = value - target;
  const isPositive = delta >= 0;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
      <div className="relative w-full max-w-[320px] h-[190px] flex justify-center">
        <svg viewBox="0 0 320 200" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="needleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <filter id="gaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* Background Track Zones */}
          {/* Zone 1: Critical / Low (< 1,100 T/h) */}
          <path
            d={describeArc(cx, cy, radius, 0, angle1100)}
            fill="none"
            stroke="#fee2e2"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Zone 2: Warning (1,100 - 1,350 T/h) */}
          <path
            d={describeArc(cx, cy, radius, angle1100, angle1350)}
            fill="none"
            stroke="#fef3c7"
            strokeWidth={strokeWidth}
          />

          {/* Zone 3: On Target / Optimal (1,350 - 2,000 T/h) */}
          <path
            d={describeArc(cx, cy, radius, angle1350, 180)}
            fill="none"
            stroke="#d1fae5"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Active Value Arc */}
          {valueAngle > 0 && (
            <path
              d={describeArc(cx, cy, radius, 0, valueAngle)}
              fill="none"
              stroke={isPositive ? '#10b981' : '#f59e0b'}
              strokeWidth={strokeWidth - 6}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Target 1,350 Marker Line */}
          <line
            x1={targetInnerPoint.x}
            y1={targetInnerPoint.y}
            x2={targetPoint.x}
            y2={targetPoint.y}
            stroke="#dc2626"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Needle Center Pin */}
          <circle cx={cx} cy={cy} r="10" fill="#1e293b" />
          <circle cx={cx} cy={cy} r="4" fill="#ffffff" />

          {/* Needle Indicator */}
          {(() => {
            const needleTip = polarToCartesian(cx, cy, radius - 20, valueAngle);
            return (
              <line
                x1={cx}
                y1={cy}
                x2={needleTip.x}
                y2={needleTip.y}
                stroke="#1e293b"
                strokeWidth="3.5"
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            );
          })()}

          {/* Axis Labels */}
          <text x="35" y="172" fontSize="11" fill="#64748b" fontWeight="600" textAnchor="middle">
            0
          </text>
          <text x="110" y="70" fontSize="11" fill="#64748b" fontWeight="600" textAnchor="middle">
            1,100
          </text>
          <text x="215" y="55" fontSize="12" fill="#dc2626" fontWeight="700" textAnchor="middle">
            Target 1,350
          </text>
          <text x="285" y="172" fontSize="11" fill="#64748b" fontWeight="600" textAnchor="middle">
            2,000
          </text>
        </svg>
      </div>

      {/* Numerical Stats & Delta badge */}
      <div className="mt-[-10px] text-center">
        <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {value.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}{' '}
          <span className="text-sm font-semibold text-slate-500">Ton/Jam</span>
        </div>

        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border">
          {isPositive ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border-emerald-200">
              <TrendingUp className="w-3.5 h-3.5" />
              +{delta.toFixed(1)} Ton/Jam di atas target
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border-rose-200">
              <TrendingDown className="w-3.5 h-3.5" />
              {delta.toFixed(1)} Ton/Jam di bawah target
            </span>
          )}
        </div>

        <div className="mt-2 text-xs text-slate-400 flex items-center justify-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          Standar Target BLC: 1.350 MT/Jam
        </div>
      </div>
    </div>
  );
};
