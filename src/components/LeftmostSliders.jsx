import React from 'react';
import { Sliders, Zap, RotateCcw } from 'lucide-react';

export default function LeftmostSliders({
  params,
  onParamChange,
  isSimulating,
  onToggleSimulation,
  onResetParams,
}) {
  const {
    firingAngleDeg = 45,
    voltage = 230,
    frequency = 50,
    resistance = 20,
    inductance = 50, // in mH (0.01 mH = 10 µH to 1000 mH)
    cycles = 2,
    sourceType = 'ac',
    hasThyristor = true,
  } = params;

  // Derived calculations
  const omega = 2 * Math.PI * frequency;
  const L_H = (inductance || 0) / 1000;
  const XL = omega * L_H;
  const Z = Math.sqrt(resistance * resistance + XL * XL);
  const phiDeg = (Math.atan2(XL, resistance) * 180) / Math.PI;
  const periodMs = (1000 / frequency).toFixed(1);
  const alphaRad = ((firingAngleDeg * Math.PI) / 180).toFixed(2);

  // Large Inductance Logarithmic Slider Calculations:
  // Range: 10 µH (0.01 mH) to 1000 mH (1 H), plus 0 at slider pos 0
  const sliderSteps = 500;

  const inductanceToSliderPos = (mH) => {
    if (!mH || mH <= 0) return 0;
    const clamped = Math.max(0.01, Math.min(1000, mH));
    const ratio = Math.log10(clamped / 0.01) / 5; // 0 to 1
    return Math.round(1 + ratio * (sliderSteps - 1));
  };

  const sliderPosToInductance = (pos) => {
    if (pos <= 0) return 0;
    const ratio = (pos - 1) / (sliderSteps - 1);
    const rawVal = 0.01 * Math.pow(10, 5 * ratio); // 0.01 to 1000 mH

    // Clean rounding based on order of magnitude
    if (rawVal < 0.1) {
      // 0.01 mH (10 µH) to 0.1 mH (100 µH) -> snap to 0.005 mH (5 µH steps)
      return Number((Math.round(rawVal / 0.005) * 0.005).toFixed(3));
    } else if (rawVal < 1) {
      // 0.1 mH to 1 mH -> snap to 0.01 mH (10 µH steps)
      return Number((Math.round(rawVal / 0.01) * 0.01).toFixed(2));
    } else if (rawVal < 10) {
      // 1 mH to 10 mH -> snap to 0.1 mH
      return Number((Math.round(rawVal / 0.1) * 0.1).toFixed(1));
    } else if (rawVal < 100) {
      // 10 mH to 100 mH -> snap to 1 mH
      return Math.round(rawVal);
    } else {
      // 100 mH to 1000 mH -> snap to 5 mH
      return Math.round(rawVal / 5) * 5;
    }
  };

  // Helper string for inductor value readout
  const formatInductanceReadout = () => {
    if (!inductance || inductance <= 0) return '0 mH (Pure R)';
    if (inductance < 1) {
      const uH = Math.round(inductance * 1000);
      return `${uH} µH (${inductance.toFixed(3)} mH)`;
    }
    return `${inductance >= 10 ? inductance.toFixed(1) : inductance.toFixed(2)} mH`;
  };

  return (
    <div className="leftmost-slider-panel" aria-label="Component Parameters">
      {/* Header bar */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h2 className="panel-title">Component & Circuit Parameters</h2>
        </div>
        <button
          onClick={onResetParams}
          className="icon-btn-subtle"
          title="Reset parameters to circuit defaults"
          type="button"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="text-xs">Reset</span>
        </button>
      </div>

      {/* Sliders Grid */}
      <div className="panel-scroll-content">
        {/* 1. THYRISTOR FIRING ANGLE (ALPHA) - Only slider, no discrete buttons */}
        {hasThyristor && (
          <div className="slider-group primary-slider-group">
            <div className="slider-header">
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-purple-400" />
                <label htmlFor="firing-angle-slider" className="slider-label font-bold text-purple-200">
                  Firing Angle (α)
                </label>
              </div>
              <div className="badge-value-highlight">
                <span className="value-number">{firingAngleDeg}°</span>
                <span className="value-sub">({alphaRad} rad)</span>
              </div>
            </div>

            <div className="slider-range-wrapper">
              <input
                id="firing-angle-slider"
                type="range"
                min="0"
                max="180"
                step="1"
                value={firingAngleDeg}
                onChange={(e) => onParamChange('firingAngleDeg', Number(e.target.value))}
                className="custom-range range-purple"
              />
              <div className="slider-ticks">
                <span>0°</span>
                <span>45°</span>
                <span>90°</span>
                <span>135°</span>
                <span>180°</span>
              </div>
            </div>

            {/* Gate Pulse Timing Track */}
            <div className="pulse-track-container" title="Gate Trigger Pulse Timing in 360° AC Cycle">
              <div className="pulse-track-label">
                <span>Gate Trigger (0° - 360°)</span>
                <span>t_pulse = {((firingAngleDeg / 360) * (1000 / frequency)).toFixed(2)} ms</span>
              </div>
              <div className="pulse-bar-bg">
                <div
                  className="pulse-marker"
                  style={{ left: `${(firingAngleDeg / 360) * 100}%` }}
                  title={`Pulse fired at ${firingAngleDeg}°`}
                />
                <div className="pulse-guide-half" style={{ left: '50%' }} />
              </div>
            </div>
          </div>
        )}

        {/* 2. SOURCE VOLTAGE SLIDER - Only slider */}
        <div className="slider-group">
          <div className="slider-header">
            <label htmlFor="voltage-slider" className="slider-label">
              Source Voltage ({sourceType === 'ac' ? 'Vm Peak' : 'Vdc'})
            </label>
            <div className="badge-value">
              <span className="value-number">{voltage} V</span>
              {sourceType === 'ac' && (
                <span className="value-sub">({(voltage / Math.SQRT2).toFixed(1)} Vrms)</span>
              )}
            </div>
          </div>
          <input
            id="voltage-slider"
            type="range"
            min="10"
            max="400"
            step="5"
            value={voltage}
            onChange={(e) => onParamChange('voltage', Number(e.target.value))}
            className="custom-range range-blue"
          />
          <div className="slider-ticks">
            <span>10V</span>
            <span>100V</span>
            <span>230V</span>
            <span>400V</span>
          </div>
        </div>

        {/* 3. AC FREQUENCY SLIDER - Only slider, no 50Hz/60Hz buttons */}
        {sourceType === 'ac' && (
          <div className="slider-group">
            <div className="slider-header">
              <label htmlFor="frequency-slider" className="slider-label">
                AC Frequency (f)
              </label>
              <div className="badge-value">
                <span className="value-number">{frequency} Hz</span>
                <span className="value-sub">(T = {periodMs} ms)</span>
              </div>
            </div>
            <input
              id="frequency-slider"
              type="range"
              min="10"
              max="120"
              step="1"
              value={frequency}
              onChange={(e) => onParamChange('frequency', Number(e.target.value))}
              className="custom-range range-cyan"
            />
            <div className="slider-ticks">
              <span>10Hz</span>
              <span>50Hz</span>
              <span>60Hz</span>
              <span>120Hz</span>
            </div>
          </div>
        )}

        {/* 4. LOAD RESISTANCE SLIDER - Only slider */}
        <div className="slider-group">
          <div className="slider-header">
            <label htmlFor="resistor-slider" className="slider-label">
              Load Resistance (R)
            </label>
            <div className="badge-value">
              <span className="value-number">{resistance} Ω</span>
            </div>
          </div>
          <input
            id="resistor-slider"
            type="range"
            min="1"
            max="200"
            step="1"
            value={resistance}
            onChange={(e) => onParamChange('resistance', Number(e.target.value))}
            className="custom-range range-amber"
          />
          <div className="slider-ticks">
            <span>1Ω</span>
            <span>20Ω</span>
            <span>50Ω</span>
            <span>100Ω</span>
            <span>200Ω</span>
          </div>
        </div>

        {/* 5. WAVEFORM DISPLAY WINDOW SLIDER - Only slider */}
        <div className="slider-group">
          <div className="slider-header">
            <label htmlFor="cycles-slider" className="slider-label">
              Waveform Display Window
            </label>
            <div className="badge-value">
              <span className="value-number">{cycles} Cycles</span>
              <span className="value-sub">({(cycles * (1000 / frequency)).toFixed(0)} ms)</span>
            </div>
          </div>
          <input
            id="cycles-slider"
            type="range"
            min="1"
            max="4"
            step="1"
            value={cycles}
            onChange={(e) => onParamChange('cycles', Number(e.target.value))}
            className="custom-range range-slate"
          />
          <div className="slider-ticks">
            <span>1 Cycle</span>
            <span>2 Cycles</span>
            <span>3 Cycles</span>
            <span>4 Cycles</span>
          </div>
        </div>

        {/* 6. LARGE INDUCTOR SLIDER (10 µH to 1000 mH) - Spans full width, no discrete buttons */}
        <div className="slider-group inductor-slider-group-large">
          <div className="slider-header">
            <div>
              <label htmlFor="inductor-slider" className="slider-label font-bold text-emerald-300">
                Load Inductance (L)
              </label>
              <div className="text-xs text-slate-400 mt-0.5">
                Wide Range Precision: 10 µH to 1000 mH
              </div>
            </div>
            <div className="badge-value flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="1000"
                step="0.01"
                value={inductance}
                onChange={(e) => onParamChange('inductance', Math.max(0, Number(e.target.value)))}
                className="value-input-compact text-emerald-300"
                title="Direct entry in mH (e.g. 0.01 = 10 µH, 50 = 50 mH)"
              />
              <span className="badge-highlight-emerald">
                {formatInductanceReadout()}
              </span>
            </div>
          </div>

          {/* Large Inductor Logarithmic Slider */}
          <div className="slider-range-wrapper-large">
            <input
              id="inductor-slider"
              type="range"
              min="0"
              max={sliderSteps}
              step="1"
              value={inductanceToSliderPos(inductance)}
              onChange={(e) => onParamChange('inductance', sliderPosToInductance(Number(e.target.value)))}
              className="custom-range range-emerald large-inductor-slider"
              title="Drag to select inductance from 10 µH to 1000 mH"
            />
            <div className="slider-ticks slider-ticks-inductor">
              <span>0 (R)</span>
              <span>10 µH</span>
              <span>100 µH</span>
              <span>1 mH</span>
              <span>10 mH</span>
              <span>100 mH</span>
              <span>1000 mH</span>
            </div>
          </div>

          {/* Load RL Electrical Properties Summary */}
          {inductance > 0 && (
            <div className="rl-calc-box mt-3">
              <div className="rl-row">
                <span>Reactance (XL = ωL):</span>
                <strong>{XL < 0.01 ? `${(XL * 1000).toFixed(2)} mΩ` : `${XL.toFixed(2)} Ω`}</strong>
              </div>
              <div className="rl-row">
                <span>Impedance (Z):</span>
                <strong>{Z.toFixed(2)} Ω</strong>
              </div>
              <div className="rl-row">
                <span>Phase Angle (ϕ):</span>
                <strong>{phiDeg.toFixed(2)}°</strong>
              </div>
              <div className="rl-row">
                <span>Time Constant (τ = L/R):</span>
                <strong>
                  {(L_H / resistance) * 1000 < 0.01
                    ? `${((L_H / resistance) * 1e6).toFixed(1)} µs`
                    : `${((L_H / resistance) * 1000).toFixed(3)} ms`}
                </strong>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
