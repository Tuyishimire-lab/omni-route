'use client';

import React from 'react';

interface SparklineProps {
  data: { date: string; score: number }[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
}

export default function Sparkline({
  data,
  width = 120,
  height = 32,
  color = '#05AD98',
  showDots = false,
}: SparklineProps) {
  if (!data || data.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-[10px] text-[#878787] font-mono"
        style={{ width, height }}
      >
        -
      </div>
    );
  }

  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const scores = data.map((d) => d.score);
  const minVal = Math.min(...scores);
  const maxVal = Math.max(...scores);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * innerW;
    const y = padding + innerH - ((d.score - minVal) / range) * innerH;
    return { x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Solid fill area
  const areaPath = [
    `M ${points[0].x},${height - padding}`,
    `L ${points[0].x},${points[0].y}`,
    ...points.slice(1).map((p) => `L ${p.x},${p.y}`),
    `L ${points[points.length - 1].x},${height - padding}`,
    'Z',
  ].join(' ');

  // Determine trend color
  const trend = scores[scores.length - 1] - scores[0];
  const lineColor = trend >= 0 ? color : '#ef4444';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="inline-block"
      style={{ overflow: 'visible' }}
    >
      {/* Flat solid fill area */}
      <path d={areaPath} fill={lineColor} fillOpacity="0.08" />

      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End dot */}
      {showDots && points.length > 0 && (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r="2.5"
          fill={lineColor}
          stroke="#0A0E0E"
          strokeWidth="1"
        />
      )}
    </svg>
  );
}
