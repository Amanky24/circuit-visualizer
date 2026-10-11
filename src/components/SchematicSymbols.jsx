import React from 'react';

/**
 * Professional Electrical Engineering Schematic Symbols
 * Strictly adhering to IIT Kharagpur Lecture Notes (Prof. Arpan Hota - AC-DC Converters)
 * IEEE / IEC standard circuit diagram symbols without clumsy card boxes.
 */

// Format labels with clean Unicode subscripts (e.g. T1 -> T₁, D4 -> D₄)
function formatSubscriptLabel(rawLabel) {
  if (!rawLabel) return '';
  return rawLabel
    .replace(/1/g, '₁')
    .replace(/2/g, '₂')
    .replace(/3/g, '₃')
    .replace(/4/g, '₄')
    .replace(/5/g, '₅')
    .replace(/6/g, '₆');
}

/**
 * AC Voltage Source Symbol: Circle with centered sine wave
 * Supports horizontal bridge-midpoint orientation matching Image 2 or vertical orientation
 */
export function ACSourceSymbol({
  color = '#38bdf8',
  instantaneousV = 0,
  orientation = 'horizontal',
  label = '230 V · 50 Hz',
  voltage = 230,
}) {
  const r = 24;
  const isHoriz = orientation !== 'vertical';

  return (
    <g className="schematic-symbol ac-source-group select-none">
      {/* Circle Body */}
      <circle
        cx="0"
        cy="0"
        r={r}
        fill="#070c16"
        stroke={color}
        strokeWidth="2.2"
      />
      {/* Centered Sinusoidal Waveform */}
      <path
        d="M -13 0 Q -6.5 -11 0 0 T 13 0"
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Terminal Leads and Annotations */}
      {isHoriz ? (
        <>
          <line x1={-r} y1="0" x2="-32" y2="0" stroke={color} strokeWidth="2.2" />
          <line x1={r} y1="0" x2="32" y2="0" stroke={color} strokeWidth="2.2" />
          {/* Label centered on top matching Image 2: e.g. "100 V pk · 50 Hz" */}
          <text
            x="0"
            y="-32"
            fill="#cbd5e1"
            fontSize="12.5"
            fontWeight="500"
            fontFamily="'Inter', system-ui, sans-serif"
            textAnchor="middle"
          >
            {label || `${voltage} V · 50 Hz`}
          </text>
          {/* Polarity signs beneath leads matching Image 2 */}
          <text
            x="-26"
            y="17"
            fill="#38bdf8"
            fontSize="14"
            fontWeight="bold"
            fontFamily="sans-serif"
            textAnchor="middle"
          >
            +
          </text>
          <text
            x="26"
            y="17"
            fill="#94a3b8"
            fontSize="15"
            fontWeight="bold"
            fontFamily="sans-serif"
            textAnchor="middle"
          >
            −
          </text>
        </>
      ) : (
        <>
          <line x1="0" y1={-r} x2="0" y2="-32" stroke={color} strokeWidth="2.2" />
          <line x1="0" y1={r} x2="0" y2="32" stroke={color} strokeWidth="2.2" />
          {/* Math Label to the Left matching PDF: vs = Vm sin(wt) */}
          <g transform="translate(-32, -4)" className="pointer-events-none">
            <text
              x="0"
              y="0"
              fill="#f1f5f9"
              fontSize="15"
              fontStyle="italic"
              fontFamily="'Times New Roman', Times, serif"
              textAnchor="end"
            >
              v<tspan fontSize="11" dy="3">s</tspan>
            </text>
            <text
              x="0"
              y="18"
              fill="#94a3b8"
              fontSize="12"
              fontStyle="italic"
              fontFamily="'Times New Roman', Times, serif"
              textAnchor="end"
            >
              = V<tspan fontSize="9" dy="2">m</tspan><tspan dy="-2"> sin(ωt)</tspan>
            </text>
          </g>
        </>
      )}
    </g>
  );
}

/**
 * DC Voltage Source Symbol
 */
export function DCSourceSymbol({ color = '#38bdf8', instantaneousV = 0 }) {
  return (
    <g className="schematic-symbol dc-source-group select-none">
      <line x1="0" y1="-32" x2="0" y2="-10" stroke={color} strokeWidth="2.2" />
      {/* Positive plate (longer, thinner) */}
      <line x1="-18" y1="-10" x2="18" y2="-10" stroke={color} strokeWidth="3" strokeLinecap="round" />
      {/* Negative plate (shorter, thicker) */}
      <line x1="-11" y1="10" x2="11" y2="10" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
      <line x1="0" y1="10" x2="0" y2="32" stroke={color} strokeWidth="2.2" />

      <text x="22" y="-7" fill="#38bdf8" fontSize="13" fontWeight="bold" fontFamily="sans-serif">+</text>
      <text x="18" y="14" fill="#94a3b8" fontSize="14" fontWeight="bold" fontFamily="sans-serif">−</text>
      <text
        x="-24"
        y="4"
        fill="#f1f5f9"
        fontSize="14"
        fontStyle="italic"
        fontFamily="'Times New Roman', Times, serif"
        textAnchor="end"
      >
        V<tspan fontSize="10" dy="2">dc</tspan>
      </text>
    </g>
  );
}

/**
 * Standard Thyristor (SCR) Symbol:
 * Strictly matching textbook electrical schematics (Image 2).
 * Pointing UP: Anode at bottom (0, 32), Cathode at top (0, -32).
 * Supports labelSide: 'left' (for Leg 1) or 'right' (for Leg 2).
 */
export function ThyristorSymbol({
  label = 'T1',
  labelSide = 'right',
  isOn = false,
  isConducting = false,
  isHovered = false,
}) {
  const active = isOn || isConducting;
  const mainColor = active ? '#10b981' : isHovered ? '#38bdf8' : '#e2e8f0';
  const fillColor = active ? '#10b981' : '#070c16';
  const opacity = 1;
  const prettyLabel = formatSubscriptLabel(label);

  return (
    <g className="schematic-symbol thyristor-symbol select-none" opacity={opacity}>
      {/* Anode lead from bottom terminal (0, 32) to triangle base (0, 10) */}
      <line x1="0" y1="32" x2="0" y2="10" stroke={mainColor} strokeWidth="2.2" />

      {/* SCR Triangle (pointing UP toward cathode) */}
      <polygon
        points="-13,10 13,10 0,-10"
        fill={fillColor}
        stroke={mainColor}
        strokeWidth="2.4"
        strokeLinejoin="round"
        filter={active ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.7))' : undefined}
      />

      {/* Cathode horizontal bar across tip */}
      <line
        x1="-14"
        y1="-10"
        x2="14"
        y2="-10"
        stroke={mainColor}
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Cathode lead to top terminal (0, -32) */}
      <line x1="0" y1="-10" x2="0" y2="-32" stroke={mainColor} strokeWidth="2.2" />

      {/* Gate lead: Gold/amber angled gate line matching Image 2 */}
      <line
        x1="6"
        y1="-6"
        x2="18"
        y2="-18"
        stroke={active ? '#34d399' : '#f59e0b'}
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Symbol Label in textbook serif italic (e.g. T₁, T₂, T₃, T₄) */}
      {labelSide === 'left' ? (
        <text
          x="-20"
          y="3"
          fill={active ? '#34d399' : '#cbd5e1'}
          fontSize="16"
          fontWeight="bold"
          fontStyle="italic"
          fontFamily="'Times New Roman', Times, serif"
          textAnchor="end"
          filter={active ? 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))' : undefined}
        >
          {prettyLabel}
        </text>
      ) : (
        <text
          x="20"
          y="3"
          fill={active ? '#34d399' : '#cbd5e1'}
          fontSize="16"
          fontWeight="bold"
          fontStyle="italic"
          fontFamily="'Times New Roman', Times, serif"
          textAnchor="start"
          filter={active ? 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))' : undefined}
        >
          {prettyLabel}
        </text>
      )}
    </g>
  );
}

/**
 * Standard Semiconductor Diode Symbol:
 * Strictly matching textbook electrical schematics (Image 2).
 * Pointing UP: Anode at bottom (0, 32), Cathode at top (0, -32).
 * Supports labelSide: 'left' (for Leg 1) or 'right' (for Leg 2).
 */
export function DiodeSymbol({
  label = 'D1',
  labelSide = 'right',
  isOn = false,
  isConducting = false,
  isHovered = false,
}) {
  const active = isOn || isConducting;
  const mainColor = active ? '#10b981' : isHovered ? '#38bdf8' : '#e2e8f0';
  const fillColor = active ? '#10b981' : '#070c16';
  const opacity = 1;
  const prettyLabel = formatSubscriptLabel(label);

  return (
    <g className="schematic-symbol diode-symbol select-none" opacity={opacity}>
      {/* Anode lead from bottom terminal */}
      <line x1="0" y1="32" x2="0" y2="10" stroke={mainColor} strokeWidth="2.2" />

      {/* Diode Triangle (pointing UP toward cathode) */}
      <polygon
        points="-13,10 13,10 0,-10"
        fill={fillColor}
        stroke={mainColor}
        strokeWidth="2.4"
        strokeLinejoin="round"
        filter={active ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.7))' : undefined}
      />

      {/* Cathode horizontal bar across tip */}
      <line
        x1="-14"
        y1="-10"
        x2="14"
        y2="-10"
        stroke={mainColor}
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Cathode lead to top terminal */}
      <line x1="0" y1="-10" x2="0" y2="-32" stroke={mainColor} strokeWidth="2.2" />

      {/* Symbol Label */}
      {labelSide === 'left' ? (
        <text
          x="-20"
          y="3"
          fill={active ? '#34d399' : '#cbd5e1'}
          fontSize="16"
          fontWeight="bold"
          fontStyle="italic"
          fontFamily="'Times New Roman', Times, serif"
          textAnchor="end"
          filter={active ? 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))' : undefined}
        >
          {prettyLabel}
        </text>
      ) : (
        <text
          x="20"
          y="3"
          fill={active ? '#34d399' : '#cbd5e1'}
          fontSize="16"
          fontWeight="bold"
          fontStyle="italic"
          fontFamily="'Times New Roman', Times, serif"
          textAnchor="start"
          filter={active ? 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))' : undefined}
        >
          {prettyLabel}
        </text>
      )}
    </g>
  );
}

/**
 * Standard Resistor Symbol (Vertical Zigzag)
 * Matches Slide 2, 7, 10, 13, 22, 25 of Prof. Arpan Hota's slides.
 */
export function ResistorSymbol({ color = '#f59e0b', label, isConducting = false }) {
  const activeColor = isConducting ? '#fbbf24' : color;
  return (
    <g className="schematic-symbol resistor-symbol select-none">
      {/* Top terminal lead */}
      <line x1="0" y1="-32" x2="0" y2="-22" stroke={activeColor} strokeWidth="2.2" />

      {/* Sharp, crisp vertical zigzag matching textbook schematics */}
      <path
        d="M 0 -22 L 9 -17 L -9 -9 L 9 -1 L -9 7 L 9 15 L -9 20 L 0 22"
        fill="none"
        stroke={activeColor}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={isConducting ? 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))' : undefined}
      />

      {/* Bottom terminal lead */}
      <line x1="0" y1="22" x2="0" y2="32" stroke={activeColor} strokeWidth="2.2" />

      {/* Textbook Math Label on the right (R or R₁) */}
      <g transform="translate(16, 0)">
        <text
          x="0"
          y="-2"
          fill="#f8fafc"
          fontSize="17"
          fontStyle="italic"
          fontWeight="bold"
          fontFamily="'Times New Roman', Times, serif"
        >
          R
        </text>
        {label && label.includes('Ω') && (
          <text
            x="0"
            y="14"
            fill="#94a3b8"
            fontSize="10"
            fontFamily="monospace"
          >
            {label.match(/\((.*?)\)/)?.[1] || label}
          </text>
        )}
      </g>
    </g>
  );
}

/**
 * Standard Inductor Symbol (Vertical Curved Loops)
 * Matches Slide 7, 10, 13, 22, 25 of Prof. Arpan Hota's slides.
 */
export function InductorSymbol({ color = '#10b981', label, isConducting = false }) {
  const activeColor = isConducting ? '#34d399' : color;
  return (
    <g className="schematic-symbol inductor-symbol select-none">
      {/* Top terminal lead */}
      <line x1="0" y1="-32" x2="0" y2="-22" stroke={activeColor} strokeWidth="2.2" />

      {/* 4 graceful curved helical loops arching outwards to the right */}
      <path
        d="M 0 -22 C 14 -22, 14 -11, 0 -11 C 14 -11, 14 0, 0 0 C 14 0, 14 11, 0 11 C 14 11, 14 22, 0 22"
        fill="none"
        stroke={activeColor}
        strokeWidth="2.6"
        strokeLinecap="round"
        filter={isConducting ? 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.5))' : undefined}
      />

      {/* Bottom terminal lead */}
      <line x1="0" y1="22" x2="0" y2="32" stroke={activeColor} strokeWidth="2.2" />

      {/* Textbook Math Label on the right (L) */}
      <g transform="translate(18, 0)">
        <text
          x="0"
          y="-2"
          fill="#f8fafc"
          fontSize="17"
          fontStyle="italic"
          fontWeight="bold"
          fontFamily="'Times New Roman', Times, serif"
        >
          L
        </text>
        {label && label.includes('H') && (
          <text
            x="0"
            y="14"
            fill="#94a3b8"
            fontSize="10"
            fontFamily="monospace"
          >
            {label.match(/\((.*?)\)/)?.[1] || label}
          </text>
        )}
      </g>
    </g>
  );
}

/**
 * Ground Symbol: 3 horizontal bars
 */
export function GroundSymbol({ color = '#94a3b8' }) {
  return (
    <g className="schematic-symbol ground-symbol select-none">
      <line x1="0" y1="-20" x2="0" y2="0" stroke={color} strokeWidth="2.2" />
      <line x1="-16" y1="0" x2="16" y2="0" stroke={color} strokeWidth="2.6" strokeLinecap="round" />
      <line x1="-10" y1="6" x2="10" y2="6" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <line x1="-4" y1="12" x2="4" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </g>
  );
}

/**
 * Freewheeling Diode (FWD) Symbol:
 * Strictly matching Image 2.
 * Connected anti-parallel across load (Cathode at top, Anode at bottom).
 * Displays clean bold "FWD" label on the right.
 * Tapping toggles between active (solid connected) and inactive (dashed disconnected).
 */
export function FreewheelingDiodeSymbol({
  label = 'FWD',
  isActive = false,
  isConducting = false,
  isHovered = false,
}) {
  const active = isActive;
  const carrying = active && isConducting;
  const mainColor = carrying ? '#10b981' : active ? '#38bdf8' : isHovered ? '#7dd3fc' : '#94a3b8';
  const fillColor = carrying ? '#10b981' : active ? 'rgba(56, 189, 248, 0.25)' : isHovered ? 'rgba(56, 189, 248, 0.12)' : '#070c16';
  const strokeDash = active ? 'none' : '4,3';
  const opacity = active ? 1 : isHovered ? 0.85 : 0.6;

  return (
    <g
      className="schematic-symbol freewheeling-diode-symbol select-none cursor-pointer"
      opacity={opacity}
      title={active ? 'Freewheeling Diode: Connected (Tap to remove from circuit)' : 'Freewheeling Diode: Disconnected (Tap to add to circuit)'}
    >
      {/* Generous invisible click hotspot for easy tapping */}
      <rect
        x="-30"
        y="-36"
        width="60"
        height="72"
        fill="rgba(0, 0, 0, 0.001)"
        pointerEvents="all"
        style={{ cursor: 'pointer' }}
      />

      {/* Anode lead from bottom terminal */}
      <line x1="0" y1="32" x2="0" y2="10" stroke={mainColor} strokeWidth="2.2" strokeDasharray={strokeDash} />

      {/* Diode Triangle (pointing UP toward cathode) strictly matching Image 2 */}
      <polygon
        points="-13,10 13,10 0,-10"
        fill={fillColor}
        stroke={mainColor}
        strokeWidth="2.4"
        strokeLinejoin="round"
        strokeDasharray={strokeDash}
        filter={carrying ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.8))' : active ? 'drop-shadow(0 0 5px rgba(56, 189, 248, 0.5))' : undefined}
      />

      {/* Cathode horizontal bar across tip */}
      <line
        x1="-14"
        y1="-10"
        x2="14"
        y2="-10"
        stroke={mainColor}
        strokeWidth="2.8"
        strokeLinecap="round"
      />

      {/* Cathode lead to top terminal */}
      <line x1="0" y1="-10" x2="0" y2="-32" stroke={mainColor} strokeWidth="2.2" strokeDasharray={strokeDash} />

      {/* Crisp textbook "FWD" label strictly matching Image 2 */}
      <text
        x="20"
        y="4"
        fill={carrying ? '#34d399' : active ? '#38bdf8' : '#94a3b8'}
        fontSize="14"
        fontWeight="bold"
        fontFamily="system-ui, sans-serif"
        textAnchor="start"
      >
        FWD
      </text>
    </g>
  );
}

/**
 * Three-Phase AC Voltage Source Symbol:
 * Balanced 3-phase source (Phases A, B, C) with 120 deg displacements.
 */
export function ThreePhaseSourceSymbol({ color = '#38bdf8', label }) {
  const r = 26;
  return (
    <g className="schematic-symbol three-phase-source-group select-none">
      {/* Circle Body */}
      <circle cx="0" cy="0" r={r} fill="#070c16" stroke={color} strokeWidth="2.2" />

      {/* 3 Interlocking Sine Waves */}
      <path d="M -12 -7 Q -6 -16 0 -7 T 12 -7" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M -12 0 Q -6 -9 0 0 T 12 0" fill="none" stroke="#eab308" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M -12 7 Q -6 -2 0 7 T 12 7" fill="none" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" />

      {/* Phase Output Leads (snapped to 20px grid at (30, -20), (30, 0), (30, 20)) */}
      {/* Phase A (Red) */}
      <line x1={r - 4} y1="-15" x2="30" y2="-20" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="30" cy="-20" r="2.5" fill="#ef4444" />
      <text x="35" y="-18" fill="#ef4444" fontSize="11" fontWeight="bold" fontFamily="sans-serif">A</text>

      {/* Phase B (Yellow) */}
      <line x1={r} y1="0" x2="30" y2="0" stroke="#eab308" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="30" cy="0" r="2.5" fill="#eab308" />
      <text x="35" y="4" fill="#eab308" fontSize="11" fontWeight="bold" fontFamily="sans-serif">B</text>

      {/* Phase C (Blue) */}
      <line x1={r - 4} y1="15" x2="30" y2="20" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="30" cy="20" r="2.5" fill="#3b82f6" />
      <text x="35" y="24" fill="#3b82f6" fontSize="11" fontWeight="bold" fontFamily="sans-serif">C</text>

      {/* Label on left: 3~ 400V */}
      <g transform="translate(-30, -3)" className="pointer-events-none">
        <text x="0" y="0" fill="#f1f5f9" fontSize="13" fontStyle="italic" fontFamily="'Times New Roman', Times, serif" textAnchor="end">
          3~
        </text>
        <text x="0" y="14" fill="#94a3b8" fontSize="10" fontFamily="sans-serif" textAnchor="end">
          400V LL
        </text>
      </g>
    </g>
  );
}

/**
 * Unified Component Symbol Dispatcher
 */
export function renderComponentSymbol(type, color = '#38bdf8', props = {}) {
  switch (type) {
    case 'ac_source':
      return (
        <ACSourceSymbol
          color={color}
          instantaneousV={props.voltage}
          orientation={props.orientation || 'horizontal'}
          label={props.label}
          voltage={props.voltage}
        />
      );
    case 'three_phase_source':
      return <ThreePhaseSourceSymbol color={color} label={props.label} />;
    case 'dc_source':
      return <DCSourceSymbol color={color} instantaneousV={props.voltage} />;
    case 'resistor':
      return <ResistorSymbol color="#f59e0b" label={props.label} isConducting={props.isConducting} />;
    case 'inductor':
      return <InductorSymbol color="#10b981" label={props.label} isConducting={props.isConducting} />;
    case 'thyristor':
      return (
        <ThyristorSymbol
          label={props.label || 'T1'}
          labelSide={props.labelSide || 'right'}
          isOn={props.isOn}
          isConducting={props.isConducting}
        />
      );
    case 'diode':
      return (
        <DiodeSymbol
          label={props.label || 'D1'}
          labelSide={props.labelSide || 'right'}
          isOn={props.isOn}
          isConducting={props.isConducting}
        />
      );
    case 'freewheeling_diode':
      return (
        <FreewheelingDiodeSymbol
          label={props.label || 'FWD'}
          isActive={props.isActive}
          isConducting={props.isConducting}
          isHovered={props.isHovered}
        />
      );
    case 'ground':
      return <GroundSymbol color={color} />;
    default:
      return null;
  }
}

