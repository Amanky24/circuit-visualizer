import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { COMPONENT_CATALOG } from '../constants/components';
import { renderComponentSymbol } from './SchematicSymbols';

/**
 * Clean, Icon-Only Component Palette
 * Displays symbols only; shows rich name and details on hover
 */
export function PaletteSymbol({ type }) {
  switch (type) {
    case 'ac_source':
      return (
        <svg viewBox="-26 -26 52 52" className="palette-icon-svg">
          <circle cx="0" cy="0" r="18" fill="#0b1220" stroke="#38bdf8" strokeWidth="2" />
          <path d="M -10 0 Q -5 -9 0 0 T 10 0" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
          <line x1="0" y1="-18" x2="0" y2="-25" stroke="#38bdf8" strokeWidth="1.8" />
          <line x1="0" y1="18" x2="0" y2="25" stroke="#38bdf8" strokeWidth="1.8" />
        </svg>
      );
    case 'dc_source':
      return (
        <svg viewBox="-26 -26 52 52" className="palette-icon-svg">
          <line x1="0" y1="-24" x2="0" y2="-8" stroke="#38bdf8" strokeWidth="1.8" />
          <line x1="-14" y1="-8" x2="14" y2="-8" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="-8" y1="8" x2="8" y2="8" stroke="#38bdf8" strokeWidth="3.5" strokeLinecap="round" />
          <line x1="0" y1="8" x2="0" y2="24" stroke="#38bdf8" strokeWidth="1.8" />
        </svg>
      );
    case 'thyristor':
      return (
        <svg viewBox="-26 -26 52 52" className="palette-icon-svg">
          {/* Anode lead from bottom */}
          <line x1="0" y1="22" x2="0" y2="8" stroke="#c084fc" strokeWidth="1.8" />
          {/* Triangle pointing UP */}
          <polygon points="-11,8 11,8 0,-8" fill="#0b1220" stroke="#c084fc" strokeWidth="2" strokeLinejoin="round" />
          {/* Cathode horizontal bar */}
          <line x1="-11" y1="-8" x2="11" y2="-8" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" />
          {/* Cathode lead to top */}
          <line x1="0" y1="-8" x2="0" y2="-22" stroke="#c084fc" strokeWidth="1.8" />
          {/* Gate angled lead */}
          <path d="M -11 -4 L -18 3" fill="none" stroke="#e879f9" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="-18" cy="3" r="1.8" fill="#e879f9" />
        </svg>
      );
    case 'diode':
      return (
        <svg viewBox="-26 -26 52 52" className="palette-icon-svg">
          <line x1="0" y1="22" x2="0" y2="8" stroke="#f472b6" strokeWidth="1.8" />
          <polygon points="-11,8 11,8 0,-8" fill="#0b1220" stroke="#f472b6" strokeWidth="2" strokeLinejoin="round" />
          <line x1="-11" y1="-8" x2="11" y2="-8" stroke="#f472b6" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="0" y1="-8" x2="0" y2="-22" stroke="#f472b6" strokeWidth="1.8" />
        </svg>
      );
    case 'resistor':
      return (
        <svg viewBox="-26 -26 52 52" className="palette-icon-svg">
          <line x1="0" y1="-22" x2="0" y2="-14" stroke="#f59e0b" strokeWidth="1.8" />
          <path d="M 0 -14 L -7 -10 L 7 -5 L -7 0 L 7 5 L -7 10 L 0 14" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="0" y1="14" x2="0" y2="22" stroke="#f59e0b" strokeWidth="1.8" />
        </svg>
      );
    case 'inductor':
      return (
        <svg viewBox="-26 -26 52 52" className="palette-icon-svg">
          <line x1="0" y1="-22" x2="0" y2="-16" stroke="#10b981" strokeWidth="1.8" />
          <path d="M 0 -16 C 8 -16 8 -8 0 -8 C 8 -8 8 0 0 0 C 8 0 8 8 0 8 C 8 8 8 16 0 16" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="0" y1="16" x2="0" y2="22" stroke="#10b981" strokeWidth="1.8" />
        </svg>
      );
    case 'ground':
      return (
        <svg viewBox="-26 -26 52 52" className="palette-icon-svg">
          <line x1="0" y1="-16" x2="0" y2="2" stroke="#94a3b8" strokeWidth="2" />
          <line x1="-14" y1="2" x2="14" y2="2" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="-9" y1="7" x2="9" y2="7" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <line x1="-4" y1="12" x2="4" y2="12" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'freewheeling_diode':
      return (
        <svg viewBox="-26 -26 52 52" className="palette-icon-svg">
          <line x1="0" y1="22" x2="0" y2="8" stroke="#10b981" strokeWidth="1.8" />
          <polygon points="-11,8 11,8 0,-8" fill="#0b1220" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />
          <line x1="-11" y1="-8" x2="11" y2="-8" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="0" y1="-8" x2="0" y2="-22" stroke="#10b981" strokeWidth="1.8" />
        </svg>
      );
    default:
      return null;
  }
}

export default function ComponentPalette({
  onAddComponent,
  showConductionEffect = true,
  onToggleGlow,
}) {
  const [hoveredComp, setHoveredComp] = useState(null);

  const handleDragStart = (e, comp) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: comp.type }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const paletteItems = COMPONENT_CATALOG.filter(
    (c) => c.type !== 'three_phase_source' && c.type !== 'freewheeling_diode'
  );

  return (
    <div className="component-palette-compact" aria-label="Component Palette">
      <div className="palette-left-section">
        <div className="palette-compact-label">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Components:</span>
        </div>

        <div className="palette-tiles-row">
          {paletteItems.map((comp) => {
            const isHovered = hoveredComp === comp.type;

            return (
              <div
                key={comp.type}
                className="palette-tile-wrapper"
                onMouseEnter={() => setHoveredComp(comp.type)}
                onMouseLeave={() => setHoveredComp(null)}
              >
                <button
                  type="button"
                  className={`palette-icon-tile ${isHovered ? 'tile-hover' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, comp)}
                  onClick={() => onAddComponent(comp.type)}
                  aria-label={comp.name}
                >
                  <PaletteSymbol type={comp.type} />
                  <span className="tile-plus-badge">+</span>
                </button>

                {/* Tooltip on Hover */}
                {isHovered && (
                  <div className="palette-tooltip">
                    <div className="tooltip-title">{comp.name}</div>
                    <div className="tooltip-desc">{comp.category} • Click to add or drag</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Conduction Glow ON / OFF Toggle Button on the Right */}
      <div className="palette-glow-container">
        <button
          type="button"
          className={`btn-palette-glow ${showConductionEffect ? 'active' : ''}`}
          onClick={onToggleGlow}
          title={showConductionEffect ? 'Disable wire conduction animation' : 'Enable wire conduction animation'}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Glow: <strong>{showConductionEffect ? 'ON' : 'OFF'}</strong></span>
        </button>
      </div>
    </div>
  );
}
