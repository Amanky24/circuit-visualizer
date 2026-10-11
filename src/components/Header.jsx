import React from 'react';
import { CIRCUIT_PRESETS } from '../constants/components';
import { Zap, Play, Square, Sun, Moon, RotateCcw, Sparkles } from 'lucide-react';

export default function Header({
  selectedPresetId,
  onSelectPreset,
  isSimulating,
  onToggleSimulation,
  theme = 'dark',
  onToggleTheme,
  onResetCanvas,
}) {
  const fullWavePresets = CIRCUIT_PRESETS.filter((p) => p.category === 'Full-Wave');
  const threePhasePresets = CIRCUIT_PRESETS.filter((p) => p.category === 'Three-Phase');
  const halfWavePresets = CIRCUIT_PRESETS.filter((p) => p.category === 'Half-Wave');
  const otherPresets = CIRCUIT_PRESETS.filter((p) => p.category === 'AC/DC Linear');

  return (
    <header className="app-header">
      {/* Brand */}
      <div className="header-brand">
        <div className="brand-icon-box">
          <Zap className="w-5 h-5 text-amber-400" />
        </div>
        <div className="brand-text">
          <h1 className="brand-title">CircuitFlow</h1>
          <span className="brand-tag">Aman Kumar Yadav 24EE10034</span>
        </div>
      </div>

      {/* Center Circuit Presets Loader */}
      <div className="header-center">
        <div className="preset-selector-wrapper">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <label htmlFor="circuit-presets-select" className="sr-only">Choose Circuit Preset</label>
          <select
            id="circuit-presets-select"
            className="preset-select"
            value={selectedPresetId || ''}
            onChange={(e) => onSelectPreset(e.target.value)}
          >
            <option value="" disabled>Load Standard Circuit Preset...</option>
            <optgroup label="Three-Phase Converters (6-Pulse)">
              {threePhasePresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Full-Wave Rectifiers (Bridge)">
              {fullWavePresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Half-Wave Rectifiers">
              {halfWavePresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Linear & Transient Circuits">
              {otherPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <button
          onClick={onResetCanvas}
          className="btn-header-secondary"
          title="Reset circuit to default preset"
          type="button"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Right Controls */}
      <div className="header-right">
        {/* Dark / Light Mode Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="btn-header-theme"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          type="button"
          aria-label="Toggle Dark and Light Mode"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        {/* Start / Stop Simulation master button */}
        <button
          onClick={onToggleSimulation}
          className={`btn-header-sim ${isSimulating ? 'sim-running' : 'sim-ready'}`}
          type="button"
        >
          {isSimulating ? (
            <>
              <Square className="w-4 h-4 fill-current text-rose-300" />
              <span>Stop Simulation</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current text-emerald-300" />
              <span>Start Simulation</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
