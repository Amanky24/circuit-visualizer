import React, { useState, useRef, useMemo } from 'react';
import { Play, Eye, EyeOff, Download, Activity } from 'lucide-react';

export default function WaveformViewer({
  simulationResult,
  isSimulating,
  onStartSimulation,
  circuitParams,
  onHoverAngle,
}) {
  const [viewMode, setViewMode] = useState('dual'); // 'dual' (Voltage & Current stacked) | 'stacked' (4 channels)
  const [activeChannels, setActiveChannels] = useState({
    vs: true,
    is: true,
    vo: true,
    io: true,
  });
  const [hoverIndex, setHoverIndex] = useState(null);
  const containerRef = useRef(null);

  const toggleChannel = (ch) => {
    setActiveChannels((prev) => ({ ...prev, [ch]: !prev[ch] }));
  };

  const channels = [
    { key: 'vs', label: 'AC side Voltage (vs)', shortLabel: 'Vs', unit: 'V', color: '#22c55e', isBipolar: true },
    { key: 'is', label: 'AC side Current (is)', shortLabel: 'Is', unit: 'A', color: '#2563eb', isBipolar: true },
    { key: 'vo', label: 'DC-side Voltage (vo)', shortLabel: 'Vo', unit: 'V', color: '#22c55e', isBipolar: false, allowsNegative: true },
    { key: 'io', label: 'DC-side Current (io)', shortLabel: 'Io', unit: 'A', color: '#2563eb', isBipolar: false },
  ];

  const handleMouseMove = (e) => {
    if (!simulationResult || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clientX / rect.width));
    const totalPoints = simulationResult.times.length;
    const idx = Math.min(totalPoints - 1, Math.floor(ratio * totalPoints));
    setHoverIndex(idx);
    if (onHoverAngle && simulationResult.angles && simulationResult.angles[idx] !== undefined) {
      onHoverAngle(simulationResult.angles[idx]);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const handleExportCSV = () => {
    if (!simulationResult) return;
    const { times, angles, vs, is, vo, io, isThreePhase, va, vb, vc, ia, ib, ic } = simulationResult;
    let csv = '';
    if (isThreePhase && va && vb && vc) {
      csv = 'Time (s),Angle (deg),Va (V),Vb (V),Vc (V),Vo (V),Ia (A),Ib (A),Ic (A),Io (A)\n';
      for (let i = 0; i < times.length; i += 2) {
        csv += `${times[i].toFixed(6)},${angles[i].toFixed(2)},${va[i]?.toFixed(3) ?? vs[i].toFixed(3)},${vb[i]?.toFixed(3) ?? '0'},${vc[i]?.toFixed(3) ?? '0'},${vo[i].toFixed(3)},${ia[i]?.toFixed(3) ?? is[i].toFixed(3)},${ib[i]?.toFixed(3) ?? '0'},${ic[i]?.toFixed(3) ?? '0'},${io[i].toFixed(3)}\n`;
      }
    } else {
      csv = 'Time (s),Angle (deg),Vs (V),Is (A),Vo (V),Io (A)\n';
      for (let i = 0; i < times.length; i += 2) {
        csv += `${times[i].toFixed(6)},${angles[i].toFixed(2)},${vs[i].toFixed(3)},${is[i].toFixed(3)},${vo[i].toFixed(3)},${io[i].toFixed(3)}\n`;
      }
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `circuit_waveforms_${circuitParams?.circuitType || 'rectifier'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="waveform-viewer-panel" aria-label="Oscilloscope & Waveforms">
      {/* Waveform Panel Header */}
      <div className="wave-header">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          <h2 className="wave-title">Oscilloscope & Waveforms</h2>
        </div>

        {isSimulating && (
          <div className="flex items-center gap-2">
            <div className="toggle-group-mode">
              <button
                type="button"
                className={`mode-btn ${viewMode === 'dual' ? 'active' : ''}`}
                onClick={() => setViewMode('dual')}
                title="Stacked Dual-Plot (Voltage & Current Scopes)"
              >
                Dual Scope (V & I)
              </button>
              <button
                type="button"
                className={`mode-btn ${viewMode === 'stacked' ? 'active' : ''}`}
                onClick={() => setViewMode('stacked')}
                title="4 Synchronized Channels"
              >
                4 Channels
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="btn-wave-export"
              title="Download Waveform CSV Data"
              type="button"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        )}
      </div>


      {/* Main Waveform Display Area */}
      <div
        className="wave-screen-container"
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {!isSimulating ? (
          /* Standby CRT Oscilloscope Screen */
          <div className="oscilloscope-standby">
            <div className="standby-crt-grid" />
            <div className="standby-content-box">
              <div className="standby-icon-wrapper">
                <Activity className="w-9 h-9 text-sky-400 animate-pulse" />
              </div>
              <h3 className="standby-title">Oscilloscope in Standby</h3>
              <p className="standby-desc">
                Circuit loaded. Waveforms appear when you start simulation.
              </p>
              <button
                onClick={onStartSimulation}
                className="btn-start-large"
                type="button"
              >
                <Play className="w-4 h-4 fill-current text-emerald-300" />
                <span>Start Simulation</span>
              </button>

              <div className="standby-features-list">
                <div className="standby-feature-item">
                  <span className="dot bg-emerald-400"></span>
                  <span><strong>Vs: AC Voltage:</strong> Pure sinusoidal AC input waveform</span>
                </div>
                <div className="standby-feature-item">
                  <span className="dot bg-blue-500"></span>
                  <span><strong>Is: AC Current:</strong> AC line current drawn with symmetry</span>
                </div>
                <div className="standby-feature-item">
                  <span className="dot bg-emerald-400"></span>
                  <span><strong>Vo: DC Voltage:</strong> Rectified output pulses showing negative dips</span>
                </div>
                <div className="standby-feature-item">
                  <span className="dot bg-blue-500"></span>
                  <span><strong>Io: DC Current:</strong> Inductive continuous / discontinuous current</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Live Waveform Canvas / SVG Rendering */
          <div className="waveforms-render-box">
            {simulationResult && (
              <>
                {viewMode === 'dual' ? (
                  <DualScopeView
                    simulationResult={simulationResult}
                    hoverIndex={hoverIndex}
                    circuitParams={circuitParams}
                  />
                ) : (
                  <div className="stacked-scopes">
                    {channels.map((ch) => {
                      if (!activeChannels[ch.key]) return null;
                      return (
                        <SubScopeView
                          key={ch.key}
                          channel={ch}
                          data={simulationResult[ch.key]}
                          times={simulationResult.times}
                          hoverIndex={hoverIndex}
                          totalTime={simulationResult.totalTime}
                          circuitParams={circuitParams}
                          simulationResult={simulationResult}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Interactive Cursor Readout Bar */}
                {hoverIndex !== null && simulationResult.times[hoverIndex] !== undefined && (
                  <div className="cursor-readout-strip flex-wrap gap-x-4 gap-y-1">
                    <div className="cursor-metric">
                      <span className="lbl">t:</span>
                      <strong className="text-white">{(simulationResult.times[hoverIndex] * 1000).toFixed(2)} ms</strong>
                    </div>
                    <div className="cursor-metric">
                      <span className="lbl">θ:</span>
                      <strong className="text-purple-300">
                        {simulationResult.angles[hoverIndex].toFixed(1)}°
                        <span className="text-[10px] text-slate-400 ml-1">
                          (Cycle {Math.floor(simulationResult.times[hoverIndex] * (circuitParams?.frequency || 50)) + 1})
                        </span>
                      </strong>
                    </div>

                    {simulationResult.isThreePhase ? (
                      <>
                        <div className="cursor-metric text-red-400">
                          <span className="lbl">Va:</span>
                          <strong>{(simulationResult.va?.[hoverIndex] ?? simulationResult.vs[hoverIndex]).toFixed(1)} V</strong>
                        </div>
                        <div className="cursor-metric text-emerald-400">
                          <span className="lbl">Vb:</span>
                          <strong>{(simulationResult.vb?.[hoverIndex] ?? 0).toFixed(1)} V</strong>
                        </div>
                        <div className="cursor-metric text-blue-400">
                          <span className="lbl">Vc:</span>
                          <strong>{(simulationResult.vc?.[hoverIndex] ?? 0).toFixed(1)} V</strong>
                        </div>
                        <div className="cursor-metric text-amber-300">
                          <span className="lbl">Vo:</span>
                          <strong>{simulationResult.vo[hoverIndex].toFixed(1)} V</strong>
                        </div>

                        <div className="cursor-metric text-red-400">
                          <span className="lbl">Ia:</span>
                          <strong>{(simulationResult.ia?.[hoverIndex] ?? simulationResult.is[hoverIndex]).toFixed(2)} A</strong>
                        </div>
                        <div className="cursor-metric text-emerald-400">
                          <span className="lbl">Ib:</span>
                          <strong>{(simulationResult.ib?.[hoverIndex] ?? 0).toFixed(2)} A</strong>
                        </div>
                        <div className="cursor-metric text-blue-400">
                          <span className="lbl">Ic:</span>
                          <strong>{(simulationResult.ic?.[hoverIndex] ?? 0).toFixed(2)} A</strong>
                        </div>
                        <div className="cursor-metric text-cyan-300">
                          <span className="lbl">Io:</span>
                          <strong>{simulationResult.io[hoverIndex].toFixed(2)} A</strong>
                        </div>
                      </>
                    ) : (
                      <>
                        {activeChannels.vs && (
                          <div className="cursor-metric text-sky-400">
                            <span className="lbl">Vs:</span>
                            <strong>{simulationResult.vs[hoverIndex].toFixed(1)} V</strong>
                          </div>
                        )}
                        {activeChannels.vo && (
                          <div className="cursor-metric text-amber-300">
                            <span className="lbl">Vo:</span>
                            <strong>{simulationResult.vo[hoverIndex].toFixed(1)} V</strong>
                          </div>
                        )}
                        {activeChannels.is && (
                          <div className="cursor-metric text-indigo-300">
                            <span className="lbl">Is:</span>
                            <strong>{simulationResult.is[hoverIndex].toFixed(2)} A</strong>
                          </div>
                        )}
                        {activeChannels.io && (
                          <div className="cursor-metric text-cyan-300">
                            <span className="lbl">Io:</span>
                            <strong>{simulationResult.io[hoverIndex].toFixed(2)} A</strong>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Parameter Summary Footer Matching Prof. Arpan Hota slides */}
      {isSimulating && (
        <div className="wave-footer-summary px-3 py-2 border-t border-slate-800/80 bg-slate-950/70 flex items-center justify-between text-xs select-none">
          <div className="flex items-center gap-3 flex-wrap font-serif italic text-slate-300">
            <span>R = <strong className="text-amber-400 not-italic font-mono">{circuitParams?.resistance || 20} Ω</strong></span>
            <span>L = <strong className="text-emerald-400 not-italic font-mono">{((circuitParams?.inductance || 0) * 1000).toFixed(0)} mH</strong></span>
            <span>Vm = <strong className="text-sky-400 not-italic font-mono">{circuitParams?.voltage || 230} V</strong></span>
            <span>f = <strong className="text-slate-200 not-italic font-mono">{circuitParams?.frequency || 50} Hz</strong></span>
            {circuitParams?.firingAngleDeg !== undefined && circuitParams?.firingAngleDeg > 0 && (
              <span>α = <strong className="text-purple-400 not-italic font-mono">{circuitParams.firingAngleDeg}°</strong></span>
            )}
            {simulationResult?.stats?.phasePhiDeg && (
              <span>φ = <strong className="text-cyan-400 not-italic font-mono">{simulationResult.stats.phasePhiDeg}°</strong></span>
            )}
            {simulationResult?.stats?.criticalInductanceMh && simulationResult.stats.criticalInductanceMh !== '0' && (
              <span>L<sub>crit</sub> = <strong className="text-amber-300 not-italic font-mono">{simulationResult.stats.criticalInductanceMh} mH</strong></span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
              circuitParams?.isFreewheelingActive
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900/60 text-slate-400 border-slate-700'
            }`}>
              {circuitParams?.isFreewheelingActive ? '⚡ FWD ON (Vo ≥ 0)' : 'FWD OFF'}
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
              simulationResult?.stats?.isContinuous
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : (simulationResult?.stats?.conductionMode === 'R Load'
                    ? 'bg-slate-800/60 text-slate-300 border-slate-700'
                    : 'bg-amber-950/60 text-amber-300 border-amber-800')
            }`}>
              {simulationResult?.stats?.isContinuous
                ? '● CCM (Continuous)'
                : (simulationResult?.stats?.conductionMode === 'R Load'
                    ? 'Pure R Load'
                    : `○ DCM (β = ${simulationResult?.stats?.extinctionAngleDeg || '—'}°)`)}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}

/**
 * SubScopeView: High-Precision Symmetrical SVG Waveform with Strict Clipping & Slide-Accurate Markers
 */
function SubScopeView({ channel, data, times, hoverIndex, totalTime, circuitParams, simulationResult }) {
  const width = 580;
  const height = 112;
  const padding = { top: 12, bottom: 20, left: 56, right: 20 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const clipId = `clip-${channel.key}`;

  const firingAngleDeg = circuitParams?.firingAngleDeg;
  const hasThyristor = circuitParams?.hasThyristor || circuitParams?.circuitType?.includes('thyristor');
  const isControlled = hasThyristor && firingAngleDeg !== undefined && firingAngleDeg > 0;
  const f = circuitParams?.frequency || 50;
  const T = 1 / f;

  // Compute trigger pulse times (alpha, pi + alpha, 2*pi + alpha, 3*pi + alpha)
  const pulseMarkers = useMemo(() => {
    if (!isControlled || !totalTime) return [];
    const tAlpha1 = (firingAngleDeg / 360) * T;
    const tAlpha2 = ((180 + firingAngleDeg) / 360) * T;
    const tAlpha3 = tAlpha1 + T;
    const tAlpha4 = tAlpha2 + T;
    const rawTimes = [
      { t: tAlpha1, label: 'I' },
      { t: tAlpha2, label: 'II' },
      { t: tAlpha3, label: 'I' },
      { t: tAlpha4, label: 'II' },
    ];
    return rawTimes.filter((m) => m.t <= totalTime);
  }, [isControlled, firingAngleDeg, totalTime, T]);

  // Zero-crossing markers for AC cycles (pi, 2*pi, 3*pi, 4*pi)
  const halfCycleMarkers = useMemo(() => {
    if (!totalTime || !T) return [];
    const markers = [];
    const numHalfCycles = Math.round((totalTime / T) * 2);
    for (let k = 1; k <= numHalfCycles; k++) {
      const tMarker = k * (T / 2);
      if (tMarker <= totalTime + 1e-6) {
        let label = '';
        if (k === 1) label = 'π';
        else if (k === 2) label = '2π';
        else if (k === 3) label = '3π';
        else if (k === 4) label = '4π';
        markers.push({ t: tMarker, label });
      }
    }
    return markers;
  }, [totalTime, T]);

  // Extinction angle markers when in Discontinuous Conduction Mode (DCM)
  const extinctionMarkers = useMemo(() => {
    if (!isControlled || !totalTime || !simulationResult?.stats) return [];
    if (simulationResult.stats.isContinuous) return [];
    const betaDeg = parseFloat(simulationResult.stats.extinctionAngleDeg);
    if (!betaDeg || isNaN(betaDeg) || betaDeg <= 180) return [];
    const tBeta1 = (betaDeg / 360) * T;
    const tBeta2 = ((180 + betaDeg) / 360) * T;
    const tBeta3 = tBeta1 + T;
    const tBeta4 = tBeta2 + T;
    return [
      { t: tBeta1, label: 'β' },
      { t: tBeta2, label: 'π+β' },
      { t: tBeta3, label: '2π+β' },
      { t: tBeta4, label: '3π+β' },
    ].filter((m) => m.t <= totalTime);
  }, [isControlled, totalTime, T, simulationResult?.stats]);

  // Symmetrical Scaling Logic Strictly Matching Lecture Slides
  const { minVal, maxVal, zeroY } = useMemo(() => {
    let min = 0;
    let max = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] < min) min = data[i];
      if (data[i] > max) max = data[i];
    }

    if (channel.isBipolar) {
      // Pure AC: Center zero line dead center
      const bound = Math.max(Math.abs(min), Math.abs(max)) * 1.15 || 1;
      return {
        minVal: -bound,
        maxVal: bound,
        zeroY: padding.top + plotH / 2,
      };
    } else if (channel.key === 'vo') {
      // DC-side Voltage: Symmetrical Linear scale clearly revealing negative dips
      const topBound = Math.max(1, max) * 1.15;
      const botBound = min < -1 ? Math.min(-50, min * 1.15) : -topBound * 0.05;
      const range = topBound - botBound;
      const zY = padding.top + plotH * (1 - (0 - botBound) / range);
      return {
        minVal: botBound,
        maxVal: topBound,
        zeroY: zY,
      };
    } else {
      // DC-side Current: Positive trace starting strictly from 0A baseline
      const topBound = Math.max(1, max) * 1.18;
      const botBound = 0;
      return {
        minVal: 0,
        maxVal: topBound,
        zeroY: padding.top + plotH,
      };
    }
  }, [data, channel.isBipolar, channel.key, plotH, padding.top]);

  const scaleX = (i) => padding.left + (i / (data.length - 1)) * plotW;
  const scaleY = (val) => padding.top + plotH * (1 - (val - minVal) / (maxVal - minVal));

  const pathD = useMemo(() => {
    if (!data || data.length === 0) return '';
    const points = [];
    const step = Math.max(1, Math.floor(data.length / 1000));
    for (let i = 0; i < data.length; i += step) {
      const x = scaleX(i);
      const y = Math.max(padding.top, Math.min(padding.top + plotH, scaleY(data[i])));
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return points.join(' ');
  }, [data, minVal, maxVal, plotH, padding.top]);

  const hoverX = hoverIndex !== null ? scaleX(hoverIndex) : null;
  const hoverY = hoverIndex !== null ? scaleY(data[hoverIndex]) : null;

  return (
    <div className="subscope-card">
      <div className="subscope-header">
        <div className="flex items-center gap-1.5">
          <span className="dot-mini" style={{ backgroundColor: channel.color }} />
          <span className="subscope-name" style={{ color: channel.color }}>
            {channel.label}
          </span>
        </div>
        <div className="subscope-instant-val">
          {hoverIndex !== null && data[hoverIndex] !== undefined ? (
            <span style={{ color: channel.color }}>
              {data[hoverIndex].toFixed(2)} {channel.unit}
            </span>
          ) : (
            <span className="text-slate-400 font-mono">
              Pk: {maxVal > 0 ? `+${maxVal.toFixed(1)}` : '0'} {channel.unit}
            </span>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="subscope-svg">
        <defs>
          <clipPath id={clipId}>
            <rect x={padding.left} y={padding.top} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* Graticule Background Grid */}
        <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="#172235" strokeDasharray="3,3" />
        <line x1={padding.left} y1={padding.top + plotH / 2} x2={width - padding.right} y2={padding.top + plotH / 2} stroke="#172235" strokeDasharray="3,3" />
        <line x1={padding.left} y1={padding.top + plotH} x2={width - padding.right} y2={padding.top + plotH} stroke="#172235" strokeDasharray="3,3" />

        {/* Half-Cycle AC Reference Markers (pi, 2*pi, 3*pi, 4*pi) */}
        {halfCycleMarkers.map((marker, idx) => {
          const mX = padding.left + (marker.t / totalTime) * plotW;
          return (
            <g key={`hc-${idx}`}>
              <line
                x1={mX}
                y1={padding.top}
                x2={mX}
                y2={padding.top + plotH}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="2,3"
              />
              <text
                x={mX}
                y={padding.top + 7}
                fill="#475569"
                fontSize="8"
                fontStyle="italic"
                fontFamily="'Times New Roman', serif"
                textAnchor="middle"
              >
                {marker.label}
              </text>
            </g>
          );
        })}

        {/* Symmetrical Zero Reference Line */}
        <line
          x1={padding.left}
          y1={zeroY}
          x2={width - padding.right}
          y2={zeroY}
          stroke="#3b4d66"
          strokeWidth="1.2"
          strokeDasharray="4,2"
        />

        {/* Vertical Pulse Guide Lines & Red Trigger Spikes (Slide 25 & 26) */}
        {pulseMarkers.map((marker, mIdx) => {
          const markerX = padding.left + (marker.t / totalTime) * plotW;
          return (
            <g key={mIdx}>
              {/* Thin vertical guide line matching Slide 25 labeled I and II */}
              <line
                x1={markerX}
                y1={padding.top}
                x2={markerX}
                y2={padding.top + plotH}
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.45"
              />
              {/* Firing pulse needle spike on AC voltage plot */}
              {channel.key === 'vs' && (
                <g>
                  <line
                    x1={markerX}
                    y1={zeroY}
                    x2={markerX}
                    y2={zeroY - 40}
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx={markerX} cy={zeroY - 40} r="2" fill="#ef4444" />
                </g>
              )}
              {/* Roman numeral label I / II */}
              <text
                x={markerX}
                y={height - 4}
                fill="#f87171"
                fontSize="9"
                fontWeight="bold"
                fontFamily="'Times New Roman', serif"
                textAnchor="middle"
              >
                {marker.label}
              </text>
            </g>
          );
        })}

        {/* Extinction Angle Markers when in DCM (Slide 26) */}
        {extinctionMarkers.map((marker, idx) => {
          const mX = padding.left + (marker.t / totalTime) * plotW;
          return (
            <g key={`ext-${idx}`}>
              <line
                x1={mX}
                y1={padding.top}
                x2={mX}
                y2={padding.top + plotH}
                stroke="#f59e0b"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.55"
              />
              <text
                x={mX}
                y={height - 4}
                fill="#fbbf24"
                fontSize="8.5"
                fontWeight="bold"
                fontFamily="'Times New Roman', serif"
                textAnchor="middle"
              >
                {marker.label}
              </text>
            </g>
          );
        })}

        {/* Y-Axis Value Labels */}
        <text x={padding.left - 6} y={padding.top + 8} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
          +{maxVal.toFixed(0)}
        </text>
        <text x={padding.left - 6} y={zeroY + 3} fill="#94a3b8" fontSize="9" textAnchor="end" fontFamily="monospace" fontWeight="bold">
          0{channel.unit}
        </text>
        {minVal < -1 && (
          <text x={padding.left - 6} y={padding.top + plotH - 2} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
            {minVal.toFixed(0)}
          </text>
        )}

        {/* Waveform Trace - Strictly Clipped */}
        <path
          d={pathD}
          fill="none"
          stroke={channel.color}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          clipPath={`url(#${clipId})`}
        />

        {/* Hover Crosshair Cursor */}
        {hoverX !== null && (
          <g>
            <line
              x1={hoverX}
              y1={padding.top}
              x2={hoverX}
              y2={padding.top + plotH}
              stroke="#e2e8f0"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            {hoverY !== null && (
              <circle
                cx={hoverX}
                cy={hoverY}
                r="4"
                fill={channel.color}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            )}
          </g>
        )}

        {/* X-Axis Time Labels */}
        <text x={padding.left} y={height - 5} fill="#64748b" fontSize="9" textAnchor="start" fontFamily="monospace">
          0.00
        </text>
        <text x={padding.left + plotW / 2} y={height - 5} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
          {((totalTime / 2)).toFixed(2)} s
        </text>
        <text x={width - padding.right} y={height - 5} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
          {(totalTime).toFixed(2)} s
        </text>
      </svg>
    </div>
  );
}

/**
 * DualScopeView: Two Separate, Vertically Stacked Chart Containers
 * - Top container: Exclusively Voltage (Vin faded envelopes & Vout bold trace)
 * - Bottom container: Exclusively Current (Iin faded envelopes & Iout bold trace)
 * - Independent auto-scaled Y-axes with zero-centered graticule
 */
function DualScopeView({ simulationResult, hoverIndex, circuitParams }) {
  return (
    <div className="dual-scopes-container">
      <VoltageScopeCard
        simulationResult={simulationResult}
        hoverIndex={hoverIndex}
        circuitParams={circuitParams}
      />
      <CurrentScopeCard
        simulationResult={simulationResult}
        hoverIndex={hoverIndex}
        circuitParams={circuitParams}
      />
    </div>
  );
}

/**
 * VoltageScopeCard: Dedicated Voltage Oscilloscope Chart
 */
function VoltageScopeCard({ simulationResult, hoverIndex, circuitParams }) {
  const width = 640;
  const height = 185;
  const padding = { top: 16, bottom: 22, left: 58, right: 20 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const zeroY = padding.top + plotH / 2;

  const { times, vo, vs, va, vb, vc, isThreePhase, totalTime } = simulationResult;

  // Independent auto-scaling based on maximum absolute peak voltage
  const maxV = useMemo(() => {
    let peak = 10;
    if (isThreePhase && va && vb && vc) {
      const step = Math.max(1, Math.floor(va.length / 400));
      for (let i = 0; i < va.length; i += step) {
        const a = Math.abs(va[i] || 0);
        const b = Math.abs(vb[i] || 0);
        const c = Math.abs(vc[i] || 0);
        const o = Math.abs(vo[i] || 0);
        if (a > peak) peak = a;
        if (b > peak) peak = b;
        if (c > peak) peak = c;
        if (o > peak) peak = o;
      }
    } else {
      const step = Math.max(1, Math.floor(vs.length / 400));
      for (let i = 0; i < vs.length; i += step) {
        const s = Math.abs(vs[i] || 0);
        const o = Math.abs(vo[i] || 0);
        if (s > peak) peak = s;
        if (o > peak) peak = o;
      }
    }
    const scaled = peak * 1.15;
    if (scaled < 50) return Math.ceil(scaled / 5) * 5;
    if (scaled < 200) return Math.ceil(scaled / 10) * 10;
    return Math.ceil(scaled / 25) * 25;
  }, [isThreePhase, va, vb, vc, vs, vo]);

  const scaleX = (i) => padding.left + (i / (times.length - 1)) * plotW;
  const scaleY = (v) => padding.top + plotH * (1 - (v - -maxV) / (2 * maxV));

  const generatePath = (arr) => {
    if (!arr || arr.length === 0) return '';
    const points = [];
    const step = Math.max(1, Math.floor(arr.length / 1000));
    for (let i = 0; i < arr.length; i += step) {
      const x = scaleX(i);
      const rawY = scaleY(arr[i] || 0);
      const y = Math.max(padding.top, Math.min(padding.top + plotH, rawY));
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return points.join(' ');
  };

  const [visible, setVisible] = useState({
    va: true,
    vb: true,
    vc: true,
    vin: true,
    vo: true,
  });

  const toggle = (k) => setVisible((prev) => ({ ...prev, [k]: !prev[k] }));

  const hoverX = hoverIndex !== null ? scaleX(hoverIndex) : null;
  const hoverVoY = hoverIndex !== null && vo[hoverIndex] !== undefined
    ? Math.max(padding.top, Math.min(padding.top + plotH, scaleY(vo[hoverIndex])))
    : null;

  return (
    <div className="dual-scope-card">
      {/* Top Header & Interactive Legend */}
      <div className="dual-scope-header">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
            VOLTAGE (V)
          </span>
          <span className="text-xs font-semibold text-slate-200">
            {isThreePhase ? '3-Phase AC Input & DC Output' : 'AC Input & DC Output'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isThreePhase ? (
            <>
              <button
                type="button"
                onClick={() => toggle('va')}
                className={`scope-legend-pill ${visible.va ? 'active-va' : 'pill-inactive'}`}
                title="Toggle Phase A Voltage (Va)"
              >
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span>Va</span>
              </button>
              <button
                type="button"
                onClick={() => toggle('vb')}
                className={`scope-legend-pill ${visible.vb ? 'active-vb' : 'pill-inactive'}`}
                title="Toggle Phase B Voltage (Vb)"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Vb</span>
              </button>
              <button
                type="button"
                onClick={() => toggle('vc')}
                className={`scope-legend-pill ${visible.vc ? 'active-vc' : 'pill-inactive'}`}
                title="Toggle Phase C Voltage (Vc)"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>Vc</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => toggle('vin')}
              className={`scope-legend-pill ${visible.vin ? 'active-vin' : 'pill-inactive'}`}
              title="Toggle AC Input Voltage (Vin)"
            >
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              <span>Vin (AC)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => toggle('vo')}
            className={`scope-legend-pill ${visible.vo ? 'active-vo' : 'pill-inactive'}`}
            title="Toggle DC Output Voltage (Vo)"
          >
            <span className="w-2.5 h-1.5 rounded bg-amber-400"></span>
            <span>Vout (DC)</span>
          </button>

          <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 ml-1">
            ±{maxV.toFixed(0)} V
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg viewBox={`0 0 ${width} ${height}`} className="dual-scope-svg">
        <defs>
          <clipPath id="volt-clip">
            <rect x={padding.left} y={padding.top} width={plotW} height={plotH} />
          </clipPath>
          <filter id="glow-vo" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#fbbf24" floodOpacity="0.45" />
          </filter>
        </defs>

        <rect x={padding.left} y={padding.top} width={plotW} height={plotH} fill="#060b14" />

        {/* Graticule Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1={padding.left}
            y1={padding.top + plotH * pct}
            x2={width - padding.right}
            y2={padding.top + plotH * pct}
            stroke={pct === 0.5 ? '#3b4d66' : '#141d2d'}
            strokeWidth={pct === 0.5 ? '1.5' : '1'}
            strokeDasharray={pct === 0.5 ? 'none' : '3,3'}
          />
        ))}

        {/* Vertical Time Subdivisions */}
        {[0.25, 0.5, 0.75].map((pct) => (
          <line
            key={pct}
            x1={padding.left + plotW * pct}
            y1={padding.top}
            x2={padding.left + plotW * pct}
            y2={padding.top + plotH}
            stroke="#141d2d"
            strokeWidth="1"
            strokeDasharray="2,3"
          />
        ))}

        {/* Left Y Axis Labels */}
        <text x={padding.left - 6} y={padding.top + 8} fill="#94a3b8" fontSize="9" textAnchor="end" fontFamily="monospace">
          +{maxV.toFixed(0)}V
        </text>
        <text x={padding.left - 6} y={zeroY - plotH * 0.25 + 3} fill="#64748b" fontSize="8.5" textAnchor="end" fontFamily="monospace">
          +{(maxV / 2).toFixed(0)}V
        </text>
        <text x={padding.left - 6} y={zeroY + 3} fill="#cbd5e1" fontSize="9.5" fontWeight="bold" textAnchor="end" fontFamily="monospace">
          0V
        </text>
        <text x={padding.left - 6} y={zeroY + plotH * 0.25 + 3} fill="#64748b" fontSize="8.5" textAnchor="end" fontFamily="monospace">
          -{(maxV / 2).toFixed(0)}V
        </text>
        <text x={padding.left - 6} y={padding.top + plotH - 1} fill="#94a3b8" fontSize="9" textAnchor="end" fontFamily="monospace">
          -{maxV.toFixed(0)}V
        </text>

        {/* Waveform Traces Clipped strictly to graticule */}
        <g clipPath="url(#volt-clip)">
          {/* Faded Background AC Input Traces */}
          {isThreePhase ? (
            <>
              {visible.va && (
                <path d={generatePath(va)} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.45" />
              )}
              {visible.vb && (
                <path d={generatePath(vb)} fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.45" />
              )}
              {visible.vc && (
                <path d={generatePath(vc)} fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.45" />
              )}
            </>
          ) : (
            <>
              {visible.vin && (
                <path d={generatePath(vs)} fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.45" />
              )}
            </>
          )}

          {/* Thick, Bold, Opaque DC-Side Output Waveform Tracing over active conduction paths */}
          {visible.vo && (
            <path
              d={generatePath(vo)}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="3.2"
              opacity="1.0"
              filter="url(#glow-vo)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Synchronized Crosshair Cursor */}
          {hoverX !== null && (
            <>
              <line
                x1={hoverX}
                y1={padding.top}
                x2={hoverX}
                y2={padding.top + plotH}
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeDasharray="3,3"
                opacity="0.8"
              />
              {visible.vo && hoverVoY !== null && (
                <circle
                  cx={hoverX}
                  cy={hoverVoY}
                  r="4"
                  fill="#fbbf24"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
              {isThreePhase && hoverIndex !== null && (
                <>
                  {visible.va && va?.[hoverIndex] !== undefined && (
                    <circle cx={hoverX} cy={scaleY(va[hoverIndex])} r="3" fill="#ef4444" opacity="0.8" />
                  )}
                  {visible.vb && vb?.[hoverIndex] !== undefined && (
                    <circle cx={hoverX} cy={scaleY(vb[hoverIndex])} r="3" fill="#22c55e" opacity="0.8" />
                  )}
                  {visible.vc && vc?.[hoverIndex] !== undefined && (
                    <circle cx={hoverX} cy={scaleY(vc[hoverIndex])} r="3" fill="#3b82f6" opacity="0.8" />
                  )}
                </>
              )}
            </>
          )}
        </g>

        {/* X-Axis Time Labels */}
        <text x={padding.left} y={height - 7} fill="#64748b" fontSize="9" textAnchor="start" fontFamily="monospace">
          0.0 ms
        </text>
        <text x={padding.left + plotW / 2} y={height - 7} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
          {((totalTime / 2) * 1000).toFixed(1)} ms
        </text>
        <text x={width - padding.right} y={height - 7} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
          {(totalTime * 1000).toFixed(1)} ms
        </text>
      </svg>
    </div>
  );
}

/**
 * CurrentScopeCard: Dedicated Current Oscilloscope Chart
 */
function CurrentScopeCard({ simulationResult, hoverIndex, circuitParams }) {
  const width = 640;
  const height = 185;
  const padding = { top: 16, bottom: 22, left: 58, right: 20 };

  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;
  const zeroY = padding.top + plotH / 2;

  const { times, io, is, ia, ib, ic, isThreePhase, totalTime } = simulationResult;

  // Independent auto-scaling based on maximum absolute peak current
  const maxI = useMemo(() => {
    let peak = 0.5;
    if (isThreePhase && ia && ib && ic) {
      const step = Math.max(1, Math.floor(ia.length / 400));
      for (let i = 0; i < ia.length; i += step) {
        const a = Math.abs(ia[i] || 0);
        const b = Math.abs(ib[i] || 0);
        const c = Math.abs(ic[i] || 0);
        const o = Math.abs(io[i] || 0);
        if (a > peak) peak = a;
        if (b > peak) peak = b;
        if (c > peak) peak = c;
        if (o > peak) peak = o;
      }
    } else {
      const step = Math.max(1, Math.floor(is.length / 400));
      for (let i = 0; i < is.length; i += step) {
        const s = Math.abs(is[i] || 0);
        const o = Math.abs(io[i] || 0);
        if (s > peak) peak = s;
        if (o > peak) peak = o;
      }
    }
    const scaled = peak * 1.20;
    if (scaled < 1.5) return Math.ceil(scaled * 10) / 10;
    if (scaled < 5) return Math.ceil(scaled * 4) / 4;
    if (scaled < 20) return Math.ceil(scaled * 2) / 2;
    return Math.ceil(scaled);
  }, [isThreePhase, ia, ib, ic, is, io]);

  const scaleX = (i) => padding.left + (i / (times.length - 1)) * plotW;
  const scaleY = (val) => padding.top + plotH * (1 - (val - -maxI) / (2 * maxI));

  const generatePath = (arr) => {
    if (!arr || arr.length === 0) return '';
    const points = [];
    const step = Math.max(1, Math.floor(arr.length / 1000));
    for (let i = 0; i < arr.length; i += step) {
      const x = scaleX(i);
      const rawY = scaleY(arr[i] || 0);
      const y = Math.max(padding.top, Math.min(padding.top + plotH, rawY));
      points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
    }
    return points.join(' ');
  };

  const [visible, setVisible] = useState({
    ia: true,
    ib: true,
    ic: true,
    iin: true,
    io: true,
  });

  const toggle = (k) => setVisible((prev) => ({ ...prev, [k]: !prev[k] }));

  const hoverX = hoverIndex !== null ? scaleX(hoverIndex) : null;
  const hoverIoY = hoverIndex !== null && io[hoverIndex] !== undefined
    ? Math.max(padding.top, Math.min(padding.top + plotH, scaleY(io[hoverIndex])))
    : null;

  return (
    <div className="dual-scope-card">
      {/* Top Header & Interactive Legend */}
      <div className="dual-scope-header">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            CURRENT (A)
          </span>
          <span className="text-xs font-semibold text-slate-200">
            {isThreePhase ? '3-Phase AC Input & DC Output' : 'AC Input & DC Output'}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isThreePhase ? (
            <>
              <button
                type="button"
                onClick={() => toggle('ia')}
                className={`scope-legend-pill ${visible.ia ? 'active-ia' : 'pill-inactive'}`}
                title="Toggle Phase A Current (Ia)"
              >
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span>Ia</span>
              </button>
              <button
                type="button"
                onClick={() => toggle('ib')}
                className={`scope-legend-pill ${visible.ib ? 'active-ib' : 'pill-inactive'}`}
                title="Toggle Phase B Current (Ib)"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Ib</span>
              </button>
              <button
                type="button"
                onClick={() => toggle('ic')}
                className={`scope-legend-pill ${visible.ic ? 'active-ic' : 'pill-inactive'}`}
                title="Toggle Phase C Current (Ic)"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>Ic</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => toggle('iin')}
              className={`scope-legend-pill ${visible.iin ? 'active-iin' : 'pill-inactive'}`}
              title="Toggle AC Input Current (Iin)"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              <span>Iin (AC)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => toggle('io')}
            className={`scope-legend-pill ${visible.io ? 'active-io' : 'pill-inactive'}`}
            title="Toggle DC Output Current (Io)"
          >
            <span className="w-2.5 h-1.5 rounded bg-cyan-400"></span>
            <span>Iout (DC)</span>
          </button>

          <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 ml-1">
            ±{maxI.toFixed(2)} A
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg viewBox={`0 0 ${width} ${height}`} className="dual-scope-svg">
        <defs>
          <clipPath id="curr-clip">
            <rect x={padding.left} y={padding.top} width={plotW} height={plotH} />
          </clipPath>
          <filter id="glow-io" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#00f0ff" floodOpacity="0.45" />
          </filter>
        </defs>

        <rect x={padding.left} y={padding.top} width={plotW} height={plotH} fill="#060b14" />

        {/* Graticule Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1={padding.left}
            y1={padding.top + plotH * pct}
            x2={width - padding.right}
            y2={padding.top + plotH * pct}
            stroke={pct === 0.5 ? '#3b4d66' : '#141d2d'}
            strokeWidth={pct === 0.5 ? '1.5' : '1'}
            strokeDasharray={pct === 0.5 ? 'none' : '3,3'}
          />
        ))}

        {/* Vertical Time Subdivisions */}
        {[0.25, 0.5, 0.75].map((pct) => (
          <line
            key={pct}
            x1={padding.left + plotW * pct}
            y1={padding.top}
            x2={padding.left + plotW * pct}
            y2={padding.top + plotH}
            stroke="#141d2d"
            strokeWidth="1"
            strokeDasharray="2,3"
          />
        ))}

        {/* Left Y Axis Labels */}
        <text x={padding.left - 6} y={padding.top + 8} fill="#94a3b8" fontSize="9" textAnchor="end" fontFamily="monospace">
          +{maxI.toFixed(1)}A
        </text>
        <text x={padding.left - 6} y={zeroY - plotH * 0.25 + 3} fill="#64748b" fontSize="8.5" textAnchor="end" fontFamily="monospace">
          +{(maxI / 2).toFixed(1)}A
        </text>
        <text x={padding.left - 6} y={zeroY + 3} fill="#cbd5e1" fontSize="9.5" fontWeight="bold" textAnchor="end" fontFamily="monospace">
          0A
        </text>
        <text x={padding.left - 6} y={zeroY + plotH * 0.25 + 3} fill="#64748b" fontSize="8.5" textAnchor="end" fontFamily="monospace">
          -{(maxI / 2).toFixed(1)}A
        </text>
        <text x={padding.left - 6} y={padding.top + plotH - 1} fill="#94a3b8" fontSize="9" textAnchor="end" fontFamily="monospace">
          -{maxI.toFixed(1)}A
        </text>

        {/* Waveform Traces Clipped strictly to graticule */}
        <g clipPath="url(#curr-clip)">
          {/* Faded Background AC Input Current Traces */}
          {isThreePhase ? (
            <>
              {visible.ia && (
                <path d={generatePath(ia)} fill="none" stroke="#ef4444" strokeWidth="1.5" opacity="0.45" />
              )}
              {visible.ib && (
                <path d={generatePath(ib)} fill="none" stroke="#22c55e" strokeWidth="1.5" opacity="0.45" />
              )}
              {visible.ic && (
                <path d={generatePath(ic)} fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.45" />
              )}
            </>
          ) : (
            <>
              {visible.iin && (
                <path d={generatePath(is)} fill="none" stroke="#818cf8" strokeWidth="1.5" opacity="0.45" />
              )}
            </>
          )}

          {/* Thick, Bold, Opaque DC-Side Output Waveform Tracing over load conduction */}
          {visible.io && (
            <path
              d={generatePath(io)}
              fill="none"
              stroke="#00f0ff"
              strokeWidth="3.2"
              opacity="1.0"
              filter="url(#glow-io)"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Interactive Synchronized Crosshair Cursor */}
          {hoverX !== null && (
            <>
              <line
                x1={hoverX}
                y1={padding.top}
                x2={hoverX}
                y2={padding.top + plotH}
                stroke="#ffffff"
                strokeWidth="1.2"
                strokeDasharray="3,3"
                opacity="0.8"
              />
              {visible.io && hoverIoY !== null && (
                <circle
                  cx={hoverX}
                  cy={hoverIoY}
                  r="4"
                  fill="#00f0ff"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              )}
              {isThreePhase && hoverIndex !== null && (
                <>
                  {visible.ia && ia?.[hoverIndex] !== undefined && (
                    <circle cx={hoverX} cy={scaleY(ia[hoverIndex])} r="3" fill="#ef4444" opacity="0.8" />
                  )}
                  {visible.ib && ib?.[hoverIndex] !== undefined && (
                    <circle cx={hoverX} cy={scaleY(ib[hoverIndex])} r="3" fill="#22c55e" opacity="0.8" />
                  )}
                  {visible.ic && ic?.[hoverIndex] !== undefined && (
                    <circle cx={hoverX} cy={scaleY(ic[hoverIndex])} r="3" fill="#3b82f6" opacity="0.8" />
                  )}
                </>
              )}
            </>
          )}
        </g>

        {/* X-Axis Time Labels */}
        <text x={padding.left} y={height - 7} fill="#64748b" fontSize="9" textAnchor="start" fontFamily="monospace">
          0.0 ms
        </text>
        <text x={padding.left + plotW / 2} y={height - 7} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="monospace">
          {((totalTime / 2) * 1000).toFixed(1)} ms
        </text>
        <text x={width - padding.right} y={height - 7} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
          {(totalTime * 1000).toFixed(1)} ms
        </text>
      </svg>
    </div>
  );
}
