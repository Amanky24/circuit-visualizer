import React, { useState, useRef, useEffect, useMemo } from 'react';
import { COMPONENT_CATALOG } from '../constants/components';
import { renderComponentSymbol } from './SchematicSymbols';
import { Zap, Sparkles } from 'lucide-react';

export default function CircuitCanvas({
  components,
  wires,
  selectedCompId,
  onSelectComponent,
  onUpdateComponentPosition,
  onRotateComponent,
  onDeleteComponent,
  onAddComponentAt,
  onAddWire,
  onDeleteWire,
  onClearCanvas,
  onLoadPreset,
  circuitValidation,
  isSimulating,
  simulationResult,
  activeAngleDeg,
  onAngleChange,
  showConductionEffect = true,
  onToggleFreewheeling,
  isFreewheelingActive = false,
}) {
  const svgRef = useRef(null);
  const [draggingCompId, setDraggingCompId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [wiringStart, setWiringStart] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredWireId, setHoveredWireId] = useState(null);
  const [hoveredCompId, setHoveredCompId] = useState(null);

  // Animation playback state
  const [isPlaybackActive, setIsPlaybackActive] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Auto-cycle phase angle during live playback
  useEffect(() => {
    if (!isSimulating || !isPlaybackActive) return;
    const interval = setInterval(() => {
      onAngleChange((prev) => (prev + 3 * playbackSpeed) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [isSimulating, isPlaybackActive, playbackSpeed, onAngleChange]);

  const snapToGrid = (val, step = 10) => Math.round(val / step) * step;

  const getSvgCoordinates = (e) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    try {
      const pt = svgRef.current.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = svgRef.current.getScreenCTM();
      if (ctm) {
        const transformed = pt.matrixTransform(ctm.inverse());
        return { x: Math.round(transformed.x), y: Math.round(transformed.y) };
      }
    } catch (err) {
      // fallback to clientRect
    }
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedCompId) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        onRotateComponent(selectedCompId);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteComponent(selectedCompId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCompId, onRotateComponent, onDeleteComponent]);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data && data.type) {
        const coords = getSvgCoordinates(e);
        const x = snapToGrid(Math.max(60, Math.min(660, coords.x)));
        const y = snapToGrid(Math.max(60, Math.min(400, coords.y)));
        onAddComponentAt(data.type, x, y);
      }
    } catch (err) {
      console.error('Failed to drop component', err);
    }
  };

  const handleCompMouseDown = (e, comp) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (comp.type === 'freewheeling_diode') {
      // Do not toggle or drag on mousedown: onClick handles the tap toggle exclusively
      return;
    }
    onSelectComponent(comp.id);
    const coords = getSvgCoordinates(e);
    setDraggingCompId(comp.id);
    setDragOffset({
      x: coords.x - comp.x,
      y: coords.y - comp.y,
    });
  };

  const handleCanvasMouseMove = (e) => {
    const coords = getSvgCoordinates(e);
    setMousePos(coords);

    if (draggingCompId) {
      const newX = snapToGrid(Math.max(40, Math.min(700, coords.x - dragOffset.x)));
      const newY = snapToGrid(Math.max(40, Math.min(420, coords.y - dragOffset.y)));
      onUpdateComponentPosition(draggingCompId, newX, newY);
    }
  };

  const handleCanvasMouseUp = () => {
    if (draggingCompId) setDraggingCompId(null);
  };

  const handlePinClick = (e, comp, pin) => {
    e.stopPropagation();
    const pinPos = getAbsolutePinPosition(comp, pin);

    if (!wiringStart) {
      setWiringStart({
        compId: comp.id,
        pinId: pin.id,
        x: pinPos.x,
        y: pinPos.y,
      });
    } else {
      if (wiringStart.compId === comp.id && wiringStart.pinId === pin.id) {
        setWiringStart(null);
        return;
      }
      onAddWire({
        fromComp: wiringStart.compId,
        fromPin: wiringStart.pinId,
        toComp: comp.id,
        toPin: pin.id,
      });
      setWiringStart(null);
    }
  };

  const getComponentTerminals = (comp) => {
    if (comp.type === 'ac_source' && comp.props?.orientation !== 'vertical') {
      return [
        { id: 'p1', label: 'Phase A', x: -32, y: 0 },
        { id: 'p2', label: 'Neutral (N)', x: 32, y: 0 },
      ];
    }
    const catalogItem = COMPONENT_CATALOG.find((c) => c.type === comp.type);
    return catalogItem?.terminals || [];
  };

  const getAbsolutePinPosition = (comp, pin) => {
    const rad = ((comp.rotation || 0) * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rx = pin.x * cos - pin.y * sin;
    const ry = pin.x * sin + pin.y * cos;
    return {
      x: comp.x + rx,
      y: comp.y + ry,
    };
  };

  const getWirePoint = (compId, pinId) => {
    const comp = components.find((c) => c.id === compId);
    if (!comp) return { x: 0, y: 0 };
    const terminals = getComponentTerminals(comp);
    const pin = terminals.find((p) => p.id === pinId);
    if (!pin) return { x: comp.x, y: comp.y };
    return getAbsolutePinPosition(comp, pin);
  };

  /**
   * Unified Single Source of Truth for Wire Routing:
   * Returns exact waypoints [W0, W1, ... Wk] for clean Manhattan orthogonal routing.
   */
  const getWireWaypoints = (p1, p2) => {
    const dx = Math.abs(p2.x - p1.x);
    const dy = Math.abs(p2.y - p1.y);

    if (dy < 4) return [p1, { x: p2.x, y: p1.y }];
    if (dx < 4) return [p1, { x: p1.x, y: p2.y }];

    // Clean 90-degree orthogonal corner (horizontal-first: p1 -> (p2.x, p1.y) -> p2)
    return [p1, { x: p2.x, y: p1.y }, p2];
  };

  /**
   * Resolves explicit wire waypoints if preset defines them, else calculates Manhattan route
   */
  const getResolvedWireWaypoints = (wire) => {
    if (wire.waypoints && wire.waypoints.length >= 2) {
      return wire.waypoints;
    }
    const p1 = getWirePoint(wire.fromComp, wire.fromPin);
    const p2 = getWirePoint(wire.toComp, wire.toPin);
    return getWireWaypoints(p1, p2);
  };

  /**
   * Convert waypoints into SVG path string
   */
  const waypointsToPath = (points) => {
    if (!points || points.length === 0) return '';
    return points
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`)
      .join(' ');
  };

  /**
   * Generate evenly spaced dots along the EXACT same waypoints.
   * Every single dot is mathematically guaranteed to lie strictly on the wire centerline!
   */
  const getWireDotsFromWaypoints = (points, spacing = 22) => {
    const dots = [];
    if (!points || points.length < 2) return dots;

    for (let s = 0; s < points.length - 1; s++) {
      const start = points[s];
      const end = points[s + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);

      if (segLen < 12) continue;

      const count = Math.max(1, Math.round(segLen / spacing));
      for (let i = 1; i < count; i++) {
        const t = i / count;
        dots.push({
          x: Math.round(start.x + t * dx),
          y: Math.round(start.y + t * dy),
        });
      }
    }
    return dots;
  };

  /**
   * Determine instantaneous conduction state at activeAngleDeg
   */
  const instantaneousState = useMemo(() => {
    if (!isSimulating || !simulationResult) {
      return { isConducting: false, activePath: 'none', currentVal: 0, vsVal: 0, voVal: 0 };
    }

    const { angles, io, vs, vo, conductionStates } = simulationResult;
    let closestIdx = 0;
    let minDiff = 360;
    for (let i = 0; i < angles.length; i++) {
      const diff = Math.abs(angles[i] - activeAngleDeg);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    const currentVal = io[closestIdx] || 0;
    const vsVal = vs[closestIdx] || 0;
    const voVal = vo[closestIdx] || 0;
    const activePath = conductionStates ? conductionStates[closestIdx] : 'none';
    const isConducting = Math.abs(currentVal) > 0.05;

    return { isConducting, activePath, currentVal, vsVal, voVal, angle: activeAngleDeg };
  }, [isSimulating, simulationResult, activeAngleDeg]);

  /**
   * Check if a specific wire is actively conducting
   */
  /**
   * Check if a specific wire is actively conducting
   */
  const checkWireConducting = (wire) => {
    if (!isSimulating || !showConductionEffect || !instantaneousState.isConducting) {
      return false;
    }
    const { activePath } = instantaneousState;

    if (activePath === 'path_fwd') {
      // During freewheeling, only FWD and load loop wires conduct (source and main switches are OFF)
      return (
        wire.id.includes('load') ||
        wire.id.includes('fwd') ||
        wire.id === 'w2b' ||
        wire.id === 'w3' ||
        wire.id === 'w4'
      );
    }

    if (wire.pathRole === 'path_always') return true;

    // Three-phase specific phase feed wires
    if (wire.id === 'w_pa' || wire.id === 'w_la_mid') {
      return activePath.includes('1') || activePath.includes('4');
    }
    if (wire.id === 'w_pb' || wire.id === 'w_lb_mid') {
      return activePath.includes('3') || activePath.includes('6');
    }
    if (wire.id === 'w_pc' || wire.id === 'w_lc_mid') {
      return activePath.includes('5') || activePath.includes('2');
    }

    if (wire.pathRole === 'path1') {
      return (
        activePath === 'path_t1_t4' ||
        activePath === 'path_t1_t2' ||
        activePath === 'path_d1_d4' ||
        activePath === 'path_d1_d2' ||
        activePath.startsWith('path_t1') ||
        activePath.startsWith('path_d1') ||
        activePath === 'path_half_wave' ||
        activePath === 'path_ac_linear'
      );
    }
    if (wire.pathRole === 'path2') {
      return (
        activePath === 'path_t3_t2' ||
        activePath === 'path_t3_t4' ||
        activePath === 'path_d3_d2' ||
        activePath === 'path_d3_d4' ||
        activePath.startsWith('path_t3') ||
        activePath.startsWith('path_d3') ||
        activePath === 'path_ac_linear'
      );
    }
    return false;
  };

  /**
   * Check if a switch card (T1-T6, D1-D6, FWD) is ON right now
   */
  const checkSwitchOn = (comp) => {
    if (comp.type === 'freewheeling_diode') {
      return isFreewheelingActive && instantaneousState.activePath === 'path_fwd';
    }
    if (!isSimulating || !instantaneousState.isConducting) return false;
    const { activePath } = instantaneousState;
    if (activePath === 'path_fwd') return false; // Main switches OFF while freewheeling

    const labelUpper = (comp.props?.label || '').toUpperCase();
    const tagMatch = labelUpper.match(/([TD]\d)/);
    if (tagMatch) {
      const tagLower = tagMatch[1].toLowerCase();
      if (activePath.includes(tagLower)) return true;
    }

    if (activePath === 'path_t1_t4' || activePath === 'path_t1_t2') {
      return labelUpper.includes('T1') || labelUpper.includes('T4') || (activePath === 'path_t1_t2' && labelUpper.includes('T2'));
    }
    if (activePath === 'path_t3_t2' || activePath === 'path_t3_t4') {
      return labelUpper.includes('T3') || labelUpper.includes('T2') || (activePath === 'path_t3_t4' && labelUpper.includes('T4'));
    }
    if (activePath === 'path_d1_d4' || activePath === 'path_d1_d2') {
      return labelUpper.includes('D1') || labelUpper.includes('D4') || (activePath === 'path_d1_d2' && labelUpper.includes('D2'));
    }
    if (activePath === 'path_d3_d2' || activePath === 'path_d3_d4') {
      return labelUpper.includes('D3') || labelUpper.includes('D2') || (activePath === 'path_d3_d4' && labelUpper.includes('D4'));
    }
    if (activePath === 'path_half_wave') {
      return labelUpper.includes('T1') || labelUpper.includes('D1') || labelUpper.includes('SCR');
    }
    return false;
  };

  // Find Load & Source components for textbook annotations
  const srcComp = components.find((c) => c.type === 'ac_source');
  const resComp = components.find((c) => c.type === 'resistor');
  const indComp = components.find((c) => c.type === 'inductor');

  // Detect true wire junction points (T-connections or 4-way intersections: degree >= 3)
  // Simple 2-wire corners have degree 2 and do NOT get junction dots!
  const junctionPoints = useMemo(() => {
    const segments = [];
    wires.forEach((wire) => {
      const pts = getResolvedWireWaypoints(wire);
      for (let i = 0; i < pts.length - 1; i++) {
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          segments.push({
            x1: Math.round(p1.x),
            y1: Math.round(p1.y),
            x2: Math.round(p2.x),
            y2: Math.round(p2.y),
          });
        }
      }
    });

    const candidateKeys = new Set();
    const endpointKeys = new Set();
    segments.forEach((seg) => {
      candidateKeys.add(`${seg.x1},${seg.y1}`);
      candidateKeys.add(`${seg.x2},${seg.y2}`);
      endpointKeys.add(`${seg.x1},${seg.y1}`);
      endpointKeys.add(`${seg.x2},${seg.y2}`);
    });

    // Also include any intersection where a segment end touches another segment's interior
    segments.forEach((seg) => {
      candidateKeys.forEach((key) => {
        const [x, y] = key.split(',').map(Number);
        if (seg.y1 === seg.y2 && y === seg.y1) {
          const minX = Math.min(seg.x1, seg.x2);
          const maxX = Math.max(seg.x1, seg.x2);
          if (x >= minX && x <= maxX) {
            candidateKeys.add(`${x},${y}`);
          }
        }
        if (seg.x1 === seg.x2 && x === seg.x1) {
          const minY = Math.min(seg.y1, seg.y2);
          const maxY = Math.max(seg.y1, seg.y2);
          if (y >= minY && y <= maxY) {
            candidateKeys.add(`${x},${y}`);
          }
        }
      });
    });

    const junctions = [];
    candidateKeys.forEach((key) => {
      const [x, y] = key.split(',').map(Number);
      const directions = new Set();

      segments.forEach((seg) => {
        if (seg.y1 === seg.y2 && seg.y1 === y) {
          const minX = Math.min(seg.x1, seg.x2);
          const maxX = Math.max(seg.x1, seg.x2);
          if (x > minX && x < maxX) {
            directions.add('E');
            directions.add('W');
          } else if (x === minX && maxX > minX) {
            directions.add('E');
          } else if (x === maxX && maxX > minX) {
            directions.add('W');
          }
        }
        if (seg.x1 === seg.x2 && seg.x1 === x) {
          const minY = Math.min(seg.y1, seg.y2);
          const maxY = Math.max(seg.y1, seg.y2);
          if (y > minY && y < maxY) {
            directions.add('N');
            directions.add('S');
          } else if (y === minY && maxY > minY) {
            directions.add('S');
          } else if (y === maxY && maxY > minY) {
            directions.add('N');
          }
        }
      });

      // IEEE standard rule: only render junction dot if 3 or more branches meet
      // AND at least one wire segment terminates at (x, y).
      // Two continuous wires merely crossing perpendicularly (4 branches, 0 endpoints)
      // must NOT have a junction dot.
      if (directions.size >= 3 && endpointKeys.has(key)) {
        junctions.push({ x, y });
      }
    });

    return junctions;
  }, [wires, components]);

  return (
    <div className="circuit-canvas-wrapper" aria-label="Interactive Circuit Canvas">
      {/* Main SVG Schematic Board */}
      <div className="canvas-svg-container">
        <svg
          ref={svgRef}
          className="circuit-svg"
          viewBox="40 45 600 345"
          preserveAspectRatio="xMidYMid meet"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onClick={() => {
            onSelectComponent(null);
            if (wiringStart) setWiringStart(null);
          }}
        >
          <defs>
            <pattern id="grid-dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="10" cy="10" r="1.1" fill="#1e293b" opacity="0.5" />
            </pattern>
            <filter id="neon-glow-cyan" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="neon-glow-green" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Deep dark laboratory background */}
          <rect width="100%" height="100%" fill="#070c16" />
          <rect width="100%" height="100%" fill="url(#grid-dots)" />

          {/* WIRES LAYER */}
          <g className="wires-layer">
            {wires.map((wire) => {
              const waypoints = getResolvedWireWaypoints(wire);
              const pathD = waypointsToPath(waypoints);
              const isHovered = hoveredWireId === wire.id;
              const isConducting = checkWireConducting(wire);
              const dots = isConducting && showConductionEffect ? getWireDotsFromWaypoints(waypoints, 24) : [];
              const p1 = waypoints[0] || { x: 0, y: 0 };
              const p2 = waypoints[waypoints.length - 1] || { x: 0, y: 0 };

              return (
                <g
                  key={wire.id}
                  className="wire-group"
                  onMouseEnter={() => setHoveredWireId(wire.id)}
                  onMouseLeave={() => setHoveredWireId(null)}
                >
                  {/* Invisible thicker click target */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="16"
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteWire(wire.id);
                    }}
                  />

                  {/* Conducting Lightning Glow Halo (When Wire is Active) */}
                  {isConducting && showConductionEffect && (
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="6"
                      strokeOpacity="0.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#neon-glow-cyan)"
                      className="pointer-events-none"
                    />
                  )}

                  {/* Crossover bridge mask for crisp visual separation when wires cross without connecting */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#070c16"
                    strokeWidth="4"
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    className="pointer-events-none"
                  />

                  {/* Core Wire Path (Solid, clean textbook wire line matching Image 2) */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={
                      isHovered
                        ? '#f43f5e'
                        : isConducting && showConductionEffect
                        ? '#38bdf8'
                        : '#cbd5e1'
                    }
                    strokeWidth={isConducting && showConductionEffect ? '2.4' : isHovered ? '2.6' : '2'}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    className="transition-colors pointer-events-none"
                  />

                  {/* Glowing Dots Along Path - Only visible during active current conduction */}
                  {dots.map((dot, idx) => (
                    <circle
                      key={idx}
                      cx={dot.x}
                      cy={dot.y}
                      r={3.2}
                      fill="#ffffff"
                      stroke="#00f0ff"
                      strokeWidth={1.5}
                      filter="drop-shadow(0 0 5px #00f0ff)"
                      className="pointer-events-none"
                    />
                  ))}

                  {/* Wire Label if present (e.g. Phase A, Neutral N) */}
                  {wire.label && (
                    <text
                      x={waypoints.length > 2 ? (waypoints[0].x + waypoints[1].x) / 2 : (p1.x + p2.x) / 2}
                      y={(waypoints.length > 2 ? waypoints[0].y : p1.y) + (wire.label.includes('-') || wire.label.includes('GND') ? 14 : -8)}
                      fill={isConducting ? '#7dd3fc' : '#94a3b8'}
                      fontSize="9.5"
                      fontWeight="bold"
                      textAnchor="middle"
                      fontFamily="sans-serif"
                      className="pointer-events-none select-none"
                    >
                      {wire.label}
                    </text>
                  )}

                  {/* Wire delete button icon at midpoint when hovered */}
                  {isHovered && (
                    <g
                      transform={`translate(${(p1.x + p2.x) / 2}, ${(p1.y + p2.y) / 2})`}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteWire(wire.id);
                      }}
                    >
                      <circle cx="0" cy="0" r="9" fill="#e11d48" stroke="#ffffff" strokeWidth="1.5" />
                      <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                      <line x1="3.5" y1="-3.5" x2="-3.5" y2="3.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                    </g>
                  )}
                </g>
              );
            })}

            {/* In-progress wiring wire */}
            {wiringStart && (
              <path
                d={waypointsToPath(getWireWaypoints(getWirePoint(wiringStart.compId, wiringStart.pinId), mousePos))}
                fill="none"
                stroke="#c084fc"
                strokeWidth="2.5"
                strokeDasharray="5,4"
                className="animate-pulse"
              />
            )}
          </g>

          {/* Textbook IEEE Junction Dots • strictly matching Prof. Arpan Hota slides */}
          <g className="junction-dots-layer pointer-events-none select-none">
            {junctionPoints.map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r="4.2"
                fill="#f8fafc"
                stroke="#070c16"
                strokeWidth="1.6"
              />
            ))}
          </g>

          {/* COMPONENTS LAYER */}
          <g className="components-layer">
            {components.map((comp) => {
              const catalogItem = COMPONENT_CATALOG.find((c) => c.type === comp.type);
              const isSelected = selectedCompId === comp.id;
              const isDragging = draggingCompId === comp.id;
              const isSwitchOn = checkSwitchOn(comp);

              const isFwd = comp.type === 'freewheeling_diode';

              return (
                <g
                  key={comp.id}
                  transform={`translate(${comp.x}, ${comp.y})`}
                  className={`component-group ${isFwd ? 'fwd-component-group' : ''} ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
                  onMouseDown={(e) => handleCompMouseDown(e, comp)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isFwd) {
                      if (onToggleFreewheeling) onToggleFreewheeling();
                      return;
                    }
                    onSelectComponent(comp.id);
                  }}
                  onMouseEnter={() => setHoveredCompId(comp.id)}
                  onMouseLeave={() => setHoveredCompId(null)}
                  style={isFwd ? { cursor: 'pointer' } : undefined}
                >
                  {/* Selection indicator halo */}
                  {isSelected && (
                    <rect
                      x="-44"
                      y="-46"
                      width="88"
                      height="92"
                      rx="12"
                      fill="rgba(56, 189, 248, 0.08)"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="4,3"
                    />
                  )}

                  {/* Component Symbol Rendering with Live Status */}
                  <g transform={`rotate(${comp.rotation || 0})`}>
                    {renderComponentSymbol(
                      comp.type,
                      isSelected ? '#38bdf8' : '#94a3b8',
                      {
                        ...comp.props,
                        isOn: isSwitchOn,
                        isConducting: isSwitchOn,
                        isActive: isFwd ? isFreewheelingActive : comp.props?.isActive,
                        isHovered: hoveredCompId === comp.id,
                        voltage: comp.type === 'ac_source' ? instantaneousState.vsVal : comp.props?.voltage,
                      }
                    )}
                  </g>

                  {/* Terminal Connection Pins (exclude FWD so tapping anywhere cleanly toggles) */}
                  {!isFwd &&
                    getComponentTerminals(comp).map((pin) => {
                    const pinPos = getAbsolutePinPosition(comp, pin);
                    const localPinPos = {
                      x: pinPos.x - comp.x,
                      y: pinPos.y - comp.y,
                    };
                    const isPinWiringStart =
                      wiringStart &&
                      wiringStart.compId === comp.id &&
                      wiringStart.pinId === pin.id;

                    return (
                      <g
                        key={pin.id}
                        transform={`translate(${localPinPos.x}, ${localPinPos.y})`}
                        className="pin-group cursor-crosshair"
                        onClick={(e) => handlePinClick(e, comp, pin)}
                        title={`Pin: ${pin.label || pin.id} (Click to wire)`}
                      >
                        <circle cx="0" cy="0" r="8" fill="transparent" className="hover:fill-sky-500/20" />
                        <circle
                          cx="0"
                          cy="0"
                          r="4"
                          fill={isPinWiringStart ? '#c084fc' : '#070c16'}
                          stroke={isPinWiringStart ? '#c084fc' : isSwitchOn ? '#10b981' : '#38bdf8'}
                          strokeWidth="2"
                        />
                      </g>
                    );
                  })}

                  {/* Quick component action buttons when selected */}
                  {isSelected && (
                    <g transform="translate(36, -36)" className="cursor-pointer">
                      <g
                        transform="translate(0, 0)"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRotateComponent(comp.id);
                        }}
                        title="Rotate 90° (Hotkey: R)"
                      >
                        <circle cx="0" cy="0" r="9" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                        <path
                          d="M -3 -2 A 4 4 0 1 1 3 3 M 3 0 L 3 3 L 0 3"
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                      </g>
                      <g
                        transform="translate(0, 22)"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteComponent(comp.id);
                        }}
                        title="Delete Component (Hotkey: Del)"
                      >
                        <circle cx="0" cy="0" r="9" fill="#1e293b" stroke="#f43f5e" strokeWidth="1.5" />
                        <line x1="-3" y1="-3" x2="3" y2="3" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" />
                        <line x1="3" y1="-3" x2="-3" y2="3" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" />
                      </g>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Empty state overlay */}
        {components.length === 0 && (
          <div className="canvas-empty-overlay">
            <div className="empty-message-box">
              <Zap className="w-10 h-10 text-sky-400 mb-2 animate-bounce" />
              <h3>Circuit Canvas is Empty</h3>
              <p>Pick a preset below to see the laboratory layout:</p>
              <div className="flex gap-2 mt-3 flex-wrap justify-center">
                <button
                  onClick={() => onLoadPreset('full-wave-thyristor-rl')}
                  className="btn-preset-chip"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Full-Wave Thyristor Bridge (R-L)
                </button>
                <button
                  onClick={() => onLoadPreset('full-wave-diode-r')}
                  className="btn-preset-chip"
                >
                  Full-Wave Diode Bridge (R)
                </button>
                <button
                  onClick={() => onLoadPreset('thyristor-rl')}
                  className="btn-preset-chip"
                >
                  Half-Wave Thyristor (R-L)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
