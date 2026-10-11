/**
 * Power Electronics Calculation Engine
 * 
 * Provides textbook-quality, mathematically rigorous analytical derivations and dynamic
 * state calculations for power electronic converters:
 * - Single-Phase Full-Wave Thyristor Bridge (CCM & DCM, with/without FWD)
 * - Single-Phase Full-Wave Uncontrolled Diode Bridge
 * - Single-Phase Half-Wave Controlled Thyristor Rectifier
 * - Single-Phase Half-Wave Uncontrolled Diode Rectifier
 * - Three-Phase Diode Bridge Rectifier (6 Diodes)
 * - Three-Phase Fully Controlled Rectifier (6 SCRs)
 * - Three-Phase Semi-Controlled Rectifier (3 SCRs + 3 Diodes)
 * - AC Series R-L Circuit & DC Transient Circuit
 * 
 * Complies with IEEE / Rashid / Ned Mohan power electronics theory.
 */

import { findExtinctionAngleBeta } from './solver.js';

/**
 * Resolve effective topology type and metadata from circuit parameters
 */
export function resolveCircuitTopology(circuitParams = {}) {
  const {
    circuitType = 'auto',
    sourceType = 'ac',
    hasThyristor = false,
    hasDiode = false,
    thyristorCount = 0,
    diodeCount = 0,
    isThreePhase = false,
    isFreewheelingActive = false,
    inductance = 0.05,
  } = circuitParams;

  const isInductive = inductance > 1e-4;

  let effectiveType = circuitType;
  if (!effectiveType || effectiveType === 'auto') {
    if (sourceType === 'dc') {
      effectiveType = 'dc_transient';
    } else if (isThreePhase && thyristorCount >= 6) {
      effectiveType = 'three_phase_thyristor';
    } else if (isThreePhase && diodeCount >= 6 && thyristorCount === 0) {
      effectiveType = 'three_phase_diode';
    } else if (isThreePhase && thyristorCount >= 3 && diodeCount >= 3) {
      effectiveType = 'three_phase_semi';
    } else if (thyristorCount >= 4 || (hasThyristor && thyristorCount >= 2 && diodeCount >= 2)) {
      effectiveType = 'full_wave_thyristor';
    } else if (diodeCount >= 4) {
      effectiveType = 'full_wave_diode';
    } else if (hasThyristor) {
      effectiveType = 'half_wave_thyristor';
    } else if (hasDiode) {
      effectiveType = 'half_wave_diode';
    } else {
      effectiveType = 'ac_linear';
    }
  }

  // Generate topology human-readable display title
  let topologyName = 'Single-Phase Converter';
  let isControlled = true;
  let isHalfWave = false;
  let isThreePhaseTopology = false;

  switch (effectiveType) {
    case 'three_phase_diode':
      topologyName = 'Three-Phase Diode Bridge Rectifier (6 Diodes)';
      isControlled = false;
      isThreePhaseTopology = true;
      break;

    case 'three_phase_thyristor':
      topologyName = 'Three-Phase Fully Controlled Rectifier (6 SCRs)';
      isControlled = true;
      isThreePhaseTopology = true;
      break;

    case 'three_phase_semi':
      topologyName = 'Three-Phase Semi-Controlled Rectifier (3 SCRs + 3 Diodes)';
      isControlled = true;
      isThreePhaseTopology = true;
      break;

    case 'full_wave_thyristor':
      isControlled = true;
      if (isFreewheelingActive) {
        topologyName = 'Single-Phase Full-Wave Thyristor Bridge (Clamped Vo ≥ 0)';
      } else if (isInductive) {
        topologyName = 'Single-Phase Full-Wave Thyristor Bridge (R-L Load)';
      } else {
        topologyName = 'Single-Phase Full-Wave Thyristor Bridge (Resistive Load)';
      }
      break;

    case 'full_wave_diode':
      topologyName = 'Single-Phase Full-Wave Diode Bridge Rectifier';
      isControlled = false;
      break;

    case 'half_wave_thyristor':
      isControlled = true;
      isHalfWave = true;
      if (isFreewheelingActive) {
        topologyName = 'Single-Phase Half-Wave Thyristor Rectifier (Clamped Vo ≥ 0)';
      } else if (isInductive) {
        topologyName = 'Single-Phase Half-Wave Thyristor Rectifier (R-L Load)';
      } else {
        topologyName = 'Single-Phase Half-Wave Thyristor Rectifier (Resistive Load)';
      }
      break;

    case 'half_wave_diode':
      topologyName = 'Single-Phase Half-Wave Diode Rectifier';
      isControlled = false;
      isHalfWave = true;
      break;

    case 'ac_linear':
      topologyName = 'AC Series R-L Circuit (Linear)';
      isControlled = false;
      break;

    case 'dc_transient':
      topologyName = 'DC Transient Circuit';
      isControlled = false;
      break;

    default:
      topologyName = 'Power Electronic Converter';
  }

  return {
    effectiveType,
    topologyName,
    isControlled,
    isHalfWave,
    isThreePhase: isThreePhaseTopology,
    isInductive,
    isFreewheelingActive: Boolean(isFreewheelingActive),
  };
}

/**
 * Calculate power electronics converter metrics and operating states
 */
export function calculateConverterMetrics(circuitParams = {}, simulationResult = null) {
  const {
    voltage = 230,
    frequency = 50,
    firingAngleDeg = 45,
    resistance = 20,
    inductance = 0.05,
  } = circuitParams;

  const topology = resolveCircuitTopology(circuitParams);
  const { effectiveType, topologyName, isControlled, isHalfWave, isThreePhase, isInductive, isFreewheelingActive } = topology;

  // Circuit electrical parameters
  const f = Math.max(1, frequency);
  const omega = 2 * Math.PI * f;
  const Vm = voltage;
  const VsRms = Vm / Math.SQRT2;
  const R = Math.max(0.1, resistance);
  const L = Math.max(0, inductance);
  const XL = omega * L;
  const Z = Math.sqrt(R * R + XL * XL);
  const phiRad = Math.atan2(XL, R);
  const phiDeg = (phiRad * 180) / Math.PI;
  const tauMs = R > 0 ? (L / R) * 1000 : 0;

  // Firing angle handling: for uncontrolled (diodes), alpha is effectively 0
  const activeAlphaDeg = isControlled ? Math.max(0, Math.min(180, firingAngleDeg)) : 0;
  const alphaRad = (activeAlphaDeg * Math.PI) / 180;
  const cosAlpha = Math.cos(alphaRad);
  const sinAlpha = Math.sin(alphaRad);

  // Extinction angle beta and Conduction angle gamma determination
  let betaDeg = 180;
  let isContinuous = false;

  if (isThreePhase) {
    // 3-Phase converters are almost universally CCM with continuous line-to-line handoff
    isContinuous = true;
    betaDeg = isControlled ? Math.min(360, 60 + activeAlphaDeg) : 60;
  } else if (!isInductive) {
    // Pure resistive load: current falls to 0 at 180°
    betaDeg = 180;
    isContinuous = false;
  } else if (isFreewheelingActive) {
    // Freewheeling diode clamps vo = 0 at 180°, natural commutation occurs at 180°
    betaDeg = 180;
    isContinuous = activeAlphaDeg === 0;
  } else if (isHalfWave) {
    // Half-wave RL converter
    if (simulationResult?.stats?.extinctionAngleDeg) {
      betaDeg = parseFloat(simulationResult.stats.extinctionAngleDeg);
    } else {
      const betaCalculated = findExtinctionAngleBeta(alphaRad, phiRad, R, omega, L, true);
      betaDeg = (betaCalculated * 180) / Math.PI;
    }
    isContinuous = false;
  } else {
    // Full-wave bridge converter (RL load, no FWD)
    if (simulationResult?.stats?.isContinuous !== undefined) {
      isContinuous = simulationResult.stats.isContinuous;
      betaDeg = simulationResult?.stats?.extinctionAngleDeg
        ? parseFloat(simulationResult.stats.extinctionAngleDeg)
        : (isContinuous ? 180 + activeAlphaDeg : 180 + phiDeg * 0.8);
    } else {
      // Fundamental power electronics criteria: CCM occurs if and only if alpha <= phi
      isContinuous = activeAlphaDeg <= phiDeg;
      if (isContinuous) {
        betaDeg = 180 + activeAlphaDeg;
      } else {
        const betaCalculated = findExtinctionAngleBeta(alphaRad, phiRad, R, omega, L, false);
        betaDeg = (betaCalculated * 180) / Math.PI;
      }
    }
  }

  const betaRad = (betaDeg * Math.PI) / 180;
  const conductionAngleDeg = Math.max(0, betaDeg - activeAlphaDeg);

  // Conduction Mode String
  let conductionMode = 'R Load';
  if (isInductive) {
    if (isFreewheelingActive) {
      conductionMode = 'FWD Clamped';
    } else if (isContinuous) {
      conductionMode = 'CCM';
    } else {
      conductionMode = 'DCM';
    }
  }

  // ---------------------------------------------------------------------------
  // Theoretical Calculus Calculations based on Topology & Limits
  // ---------------------------------------------------------------------------
  let theoreticalVoAvg = 0;
  let theoreticalVoRms = 0;
  let avgFormulaLatex = '';
  let rmsFormulaLatex = '';

  const VmL = Math.sqrt(3) * Vm;
  const VsLRms = VmL / Math.SQRT2;

  switch (effectiveType) {
    case 'three_phase_diode': {
      // Vo,avg = (3 VmL) / pi
      theoreticalVoAvg = (3 * VmL) / Math.PI;
      theoreticalVoRms = VmL * Math.sqrt(0.5 + (3 * Math.sqrt(3)) / (4 * Math.PI));
      avgFormulaLatex = 'V_{o,avg} = \\frac{3 V_{mL}}{\\pi}';
      rmsFormulaLatex = 'V_{o,rms} = V_{mL} \\sqrt{\\frac{1}{2} + \\frac{3\\sqrt{3}}{4\\pi}}';
      break;
    }

    case 'three_phase_thyristor': {
      if (isFreewheelingActive && activeAlphaDeg > 60) {
        theoreticalVoAvg = ((3 * VmL) / Math.PI) * (1 + Math.cos(alphaRad + Math.PI / 3));
        const angleTerm = (2 * Math.PI / 3 - alphaRad) + 0.5 * Math.sin(2 * (alphaRad + Math.PI / 3));
        theoreticalVoRms = VmL * Math.sqrt((3 / (2 * Math.PI)) * Math.max(0, angleTerm));
        avgFormulaLatex = 'V_{o,avg} = \\frac{3 V_{mL}}{\\pi} [1 + \\cos(\\alpha + 60^\\circ)]';
        rmsFormulaLatex = 'V_{o,rms} = V_{mL} \\sqrt{\\frac{3}{2\\pi} [(\\frac{2\\pi}{3} - \\alpha) + \\frac{\\sin 2(\\alpha+60^\\circ)}{2}]}';
      } else {
        theoreticalVoAvg = ((3 * VmL) / Math.PI) * cosAlpha;
        const rmsTerm = 0.5 + ((3 * Math.sqrt(3)) / (4 * Math.PI)) * Math.cos(2 * alphaRad);
        theoreticalVoRms = VmL * Math.sqrt(Math.max(0, rmsTerm));
        avgFormulaLatex = 'V_{o,avg} = \\frac{3 V_{mL}}{\\pi} \\cos\\alpha';
        rmsFormulaLatex = 'V_{o,rms} = V_{mL} \\sqrt{\\frac{1}{2} + \\frac{3\\sqrt{3}}{4\\pi} \\cos(2\\alpha)}';
      }
      break;
    }

    case 'three_phase_semi': {
      theoreticalVoAvg = ((3 * VmL) / (2 * Math.PI)) * (1 + cosAlpha);
      const rmsTerm = (Math.PI - alphaRad) + 0.5 * Math.sin(2 * alphaRad);
      theoreticalVoRms = VmL * Math.sqrt((3 / (4 * Math.PI)) * Math.max(0, rmsTerm));
      avgFormulaLatex = 'V_{o,avg} = \\frac{3 V_{mL}}{2\\pi} (1 + \\cos\\alpha)';
      rmsFormulaLatex = 'V_{o,rms} = V_{mL} \\sqrt{\\frac{3}{4\\pi} [(\\pi - \\alpha) + \\frac{\\sin 2\\alpha}{2}]}';
      break;
    }

    case 'full_wave_thyristor': {
      if (isFreewheelingActive) {
        theoreticalVoAvg = (Vm / Math.PI) * (1 + cosAlpha);
        const rmsTerm = (Math.PI - alphaRad) + Math.sin(2 * alphaRad) / 2;
        theoreticalVoRms = Vm * Math.sqrt(Math.max(0, rmsTerm) / (2 * Math.PI));
        avgFormulaLatex = 'V_{o,avg} = \\frac{V_m}{\\pi} (1 + \\cos\\alpha)';
        rmsFormulaLatex = 'V_{o,rms} = V_m \\sqrt{\\frac{1}{2\\pi} [(\\pi - \\alpha) + \\frac{\\sin 2\\alpha}{2}]}';
      } else if (isInductive) {
        if (isContinuous) {
          theoreticalVoAvg = (2 * Vm / Math.PI) * cosAlpha;
          theoreticalVoRms = VsRms;
          avgFormulaLatex = 'V_{o,avg} = \\frac{2 V_m}{\\pi} \\cos\\alpha';
          rmsFormulaLatex = 'V_{o,rms} = \\frac{V_m}{\\sqrt{2}} = V_{s,rms}';
        } else {
          // DCM without FWD: limits alpha to beta
          theoreticalVoAvg = (Vm / Math.PI) * (cosAlpha - Math.cos(betaRad));
          const rmsTerm = (betaRad - alphaRad) - (Math.sin(2 * betaRad) - Math.sin(2 * alphaRad)) / 2;
          theoreticalVoRms = Vm * Math.sqrt(Math.max(0, rmsTerm) / (2 * Math.PI));
          avgFormulaLatex = 'V_{o,avg} = \\frac{V_m}{\\pi} (\\cos\\alpha - \\cos\\beta)';
          rmsFormulaLatex = 'V_{o,rms} = V_m \\sqrt{\\frac{1}{2\\pi} [(\\beta - \\alpha) - \\frac{\\sin 2\\beta - \\sin 2\\alpha}{2}]}';
        }
      } else {
        // Pure resistive load: limits alpha to pi
        theoreticalVoAvg = (Vm / Math.PI) * (1 + cosAlpha);
        const rmsTerm = (Math.PI - alphaRad) + Math.sin(2 * alphaRad) / 2;
        theoreticalVoRms = Vm * Math.sqrt(Math.max(0, rmsTerm) / (2 * Math.PI));
        avgFormulaLatex = 'V_{o,avg} = \\frac{V_m}{\\pi} (1 + \\cos\\alpha)';
        rmsFormulaLatex = 'V_{o,rms} = V_m \\sqrt{\\frac{1}{2\\pi} [(\\pi - \\alpha) + \\frac{\\sin 2\\alpha}{2}]}';
      }
      break;
    }

    case 'full_wave_diode': {
      theoreticalVoAvg = (2 * Vm) / Math.PI;
      theoreticalVoRms = VsRms;
      avgFormulaLatex = 'V_{o,avg} = \\frac{2 V_m}{\\pi}';
      rmsFormulaLatex = 'V_{o,rms} = \\frac{V_m}{\\sqrt{2}}';
      break;
    }

    case 'half_wave_thyristor': {
      if (isFreewheelingActive || !isInductive) {
        theoreticalVoAvg = (Vm / (2 * Math.PI)) * (1 + cosAlpha);
        const rmsTerm = (Math.PI - alphaRad) + Math.sin(2 * alphaRad) / 2;
        theoreticalVoRms = (Vm / 2) * Math.sqrt(Math.max(0, rmsTerm) / Math.PI);
        avgFormulaLatex = 'V_{o,avg} = \\frac{V_m}{2\\pi} (1 + \\cos\\alpha)';
        rmsFormulaLatex = 'V_{o,rms} = \\frac{V_m}{2} \\sqrt{\\frac{1}{\\pi} [(\\pi - \\alpha) + \\frac{\\sin 2\\alpha}{2}]}';
      } else {
        // RL without FWD
        theoreticalVoAvg = (Vm / (2 * Math.PI)) * (cosAlpha - Math.cos(betaRad));
        const rmsTerm = (betaRad - alphaRad) - (Math.sin(2 * betaRad) - Math.sin(2 * alphaRad)) / 2;
        theoreticalVoRms = (Vm / 2) * Math.sqrt(Math.max(0, rmsTerm) / Math.PI);
        avgFormulaLatex = 'V_{o,avg} = \\frac{V_m}{2\\pi} (\\cos\\alpha - \\cos\\beta)';
        rmsFormulaLatex = 'V_{o,rms} = \\frac{V_m}{2} \\sqrt{\\frac{1}{\\pi} [(\\beta - \\alpha) - \\frac{\\sin 2\\beta - \\sin 2\\alpha}{2}]}';
      }
      break;
    }

    case 'half_wave_diode': {
      if (isFreewheelingActive || !isInductive) {
        theoreticalVoAvg = Vm / Math.PI;
        theoreticalVoRms = Vm / 2;
        avgFormulaLatex = 'V_{o,avg} = \\frac{V_m}{\\pi}';
        rmsFormulaLatex = 'V_{o,rms} = \\frac{V_m}{2}';
      } else {
        theoreticalVoAvg = (Vm / (2 * Math.PI)) * (1 - Math.cos(betaRad));
        const rmsTerm = betaRad - Math.sin(2 * betaRad) / 2;
        theoreticalVoRms = (Vm / 2) * Math.sqrt(Math.max(0, rmsTerm) / Math.PI);
        avgFormulaLatex = 'V_{o,avg} = \\frac{V_m}{2\\pi} (1 - \\cos\\beta)';
        rmsFormulaLatex = 'V_{o,rms} = \\frac{V_m}{2} \\sqrt{\\frac{1}{\\pi} [\\beta - \\frac{\\sin 2\\beta}{2}]}';
      }
      break;
    }

    case 'ac_linear': {
      theoreticalVoAvg = 0;
      theoreticalVoRms = VsRms;
      avgFormulaLatex = 'V_{o,avg} = 0';
      rmsFormulaLatex = 'V_{o,rms} = V_{s,rms}';
      break;
    }

    default: {
      theoreticalVoAvg = Vm;
      theoreticalVoRms = Vm;
      avgFormulaLatex = 'V_{o,avg} = V_{dc}';
      rmsFormulaLatex = 'V_{o,rms} = V_{dc}';
      break;
    }
  }

  // ---------------------------------------------------------------------------
  // Live Measurements: Bound directly to simulationResult stats with analytical fallback
  // ---------------------------------------------------------------------------
  const simVoAvg = simulationResult?.stats?.voAvg !== undefined
    ? parseFloat(simulationResult.stats.voAvg)
    : theoreticalVoAvg;

  const simVoRms = simulationResult?.stats?.voRms !== undefined
    ? parseFloat(simulationResult.stats.voRms)
    : theoreticalVoRms;

  const simIoAvg = simulationResult?.stats?.ioAvg !== undefined
    ? parseFloat(simulationResult.stats.ioAvg)
    : (theoreticalVoAvg / R);

  const simIoRms = simulationResult?.stats?.ioRms !== undefined
    ? parseFloat(simulationResult.stats.ioRms)
    : (theoreticalVoRms / (Z || R));

  // Secondary Power Electronics Quality Indicators
  const formFactor = Math.abs(simVoAvg) > 0.01 ? (simVoRms / Math.abs(simVoAvg)) : 0;
  const rippleFactor = formFactor >= 1 ? Math.sqrt(Math.max(0, formFactor * formFactor - 1)) : 0;
  const Pdc = Math.max(0, simVoAvg * simIoAvg);
  const Pac = Math.max(0.001, simVoRms * simIoRms);
  const efficiency = Math.min(100, Math.max(0, (Pdc / Pac) * 100));
  const rippleVoltageAc = Math.sqrt(Math.max(0, simVoRms * simVoRms - simVoAvg * simVoAvg));

  return {
    // Topology and flags
    ...topology,
    // Electrical parameters
    f,
    omega,
    Vm,
    VsRms,
    VmL,
    VsLRms,
    R,
    L,
    XL,
    Z,
    phiRad,
    phiDeg,
    tauMs,
    activeAlphaDeg,
    alphaRad,
    cosAlpha,
    sinAlpha,
    betaDeg,
    betaRad,
    conductionAngleDeg,
    isContinuous,
    conductionMode,

    // Theoretical outputs
    theoreticalVoAvg,
    theoreticalVoRms,
    avgFormulaLatex,
    rmsFormulaLatex,

    // Live Simulated / Reactive outputs
    simVoAvg,
    simVoRms,
    simIoAvg,
    simIoRms,
    formFactor,
    rippleFactor,
    Pdc,
    Pac,
    efficiency,
    rippleVoltageAc,

    // Formatted strings (exact decimal precision matching UI specs)
    formatted: {
      alphaDeg: `${activeAlphaDeg}°`,
      alphaRad: `${alphaRad.toFixed(3)} rad`,
      alphaTimeMs: `${((activeAlphaDeg / 360) * (1000 / f)).toFixed(1)} ms`,
      betaDeg: `${betaDeg.toFixed(1)}°`,
      gammaDeg: `${conductionAngleDeg.toFixed(1)}°`,
      voAvg: `${simVoAvg.toFixed(2)} V`,
      voRms: `${simVoRms.toFixed(2)} V`,
      theoVoAvg: `${theoreticalVoAvg.toFixed(2)} V`,
      theoVoRms: `${theoreticalVoRms.toFixed(2)} V`,
      formFactor: formFactor.toFixed(3),
      rippleFactor: rippleFactor.toFixed(3),
      efficiency: `${efficiency.toFixed(1)}%`,
      impedance: `${Z.toFixed(2)} Ω`,
      phiDeg: `${phiDeg.toFixed(1)}°`,
      tauMs: `${tauMs.toFixed(2)} ms`,
      pdc: `${Pdc.toFixed(1)} W`,
      pac: `${Pac.toFixed(1)} VA`,
      xl: `${XL.toFixed(2)} Ω`,
      periodMs: `${(1000 / f).toFixed(1)} ms`,
    },
  };
}

/**
 * Generate programmatic commutation timeline segments (for visual bar)
 * and table rows (for interval breakdown) based on alpha, beta, and conduction mode.
 */
export function generateCommutationTimeline(circuitParams = {}, metrics = null, activeAngleDeg = 0) {
  const m = metrics || calculateConverterMetrics(circuitParams);
  const alpha = Math.round(m.activeAlphaDeg);
  const beta = Math.round(m.betaDeg);
  const cur = ((activeAngleDeg % 360) + 360) % 360;

  let timelineSegments = [];
  let timelineRows = [];

  const { effectiveType, isContinuous, isFreewheelingActive, isInductive, isControlled } = m;

  if (effectiveType === 'three_phase_diode') {
    // 6 symmetrical pulses of 60 degrees each
    const pulses = [
      { start: 0, end: 60, devices: 'D1, D6 (Phase A-B)', voStr: 'vab = VmL sin(ωt + 30°)', vsStr: 'vab > 0', ind: 'Smoothing', flow: 'Source → Load', segClass: 'seg-t1t2-pos' },
      { start: 60, end: 120, devices: 'D1, D2 (Phase A-C)', voStr: 'vac = VmL sin(ωt - 30°)', vsStr: 'vac > 0', ind: 'Smoothing', flow: 'Source → Load', segClass: 'seg-t3t4-pos' },
      { start: 120, end: 180, devices: 'D3, D2 (Phase B-C)', voStr: 'vbc = VmL sin(ωt - 90°)', vsStr: 'vbc > 0', ind: 'Smoothing', flow: 'Source → Load', segClass: 'seg-t1t2-pos' },
      { start: 180, end: 240, devices: 'D3, D4 (Phase B-A)', voStr: 'vba = VmL sin(ωt - 150°)', vsStr: 'vba > 0', ind: 'Smoothing', flow: 'Source → Load', segClass: 'seg-t3t4-pos' },
      { start: 240, end: 300, devices: 'D5, D4 (Phase C-A)', voStr: 'vca = VmL sin(ωt - 210°)', vsStr: 'vca > 0', ind: 'Smoothing', flow: 'Source → Load', segClass: 'seg-t1t2-pos' },
      { start: 300, end: 360, devices: 'D5, D6 (Phase C-B)', voStr: 'vcb = VmL sin(ωt - 270°)', vsStr: 'vcb > 0', ind: 'Smoothing', flow: 'Source → Load', segClass: 'seg-t3t4-pos' },
    ];

    timelineSegments = pulses.map((p) => ({
      className: `timeline-segment ${p.segClass}`,
      widthPct: (60 / 360) * 100,
      title: `${p.devices} [${p.start}° to ${p.end}°]`,
      label: p.devices.split(' ')[0],
    }));

    timelineRows = pulses.map((p) => ({
      startDeg: p.start,
      endDeg: p.end,
      intervalStr: `${p.start}° ≤ ωt < ${p.end}°`,
      devices: p.devices,
      vsStr: p.vsStr,
      voStr: p.voStr,
      inductorState: p.ind,
      energyFlow: p.flow,
      isActive: cur >= p.start && cur < p.end,
    }));

    return { timelineSegments, timelineRows };
  }

  if (effectiveType === 'three_phase_thyristor' || effectiveType === 'three_phase_semi') {
    // 3-Phase Controlled Rectifier with firing angle offset
    const pairs = [
      { name: 'T1, T6', phase: 'vab' },
      { name: 'T1, T2', phase: 'vac' },
      { name: 'T3, T2', phase: 'vbc' },
      { name: 'T3, T4', phase: 'vba' },
      { name: 'T5, T4', phase: 'vca' },
      { name: 'T5, T6', phase: 'vcb' },
    ];

    const baseOffset = (30 + alpha) % 360;
    const intervals = [];
    for (let i = 0; i < 6; i++) {
      const s = (baseOffset + i * 60) % 360;
      const e = (s + 60) % 360;
      intervals.push({
        start: s,
        end: e,
        devices: pairs[i].name,
        phase: pairs[i].phase,
      });
    }

    // Sort intervals by start angle for seamless display [0 to 360]
    intervals.sort((a, b) => a.start - b.start);

    timelineSegments = intervals.map((p, idx) => ({
      className: `timeline-segment ${idx % 2 === 0 ? 'seg-t1t2-pos' : 'seg-t3t4-pos'}`,
      widthPct: (60 / 360) * 100,
      title: `${p.devices} [${p.start}° to ${p.end}°]`,
      label: p.devices,
    }));

    timelineRows = intervals.map((p) => {
      const isActive = p.start < p.end
        ? cur >= p.start && cur < p.end
        : cur >= p.start || cur < p.end;

      return {
        startDeg: p.start,
        endDeg: p.end,
        intervalStr: `${p.start}° ≤ ωt < ${p.end}°`,
        devices: `${p.devices} (Firing α=${alpha}°)`,
        vsStr: `${p.phase} Active`,
        voStr: `+${p.phase}`,
        inductorState: 'Continuous Current',
        energyFlow: 'AC Source → DC Load',
        isActive,
      };
    });

    return { timelineSegments, timelineRows };
  }

  if (effectiveType === 'full_wave_diode') {
    // Full-wave diode bridge (alpha = 0, beta = 180)
    timelineSegments = [
      {
        className: 'timeline-segment seg-t1t2-pos',
        widthPct: 50,
        title: 'D1, D2 Forward Conduction [0° to 180°]',
        label: 'D1, D2 (+Vo)',
      },
      {
        className: 'timeline-segment seg-t3t4-pos',
        widthPct: 50,
        title: 'D3, D4 Forward Conduction [180° to 360°]',
        label: 'D3, D4 (+Vo)',
      },
    ];

    timelineRows = [
      {
        startDeg: 0,
        endDeg: 180,
        intervalStr: '0° ≤ ωt < 180°',
        devices: 'D1 and D2 (ON)',
        vsStr: 'vs > 0 (Positive Half-Cycle)',
        voStr: '+vs = +Vm sin(ωt)',
        inductorState: isInductive ? 'Charging (Current rising)' : 'Resistive',
        energyFlow: 'AC Source → DC Load',
        isActive: cur >= 0 && cur < 180,
      },
      {
        startDeg: 180,
        endDeg: 360,
        intervalStr: '180° ≤ ωt < 360°',
        devices: 'D3 and D4 (ON)',
        vsStr: 'vs < 0 (Negative Half-Cycle)',
        voStr: '-vs = +Vm |sin(ωt)|',
        inductorState: isInductive ? 'Charging (Current rising)' : 'Resistive',
        energyFlow: 'AC Source → DC Load',
        isActive: cur >= 180 && cur < 360,
      },
    ];

    return { timelineSegments, timelineRows };
  }

  if (effectiveType === 'half_wave_thyristor' || effectiveType === 'half_wave_diode') {
    // Half-wave topology
    const devName = effectiveType === 'half_wave_diode' ? 'D1' : 'T1';
    const effectiveAlpha = effectiveType === 'half_wave_diode' ? 0 : alpha;

    if (effectiveAlpha > 0) {
      timelineSegments.push({
        className: 'timeline-segment seg-blocking',
        widthPct: (effectiveAlpha / 360) * 100,
        title: `Forward Blocking [0° to ${effectiveAlpha}°]`,
        label: `0 → ${effectiveAlpha}°`,
      });
      timelineRows.push({
        startDeg: 0,
        endDeg: effectiveAlpha,
        intervalStr: `0° ≤ ωt < ${effectiveAlpha}°`,
        devices: 'None (Forward Blocking)',
        vsStr: 'vs > 0 (Positive)',
        voStr: '0 V',
        inductorState: 'Idle (Zero Current)',
        energyFlow: 'Zero',
        isActive: cur >= 0 && cur < effectiveAlpha,
      });
    }

    // Active positive conduction [alpha to 180]
    const posWidth = Math.max(0, 180 - effectiveAlpha);
    if (posWidth > 0) {
      timelineSegments.push({
        className: 'timeline-segment seg-t1t2-pos',
        widthPct: (posWidth / 360) * 100,
        title: `${devName} Forward Conduction [${effectiveAlpha}° to 180°]`,
        label: `${devName} (+Vo)`,
      });
      timelineRows.push({
        startDeg: effectiveAlpha,
        endDeg: 180,
        intervalStr: `${effectiveAlpha}° ≤ ωt < 180°`,
        devices: `${devName} (ON)`,
        vsStr: 'vs > 0 (Positive)',
        voStr: '+vs = Vm sin(ωt)',
        inductorState: isInductive ? 'Charging (di/dt > 0)' : 'Resistive',
        energyFlow: 'AC Source → DC Load',
        isActive: cur >= effectiveAlpha && cur < 180,
      });
    }

    // Interval after 180: depends on FWD, RL, or R
    if (isFreewheelingActive && isInductive) {
      const ext = Math.min(360, Math.max(180, beta));
      if (ext > 180) {
        timelineSegments.push({
          className: 'timeline-segment seg-blocking',
          style: { background: 'linear-gradient(135deg, #d97706, #f59e0b)' },
          widthPct: ((ext - 180) / 360) * 100,
          title: `Freewheeling Diode Conduction [180° to ${ext}°]`,
          label: 'FWD (0V)',
        });
        timelineRows.push({
          startDeg: 180,
          endDeg: ext,
          intervalStr: `180° ≤ ωt < ${ext}°`,
          devices: 'Freewheeling Diode (FWD)',
          vsStr: 'vs < 0 (Negative)',
          voStr: '0 V (Clamped)',
          inductorState: 'Discharging through FWD loop',
          energyFlow: 'Inductor Stored Energy → Load R',
          isActive: cur >= 180 && cur < ext,
        });
      }
      if (ext < 360) {
        timelineSegments.push({
          className: 'timeline-segment seg-blocking',
          widthPct: ((360 - ext) / 360) * 100,
          title: `Reverse Blocking [${ext}° to 360°]`,
          label: `${ext}° → 360°`,
        });
        timelineRows.push({
          startDeg: ext,
          endDeg: 360,
          intervalStr: `${ext}° ≤ ωt < 360°`,
          devices: 'None (Reverse Blocking)',
          vsStr: 'vs < 0 (Negative)',
          voStr: '0 V',
          inductorState: 'Idle',
          energyFlow: 'Zero',
          isActive: cur >= ext && cur < 360,
        });
      }
    } else if (isInductive && beta > 180) {
      const ext = Math.min(360, beta);
      timelineSegments.push({
        className: 'timeline-segment seg-t1t2-neg',
        widthPct: ((ext - 180) / 360) * 100,
        title: `${devName} Negative Excursion [180° to ${ext}°]`,
        label: `${devName} (-Vo)`,
      });
      timelineRows.push({
        startDeg: 180,
        endDeg: ext,
        intervalStr: `180° ≤ ωt < ${ext}°`,
        devices: `${devName} (Held ON by L)`,
        vsStr: 'vs < 0 (Negative)',
        voStr: 'vs (Negative Excursion)',
        inductorState: 'Discharging (Back-EMF opposes cutoff)',
        energyFlow: 'Inductor → AC Source (Inversion)',
        isActive: cur >= 180 && cur < ext,
      });

      if (ext < 360) {
        timelineSegments.push({
          className: 'timeline-segment seg-blocking',
          widthPct: ((360 - ext) / 360) * 100,
          title: `Reverse Blocking [${ext}° to 360°]`,
          label: `${ext}° → 360°`,
        });
        timelineRows.push({
          startDeg: ext,
          endDeg: 360,
          intervalStr: `${ext}° ≤ ωt < 360°`,
          devices: 'None (Reverse Blocking)',
          vsStr: 'vs < 0 (Negative)',
          voStr: '0 V',
          inductorState: 'Idle',
          energyFlow: 'Zero',
          isActive: cur >= ext && cur < 360,
        });
      }
    } else {
      // Pure resistive load: 180 to 360 is reverse blocking
      timelineSegments.push({
        className: 'timeline-segment seg-blocking',
        widthPct: 50,
        title: 'Reverse Blocking [180° to 360°]',
        label: '180° → 360°',
      });
      timelineRows.push({
        startDeg: 180,
        endDeg: 360,
        intervalStr: '180° ≤ ωt < 360°',
        devices: 'None (Reverse Blocking)',
        vsStr: 'vs < 0 (Negative)',
        voStr: '0 V',
        inductorState: 'Idle',
        energyFlow: 'Zero',
        isActive: cur >= 180 && cur < 360,
      });
    }

    return { timelineSegments, timelineRows };
  }

  // ---------------------------------------------------------------------------
  // Default: Single-Phase Full-Wave Controlled Thyristor Bridge
  // Handles: CCM, DCM, FWD Clamped, and Pure R load modes dynamically!
  // ---------------------------------------------------------------------------
  if (isFreewheelingActive) {
    // Mode: Freewheeling Diode Active (Vo clamped to >= 0)
    // 0 -> alpha: FWD circulating or Blocking
    if (alpha > 0) {
      timelineSegments.push({
        className: 'timeline-segment seg-blocking',
        style: { background: 'linear-gradient(135deg, #d97706, #f59e0b)' },
        widthPct: (alpha / 360) * 100,
        title: `FWD Freewheeling Interval [0° to ${alpha}°]`,
        label: 'FWD (0V)',
      });
      timelineRows.push({
        startDeg: 0,
        endDeg: alpha,
        intervalStr: `0° ≤ ωt < ${alpha}°`,
        devices: isInductive ? 'Freewheeling Diode (FWD)' : 'None (Blocking)',
        vsStr: 'vs > 0 (Positive)',
        voStr: '0 V (Clamped)',
        inductorState: isInductive ? 'Discharging (Loop current)' : 'Idle',
        energyFlow: isInductive ? 'Inductor Stored Energy → Load R' : 'Zero',
        isActive: cur >= 0 && cur < alpha,
      });
    }

    // alpha -> 180: T1, T2 Positive Conduction
    const t1Width = Math.max(0, 180 - alpha);
    if (t1Width > 0) {
      timelineSegments.push({
        className: 'timeline-segment seg-t1t2-pos',
        widthPct: (t1Width / 360) * 100,
        title: `T1, T2 Forward Conduction [${alpha}° to 180°]`,
        label: 'T1,T2 (+Vo)',
      });
      timelineRows.push({
        startDeg: alpha,
        endDeg: 180,
        intervalStr: `${alpha}° ≤ ωt < 180°`,
        devices: 'T1 and T2 (ON)',
        vsStr: 'vs > 0 (Positive)',
        voStr: '+vs = Vm sin(ωt)',
        inductorState: isInductive ? 'Charging (di/dt > 0)' : 'Resistive',
        energyFlow: 'AC Source → DC Load',
        isActive: cur >= alpha && cur < 180,
      });
    }

    // 180 -> 180 + alpha: FWD Freewheeling
    if (alpha > 0) {
      timelineSegments.push({
        className: 'timeline-segment seg-blocking',
        style: { background: 'linear-gradient(135deg, #d97706, #f59e0b)' },
        widthPct: (alpha / 360) * 100,
        title: `FWD Freewheeling Interval [180° to ${180 + alpha}°]`,
        label: 'FWD (0V)',
      });
      timelineRows.push({
        startDeg: 180,
        endDeg: 180 + alpha,
        intervalStr: `180° ≤ ωt < ${180 + alpha}°`,
        devices: isInductive ? 'Freewheeling Diode (FWD)' : 'None (Blocking)',
        vsStr: 'vs < 0 (Negative)',
        voStr: '0 V (Clamped)',
        inductorState: isInductive ? 'Discharging through FWD loop' : 'Idle',
        energyFlow: isInductive ? 'Inductor Stored Energy → Load R' : 'Zero',
        isActive: cur >= 180 && cur < 180 + alpha,
      });
    }

    // 180 + alpha -> 360: T3, T4 Positive Conduction
    const t3Width = Math.max(0, 180 - alpha);
    if (t3Width > 0) {
      timelineSegments.push({
        className: 'timeline-segment seg-t3t4-pos',
        widthPct: (t3Width / 360) * 100,
        title: `T3, T4 Forward Conduction [${180 + alpha}° to 360°]`,
        label: 'T3,T4 (+Vo)',
      });
      timelineRows.push({
        startDeg: 180 + alpha,
        endDeg: 360,
        intervalStr: `${180 + alpha}° ≤ ωt < 360°`,
        devices: 'T3 and T4 (ON)',
        vsStr: 'vs < 0 (Negative)',
        voStr: '-vs = +Vm |sin(ωt)|',
        inductorState: isInductive ? 'Charging (di/dt > 0)' : 'Resistive',
        energyFlow: 'AC Source → DC Load',
        isActive: cur >= 180 + alpha && cur < 360,
      });
    }

    return { timelineSegments, timelineRows };
  }

  if (isContinuous) {
    // Mode: CCM (Continuous Conduction Mode without FWD)
    // Interval 1: [0° to alpha] - T3,T4 holdover conduction
    if (alpha > 0) {
      timelineSegments.push({
        className: 'timeline-segment seg-t3t4-pos',
        widthPct: (alpha / 360) * 100,
        title: `T3,T4 Negative Excursion Holdover [0° to ${alpha}°]`,
        label: 'T3,T4 (-Vo)',
      });
      timelineRows.push({
        startDeg: 0,
        endDeg: alpha,
        intervalStr: `0° ≤ ωt < ${alpha}°`,
        devices: 'T3 and T4 (Holdover from prior cycle)',
        vsStr: 'vs > 0 (Positive)',
        voStr: '-vs (Negative Excursion)',
        inductorState: 'Discharging (L di/dt < 0)',
        energyFlow: 'DC Load → AC Source (Inversion)',
        isActive: cur >= 0 && cur < alpha,
      });
    }

    // Interval 2: [alpha to 180°] - T1,T2 Forward Conduction
    const t1Width = Math.max(0, 180 - alpha);
    if (t1Width > 0) {
      timelineSegments.push({
        className: 'timeline-segment seg-t1t2-pos',
        widthPct: (t1Width / 360) * 100,
        title: `T1,T2 Forward Conduction [${alpha}° to 180°]`,
        label: 'T1,T2 (+Vo)',
      });
      timelineRows.push({
        startDeg: alpha,
        endDeg: 180,
        intervalStr: `${alpha}° ≤ ωt < 180°`,
        devices: 'T1 and T2 (ON)',
        vsStr: 'vs > 0 (Positive)',
        voStr: '+vs = Vm sin(ωt)',
        inductorState: 'Charging (Magnetic energy builds up)',
        energyFlow: 'AC Source → DC Load',
        isActive: cur >= alpha && cur < 180,
      });
    }

    // Interval 3: [180° to 180° + alpha] - T1,T2 Negative Excursion
    if (alpha > 0) {
      timelineSegments.push({
        className: 'timeline-segment seg-t1t2-neg',
        widthPct: (alpha / 360) * 100,
        title: `T1,T2 Negative Excursion [180° to ${180 + alpha}°]`,
        label: 'T1,T2 (-Vo)',
      });
      timelineRows.push({
        startDeg: 180,
        endDeg: 180 + alpha,
        intervalStr: `180° ≤ ωt < ${180 + alpha}°`,
        devices: 'T1 and T2 (Held by L)',
        vsStr: 'vs < 0 (Negative)',
        voStr: 'vs (Negative Excursion)',
        inductorState: 'Discharging (Back-EMF forward biases SCRs)',
        energyFlow: 'Inductor → AC Source (Inversion)',
        isActive: cur >= 180 && cur < 180 + alpha,
      });
    }

    // Interval 4: [180° + alpha to 360°] - T3,T4 Forward Conduction
    const t3Width = Math.max(0, 180 - alpha);
    if (t3Width > 0) {
      timelineSegments.push({
        className: 'timeline-segment seg-t3t4-pos',
        widthPct: (t3Width / 360) * 100,
        title: `T3,T4 Forward Conduction [${180 + alpha}° to 360°]`,
        label: 'T3,T4 (+Vo)',
      });
      timelineRows.push({
        startDeg: 180 + alpha,
        endDeg: 360,
        intervalStr: `${180 + alpha}° ≤ ωt < 360°`,
        devices: 'T3 and T4 (ON)',
        vsStr: 'vs < 0 (Negative)',
        voStr: '-vs = +Vm |sin(ωt)|',
        inductorState: 'Charging (Re-energizing field)',
        energyFlow: 'AC Source → DC Load',
        isActive: cur >= 180 + alpha && cur < 360,
      });
    }

    return { timelineSegments, timelineRows };
  }

  // ---------------------------------------------------------------------------
  // Mode: DCM (Discontinuous Conduction Mode or Pure R load without FWD)
  // Current reaches zero at beta < 180 + alpha, creating dead-bands
  // ---------------------------------------------------------------------------
  const extBeta = Math.min(180 + alpha, Math.max(180, beta));
  const extBeta2 = Math.min(360, extBeta + 180);

  // 1. [0 to alpha] - Forward Blocking
  if (alpha > 0) {
    timelineSegments.push({
      className: 'timeline-segment seg-blocking',
      widthPct: (alpha / 360) * 100,
      title: `Forward Blocking Interval [0° to ${alpha}°]`,
      label: `0 → ${alpha}°`,
    });
    timelineRows.push({
      startDeg: 0,
      endDeg: alpha,
      intervalStr: `0° ≤ ωt < ${alpha}°`,
      devices: 'None (Forward Blocking)',
      vsStr: 'vs > 0 (Positive)',
      voStr: '0 V',
      inductorState: 'Idle (Zero Current in DCM)',
      energyFlow: 'Zero',
      isActive: cur >= 0 && cur < alpha,
    });
  }

  // 2. [alpha to 180] - T1, T2 Positive Conduction
  const t1PosWidth = Math.max(0, 180 - alpha);
  if (t1PosWidth > 0) {
    timelineSegments.push({
      className: 'timeline-segment seg-t1t2-pos',
      widthPct: (t1PosWidth / 360) * 100,
      title: `T1, T2 Forward Conduction [${alpha}° to 180°]`,
      label: 'T1,T2 (+Vo)',
    });
    timelineRows.push({
      startDeg: alpha,
      endDeg: 180,
      intervalStr: `${alpha}° ≤ ωt < 180°`,
      devices: 'T1 and T2 (ON)',
      vsStr: 'vs > 0 (Positive)',
      voStr: '+vs = Vm sin(ωt)',
      inductorState: isInductive ? 'Charging (di/dt > 0)' : 'Resistive',
      energyFlow: 'AC Source → DC Load',
      isActive: cur >= alpha && cur < 180,
    });
  }

  // 3. [180 to beta] - T1, T2 Negative Excursion (if inductive and beta > 180)
  if (isInductive && extBeta > 180) {
    timelineSegments.push({
      className: 'timeline-segment seg-t1t2-neg',
      widthPct: ((extBeta - 180) / 360) * 100,
      title: `T1, T2 Negative Excursion [180° to ${extBeta}°]`,
      label: 'T1,T2 (-Vo)',
    });
    timelineRows.push({
      startDeg: 180,
      endDeg: extBeta,
      intervalStr: `180° ≤ ωt < ${extBeta}°`,
      devices: 'T1 and T2 (Held by L)',
      vsStr: 'vs < 0 (Negative)',
      voStr: 'vs (Negative Excursion)',
      inductorState: 'Discharging (Stored energy decaying to 0)',
      energyFlow: 'Inductor → AC Source (Inversion)',
      isActive: cur >= 180 && cur < extBeta,
    });
  }

  // 4. [beta to 180 + alpha] - Discontinuous Dead Band (current is 0)
  if (180 + alpha > extBeta) {
    timelineSegments.push({
      className: 'timeline-segment seg-blocking',
      widthPct: (((180 + alpha) - extBeta) / 360) * 100,
      title: `Discontinuous Idle Interval [${extBeta}° to ${180 + alpha}°]`,
      label: `${extBeta}° → ${180 + alpha}°`,
    });
    timelineRows.push({
      startDeg: extBeta,
      endDeg: 180 + alpha,
      intervalStr: `${extBeta}° ≤ ωt < ${180 + alpha}°`,
      devices: 'None (Current Extinguished)',
      vsStr: 'vs < 0 (Negative)',
      voStr: '0 V',
      inductorState: 'Idle (Current is Zero)',
      energyFlow: 'Zero',
      isActive: cur >= extBeta && cur < 180 + alpha,
    });
  }

  // 5. [180 + alpha to 360] - T3, T4 Positive Conduction
  const t3PosWidth = Math.max(0, 180 - alpha);
  if (t3PosWidth > 0) {
    timelineSegments.push({
      className: 'timeline-segment seg-t3t4-pos',
      widthPct: (t3PosWidth / 360) * 100,
      title: `T3, T4 Forward Conduction [${180 + alpha}° to 360°]`,
      label: 'T3,T4 (+Vo)',
    });
    timelineRows.push({
      startDeg: 180 + alpha,
      endDeg: 360,
      intervalStr: `${180 + alpha}° ≤ ωt < 360°`,
      devices: 'T3 and T4 (ON)',
      vsStr: 'vs < 0 (Negative)',
      voStr: '-vs = +Vm |sin(ωt)|',
      inductorState: isInductive ? 'Charging (di/dt > 0)' : 'Resistive',
      energyFlow: 'AC Source → DC Load',
      isActive: cur >= 180 + alpha && cur < 360,
    });
  }

  return { timelineSegments, timelineRows };
}
