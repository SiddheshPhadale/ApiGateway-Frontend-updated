import React, { useState } from 'react';

// Reusable SVG Sparkline for KPI Cards
export function Sparkline({ data = [30, 45, 38, 52, 60, 55, 70, 85], color = '#8b5cf6', height = 36, width = 110 }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sparkGrad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] - min) / range) * (height - 6) - 3}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
}

// Interactive Area & Line Chart with ML Forecast Support
export function AreaLineChart({
  data = [],
  xKey = 'hour',
  series = [
    { key: 'actual', label: 'Actual Requests', color: '#8b5cf6' },
    { key: 'predicted', label: 'ML Predicted Traffic (24h)', color: '#38bdf8', dashed: true }
  ],
  height = 260
}) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>No traffic data available</div>;
  }

  // Calculate scales
  let allVals = [];
  series.forEach(s => {
    data.forEach(d => {
      if (d[s.key] !== undefined) allVals.push(d[s.key]);
    });
  });
  const maxVal = Math.max(...allVals, 100);
  const minVal = 0;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;
  const chartWidth = 700; // viewBox coordinate space
  const chartHeight = height;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const getX = (index) => paddingLeft + (index / (data.length - 1)) * innerWidth;
  const getY = (val) => paddingTop + innerHeight - (val / maxVal) * innerHeight;

  return (
    <div style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          {series.map(s => (
            <linearGradient key={s.key} id={`areaGrad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
            </linearGradient>
          ))}
        </defs>

        {/* Horizontal Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = paddingTop + innerHeight * (1 - pct);
          const valLabel = Math.round(maxVal * pct);
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={chartWidth - paddingRight}
                y2={y}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeDasharray="4 4"
              />
              <text
                x={paddingLeft - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="var(--text-secondary)"
              >
                {valLabel >= 1000 ? `${(valLabel / 1000).toFixed(1)}k` : valLabel}
              </text>
            </g>
          );
        })}

        {/* Areas & Lines */}
        {series.map(s => {
          const pts = data.map((d, i) => ({ x: getX(i), y: getY(d[s.key] || 0) }));
          const linePath = pts.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');
          const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${paddingTop + innerHeight} L ${pts[0].x} ${paddingTop + innerHeight} Z`;

          return (
            <g key={s.key}>
              {!s.dashed && (
                <path d={areaPath} fill={`url(#areaGrad-${s.key})`} />
              )}
              <path
                d={linePath}
                fill="none"
                stroke={s.color}
                strokeWidth={s.dashed ? '2' : '2.8'}
                strokeDasharray={s.dashed ? '5 5' : 'none'}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Data points */}
              {pts.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={hoverIndex === i ? 5.5 : 3}
                  fill={hoverIndex === i ? '#ffffff' : s.color}
                  stroke={s.color}
                  strokeWidth="2"
                  style={{ transition: 'all 0.15s ease' }}
                />
              ))}
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          // show subset of labels if too many
          if (data.length > 12 && i % 2 !== 0 && i !== data.length - 1) return null;
          const x = getX(i);
          return (
            <text
              key={i}
              x={x}
              y={chartHeight - 8}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-secondary)"
            >
              {d[xKey]}
            </text>
          );
        })}

        {/* Interactive Hover Guides & Overlay */}
        {data.map((d, i) => {
          const x = getX(i);
          const colWidth = innerWidth / data.length;
          return (
            <rect
              key={i}
              x={x - colWidth / 2}
              y={paddingTop}
              width={colWidth}
              height={innerHeight}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoverIndex(i)}
            />
          );
        })}

        {hoverIndex !== null && (
          <line
            x1={getX(hoverIndex)}
            y1={paddingTop}
            x2={getX(hoverIndex)}
            y2={paddingTop + innerHeight}
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {/* Tooltip */}
      {hoverIndex !== null && data[hoverIndex] && (
        <div
          style={{
            position: 'absolute',
            left: `${(getX(hoverIndex) / chartWidth) * 100}%`,
            top: '10px',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            backdropFilter: 'blur(10px)',
            padding: '8px 12px',
            borderRadius: '8px',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            minWidth: '150px'
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px', fontWeight: '600' }}>
            Time: {data[hoverIndex][xKey]}
          </div>
          {series.map(s => (
            <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.85rem', color: s.color, marginBottom: '2px' }}>
              <span>{s.label}:</span>
              <span style={{ fontWeight: '700' }}>{(data[hoverIndex][s.key] || 0).toLocaleString()}</span>
            </div>
          ))}
          {data[hoverIndex].latency && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.75rem', color: '#10b981', marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '4px' }}>
              <span>Avg Latency:</span>
              <span style={{ fontWeight: '600' }}>{data[hoverIndex].latency}ms</span>
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        {series.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span style={{ width: '14px', height: '3px', background: s.color, borderRadius: '2px', display: 'inline-block', borderStyle: s.dashed ? 'dashed' : 'solid' }} />
            <span>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Horizontal Ranked Bar Chart
export function HorizontalBarChart({ items = [], maxVal = null, onSelect = null }) {
  const calculatedMax = maxVal || Math.max(...items.map(it => it.calls || it.value || 1), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {items.map((item, idx) => {
        const val = item.calls || item.value || 0;
        const pct = Math.min(100, (val / calculatedMax) * 100);
        const method = item.method || 'GET';
        const methodColor = method === 'GET' ? '#38bdf8' : method === 'POST' ? '#10b981' : method === 'DELETE' ? '#ef4444' : '#f59e0b';

        return (
          <div
            key={idx}
            onClick={() => onSelect && onSelect(item)}
            style={{
              padding: '0.6rem 0.8rem',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              transition: 'all 0.2s ease',
              cursor: onSelect ? 'pointer' : 'default',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: '700',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: `${methodColor}22`,
                  color: methodColor,
                  border: `1px solid ${methodColor}44`,
                  fontFamily: 'monospace'
                }}>
                  {method}
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: '500', color: 'var(--text-primary)' }}>
                  {item.endpoint || item.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{val.toLocaleString()} reqs</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>({item.share || pct.toFixed(1)}%)</span>
                {item.avgResponseTime && (
                  <span style={{ fontSize: '0.75rem', color: item.avgResponseTime > 200 ? '#f59e0b' : '#10b981' }}>
                    {item.avgResponseTime}ms
                  </span>
                )}
              </div>
            </div>

            <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, #8b5cf6, ${methodColor})`,
                  borderRadius: '3px',
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Donut Chart with Center Summary and Legend
export function DonutChart({
  data = [],
  title = 'Breakdown',
  centerLabel = 'Total',
  centerValue = '100%',
  size = 180
}) {
  const [hoverSegment, setHoverSegment] = useState(null);

  const total = data.reduce((sum, item) => sum + (item.value || item.share || 0), 0) || 1;
  const radius = 65;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 180 180" style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          {/* Background Ring */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth={strokeWidth}
          />
          {data.map((slice, idx) => {
            const val = slice.value || slice.share || 0;
            const pct = (val / total);
            const strokeDasharray = `${pct * circumference} ${circumference}`;
            const strokeDashoffset = -(accumulatedPercent * circumference);
            accumulatedPercent += pct;

            const isHovered = hoverSegment === idx;

            return (
              <circle
                key={idx}
                cx="90"
                cy="90"
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  filter: isHovered ? `drop-shadow(0 0 8px ${slice.color})` : 'none'
                }}
                onMouseEnter={() => setHoverSegment(idx)}
                onMouseLeave={() => setHoverSegment(null)}
              />
            );
          })}
        </svg>

        {/* Center Text */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {hoverSegment !== null ? data[hoverSegment].label : centerLabel}
          </span>
          <span style={{ fontSize: '1.25rem', fontWeight: '700', color: hoverSegment !== null ? data[hoverSegment].color : 'var(--text-primary)' }}>
            {hoverSegment !== null ? `${data[hoverSegment].value || data[hoverSegment].share}%` : centerValue}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', minWidth: '160px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </div>
        {data.map((item, idx) => (
          <div
            key={idx}
            onMouseEnter={() => setHoverSegment(idx)}
            onMouseLeave={() => setHoverSegment(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.8rem',
              fontSize: '0.85rem',
              cursor: 'pointer',
              padding: '2px 4px',
              borderRadius: '4px',
              background: hoverSegment === idx ? 'rgba(255,255,255,0.05)' : 'transparent',
              transition: 'background 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
              <span style={{ color: 'var(--text-primary)' }}>{item.label}</span>
            </div>
            <span style={{ fontWeight: '600', color: item.color }}>
              {item.value || item.share}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Glowing Circular Rate Limit Progress Gauge for Consumers
export function RadialRateLimitGauge({
  used = 8420,
  total = 10000,
  size = 200,
  title = 'Daily Quota',
  subtitle = 'Requests'
}) {
  const pct = Math.min(100, Math.max(0, (used / total) * 100));
  const radius = 75;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  // Color gradient based on urgency
  const color = pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#10b981';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease',
              filter: `drop-shadow(0 0 10px ${color}88)`
            }}
          />
        </svg>

        {/* Center Content */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title}
          </span>
          <span style={{ fontSize: '1.85rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
            {pct.toFixed(1)}%
          </span>
          <span style={{ fontSize: '0.75rem', color: color, fontWeight: '600', marginTop: '2px' }}>
            {used.toLocaleString()} / {total.toLocaleString()} {subtitle}
          </span>
        </div>
      </div>
    </div>
  );
}
