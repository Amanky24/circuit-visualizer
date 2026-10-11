/**
 * Power Electronics & Circuit Transient Physics Solver
 * Accurately solves according to fundamental power electronics theory (Rashid, Ned Mohan, Prof. Arpan Hota):
 * 1. Single-phase Full-Wave Controlled Thyristor Bridge Converter (CCM & DCM)
 * 2. Single-phase Full-Wave Uncontrolled Diode Bridge Rectifier (CCM)
 * 3. Single-phase Half-Wave Controlled Thyristor Rectifier (R & R-L Load)
 * 4. Single-phase Half-Wave Uncontrolled Diode Rectifier (R & R-L Load)
 * 5. AC Series R-L Linear Circuit
 * 6. DC Transient R-L Circuit
 */

/**
 * Solve for Extinction Angle (beta) in Thyristor / Diode RL circuits:
 * i(beta) = (Vm/Z) * [ sin(beta - phi) - sin(alpha - phi) * exp(-R/(omega*L) * (beta - alpha)) ] = 0
 * 
 * For Full-Wave controlled bridge:
 * - If alpha <= phi: Continuous Conduction Mode (CCM). beta = pi + alpha (gamma = pi).
 * - If alpha > phi: Discontinuous Conduction Mode (DCM).
 *   beta lies strictly in (pi, pi + alpha), solved by robust bracketed bisection.
 * 
 * For Half-Wave converter:
 * - beta lies in (pi, 2*pi), solved by bracketed bisection.
 */
export function findExtinctionAngleBeta(alphaRad, phiRad, R, omega, L, isHalfWave = false) {
  if (L <= 1e-6) {
    return Math.PI;
  }

  // Pure inductive or very large L edge case
  const factor = R / Math.max(1e-7, omega * L);
  const sinAlphaPhi = Math.sin(alphaRad - phiRad);

  function f(beta) {
    return Math.sin(beta - phiRad) - sinAlphaPhi * Math.exp(-factor * (beta - alphaRad));
  }

  if (!isHalfWave) {
    // Full-Wave Controlled Bridge Converter
    // Fundamental Law: CCM occurs if and only if alpha <= phi
    if (alphaRad <= phiRad) {
      return Math.PI + alphaRad;
    }

    // DCM: Root beta is strictly bracketed in (pi, pi + alpha)
    let low = Math.PI;
    let high = Math.PI + alphaRad;

    // Numerical safety on endpoints
    let fLow = f(low);
    let fHigh = f(high);

    if (fLow * fHigh > 0) {
      // Very close to boundary
      return high;
    }

    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      const fMid = f(mid);
      if (Math.abs(fMid) < 1e-9) return mid;
      if (fLow * fMid <= 0) {
        high = mid;
        fHigh = fMid;
      } else {
        low = mid;
        fLow = fMid;
      }
    }
    return (low + high) / 2;
  } else {
    // Half-Wave Controlled or Uncontrolled Rectifier
    let low = Math.PI;
    let high = 2 * Math.PI;

    // Check if conduction extends past 2*pi (very high inductance)
    if (f(high) > 0) {
      return 2 * Math.PI + alphaRad;
    }

    let fLow = f(low);
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      const fMid = f(mid);
      if (Math.abs(fMid) < 1e-9) return mid;
      if (fLow * fMid <= 0) {
        high = mid;
      } else {
        low = mid;
        fLow = fMid;
      }
    }
    return (low + high) / 2;
  }
}

/**
 * Run circuit simulation with rigorous steady-state physics across multiple AC cycles
 */
export function simulateCircuit(circuitParams, cycles = 2, pointsPerCycle = 1200) {
  const {
    circuitType = 'auto',
    sourceType = 'ac',
    voltage = 230,       // Vm peak amplitude for AC, or Vdc for DC
    frequency = 50,      // Hz
    firingAngleDeg = 45, // degrees (0 to 180)
    hasThyristor = false,
    hasDiode = false,
    thyristorCount = 0,
    diodeCount = 0,
    resistance = 20,     // Ohms
    inductance = 0.05,   // Henry
    isFreewheelingActive = false,
  } = circuitParams;

  const f = Math.max(1, frequency);
  const T = 1 / f;
  const omega = 2 * Math.PI * f;
  const totalTime = cycles * T;
  const totalPoints = cycles * pointsPerCycle;
  const dt = totalTime / totalPoints;

  const alphaRad = (firingAngleDeg * Math.PI) / 180;
  const R = Math.max(0.1, resistance);
  const L = Math.max(0, inductance);
  const XL = omega * L;
  const Z = Math.sqrt(R * R + XL * XL);
  const phiRad = Math.atan2(XL, R);
  const phiDeg = (phiRad * 180) / Math.PI;

  // Auto-detect circuit topology if not specified
  let effectiveType = circuitType;
  if (effectiveType === 'auto') {
    if (sourceType === 'dc') {
      effectiveType = 'dc_transient';
    } else if (circuitParams.isThreePhase || thyristorCount >= 6) {
      effectiveType = 'three_phase_thyristor';
    } else if (circuitParams.isThreePhase || diodeCount >= 6) {
      effectiveType = 'three_phase_diode';
    } else if (thyristorCount >= 3 && diodeCount >= 3) {
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

  const times = [];
  const angles = [];
  const vs = [];
  const is = [];
  const vo = [];
  const io = [];
  const va = [];
  const vb = [];
  const vc = [];
  const ia = [];
  const ib = [];
  const ic = [];
  const conductionStates = [];

  let isContinuous = false;
  let extinctionAngleRad = Math.PI;
  let conductionAngleRad = Math.PI - alphaRad;
  let criticalInductanceH = 0;

  if (effectiveType === 'full_wave_thyristor') {
    // -------------------------------------------------------------------------
    // 1. Single-Phase Full-Wave Controlled Thyristor Bridge (CCM & DCM + FWD)
    // -------------------------------------------------------------------------
    const isPureR = L <= 1e-5;
    criticalInductanceH = alphaRad < Math.PI / 2 ? (R / omega) * Math.tan(alphaRad) : Infinity;

    if (isPureR) {
      isContinuous = false;
      extinctionAngleRad = Math.PI;
      conductionAngleRad = Math.PI - alphaRad;
    } else if (isFreewheelingActive) {
      // With FWD: SCRs conduct in [alpha, pi], FWD conducts in [pi, pi + alpha]
      isContinuous = true;
      extinctionAngleRad = Math.PI + alphaRad;
      conductionAngleRad = Math.PI;
    } else {
      isContinuous = alphaRad <= phiRad;
      extinctionAngleRad = findExtinctionAngleBeta(alphaRad, phiRad, R, omega, L, false);
      conductionAngleRad = extinctionAngleRad - alphaRad;
    }

    const expPi = !isPureR ? Math.exp(-(R / (omega * L)) * Math.PI) : 0;
    const expAlpha = !isPureR ? Math.exp(-(R / (omega * L)) * alphaRad) : 0;
    const iCoeffCCM = (!isPureR && isContinuous && !isFreewheelingActive)
      ? (2 * (voltage / Z) * Math.sin(phiRad - alphaRad)) / Math.max(1e-7, 1 - expPi)
      : 0;

    const i0Fwd = (!isPureR && isFreewheelingActive)
      ? (voltage / Z) * Math.max(0, (Math.sin(phiRad) * expAlpha - Math.sin(alphaRad - phiRad) * expPi) / Math.max(1e-7, 1 - expPi))
      : 0;

    for (let step = 0; step <= totalPoints; step++) {
      const t = step * dt;
      const theta = omega * t;
      const cycleAngle = theta % (2 * Math.PI);
      const vSource = voltage * Math.sin(theta);

      times.push(t);
      angles.push((cycleAngle * 180) / Math.PI);
      vs.push(vSource);

      let vLoad = 0;
      let iLoad = 0;
      let iSource = 0;
      let activePath = 'none';

      const k = Math.floor((theta - alphaRad) / Math.PI);
      const deltaTheta = theta - (k * Math.PI + alphaRad); // in [0, pi)
      const thetaPrime = alphaRad + deltaTheta; // in [alpha, pi + alpha)
      const isEvenPulse = ((k % 2) + 2) % 2 === 0;

      if (isFreewheelingActive && !isPureR) {
        // Freewheeling Diode is active: clamps Vo >= 0
        if (thetaPrime <= Math.PI) {
          // SCRs conducting
          vLoad = voltage * Math.sin(thetaPrime);
          const factor = (R / (omega * L)) * deltaTheta;
          iLoad = Math.max(
            0,
            (voltage / Z) * Math.sin(thetaPrime - phiRad) +
              (i0Fwd - (voltage / Z) * Math.sin(alphaRad - phiRad)) * Math.exp(-factor)
          );
          iSource = isEvenPulse ? iLoad : -iLoad;
          activePath = isEvenPulse ? 'path_t1_t2' : 'path_t3_t4';
        } else {
          // FWD conducting: Vo = 0 V, Is = 0 A, Io freewheels
          vLoad = 0;
          const deltaFwd = thetaPrime - Math.PI;
          const factorPi = (R / (omega * L)) * (Math.PI - alphaRad);
          const iPi = Math.max(
            0,
            (voltage / Z) * Math.sin(Math.PI - phiRad) +
              (i0Fwd - (voltage / Z) * Math.sin(alphaRad - phiRad)) * Math.exp(-factorPi)
          );
          iLoad = Math.max(0, iPi * Math.exp(-(R / (omega * L)) * deltaFwd));
          iSource = 0;
          activePath = 'path_fwd';
        }
      } else if (isPureR) {
        if (thetaPrime <= Math.PI) {
          vLoad = voltage * Math.sin(thetaPrime);
          iLoad = vLoad / R;
          iSource = isEvenPulse ? iLoad : -iLoad;
          activePath = isEvenPulse ? 'path_t1_t2' : 'path_t3_t4';
        }
      } else if (isContinuous) {
        vLoad = voltage * Math.sin(thetaPrime);
        const thetaRel = deltaTheta;
        iLoad = Math.max(
          0,
          (voltage / Z) * Math.sin(thetaPrime - phiRad) +
            iCoeffCCM * Math.exp(-(R / (omega * L)) * thetaRel)
        );
        iSource = isEvenPulse ? iLoad : -iLoad;
        activePath = isEvenPulse ? 'path_t1_t2' : 'path_t3_t4';
      } else {
        const isConducting = deltaTheta < conductionAngleRad && thetaPrime <= extinctionAngleRad;
        if (isConducting) {
          vLoad = voltage * Math.sin(thetaPrime);
          const factor = (R / (omega * L)) * deltaTheta;
          iLoad = Math.max(
            0,
            (voltage / Z) * (Math.sin(thetaPrime - phiRad) - Math.sin(alphaRad - phiRad) * Math.exp(-factor))
          );
          iSource = isEvenPulse ? iLoad : -iLoad;
          activePath = isEvenPulse ? 'path_t1_t2' : 'path_t3_t4';
        }
      }

      vo.push(vLoad);
      io.push(iLoad);
      is.push(iSource);
      conductionStates.push(activePath);
    }
  } else if (effectiveType === 'full_wave_diode') {
    // -------------------------------------------------------------------------
    // 2. Single-Phase Full-Wave Uncontrolled Diode Bridge Rectifier (CCM)
    // -------------------------------------------------------------------------
    const isPureR = L <= 1e-5;
    isContinuous = true;
    extinctionAngleRad = Math.PI;
    conductionAngleRad = Math.PI;

    const expPi = !isPureR ? Math.exp(-(R / (omega * L)) * Math.PI) : 0;
    const iCoeffCCM = !isPureR
      ? (2 * (voltage / Z) * Math.sin(phiRad)) / Math.max(1e-7, 1 - expPi)
      : 0;

    for (let step = 0; step <= totalPoints; step++) {
      const t = step * dt;
      const theta = omega * t;
      const cycleAngle = theta % (2 * Math.PI);
      const vSource = voltage * Math.sin(theta);

      times.push(t);
      angles.push((cycleAngle * 180) / Math.PI);
      vs.push(vSource);

      const k = Math.floor(theta / Math.PI);
      const deltaTheta = theta - k * Math.PI; // in [0, pi)
      const isEvenPulse = ((k % 2) + 2) % 2 === 0;

      const vLoad = Math.abs(vSource);
      let iLoad = 0;

      if (isPureR) {
        iLoad = vLoad / R;
      } else {
        iLoad = Math.max(
          0,
          (voltage / Z) * Math.sin(deltaTheta - phiRad) +
            iCoeffCCM * Math.exp(-(R / (omega * L)) * deltaTheta)
        );
      }

      const iSource = isEvenPulse ? iLoad : -iLoad;
      let activePath = isEvenPulse ? 'path_d1_d2' : 'path_d3_d4';
      if (isFreewheelingActive && vLoad < 0.1) {
        activePath = 'path_fwd';
      }

      vo.push(vLoad);
      io.push(iLoad);
      is.push(iSource);
      conductionStates.push(activePath);
    }
  } else if (effectiveType === 'half_wave_thyristor') {
    // -------------------------------------------------------------------------
    // 3. Single-Phase Half-Wave Controlled Thyristor Rectifier (R & RL Load + FWD)
    // -------------------------------------------------------------------------
    const isPureR = L <= 1e-5;
    isContinuous = false;

    if (isPureR) {
      extinctionAngleRad = Math.PI;
      conductionAngleRad = Math.PI - alphaRad;
    } else if (isFreewheelingActive) {
      extinctionAngleRad = 2 * Math.PI;
      conductionAngleRad = Math.PI;
    } else {
      extinctionAngleRad = findExtinctionAngleBeta(alphaRad, phiRad, R, omega, L, true);
      conductionAngleRad = extinctionAngleRad - alphaRad;
    }

    for (let step = 0; step <= totalPoints; step++) {
      const t = step * dt;
      const theta = omega * t;
      const cycleAngle = theta % (2 * Math.PI);
      const vSource = voltage * Math.sin(theta);

      times.push(t);
      angles.push((cycleAngle * 180) / Math.PI);
      vs.push(vSource);

      let vLoad = 0;
      let iLoad = 0;
      let iSource = 0;
      let activePath = 'none';

      const m = Math.floor((theta - alphaRad) / (2 * Math.PI));
      const deltaTheta = theta - (2 * Math.PI * m + alphaRad); // in [0, 2*pi)
      const thetaPrime = alphaRad + deltaTheta;

      if (isFreewheelingActive && !isPureR) {
        if (thetaPrime <= Math.PI) {
          vLoad = voltage * Math.sin(thetaPrime);
          const factor = (R / (omega * L)) * deltaTheta;
          iLoad = Math.max(
            0,
            (voltage / Z) * (Math.sin(thetaPrime - phiRad) - Math.sin(alphaRad - phiRad) * Math.exp(-factor))
          );
          iSource = iLoad;
          activePath = 'path_half_wave';
        } else {
          vLoad = 0; // Clamped by FWD!
          const deltaFwd = thetaPrime - Math.PI;
          const factorPi = (R / (omega * L)) * (Math.PI - alphaRad);
          const iPi = Math.max(
            0,
            (voltage / Z) * (Math.sin(Math.PI - phiRad) - Math.sin(alphaRad - phiRad) * Math.exp(-factorPi))
          );
          iLoad = Math.max(0, iPi * Math.exp(-(R / (omega * L)) * deltaFwd));
          iSource = 0;
          activePath = iLoad > 0.05 ? 'path_fwd' : 'none';
        }
      } else if (isPureR) {
        if (thetaPrime <= Math.PI) {
          vLoad = voltage * Math.sin(thetaPrime);
          iLoad = vLoad / R;
          iSource = iLoad;
          activePath = 'path_half_wave';
        }
      } else {
        if (deltaTheta < conductionAngleRad && thetaPrime <= extinctionAngleRad) {
          vLoad = voltage * Math.sin(thetaPrime);
          const factor = (R / (omega * L)) * deltaTheta;
          iLoad = Math.max(
            0,
            (voltage / Z) * (Math.sin(thetaPrime - phiRad) - Math.sin(alphaRad - phiRad) * Math.exp(-factor))
          );
          iSource = iLoad;
          activePath = 'path_half_wave';
        }
      }

      vo.push(vLoad);
      io.push(iLoad);
      is.push(iSource);
      conductionStates.push(activePath);
    }
  } else if (effectiveType === 'half_wave_diode') {
    // -------------------------------------------------------------------------
    // 4. Single-Phase Half-Wave Uncontrolled Diode Rectifier (R & RL Load + FWD)
    // -------------------------------------------------------------------------
    const isPureR = L <= 1e-5;
    isContinuous = false;

    if (isPureR) {
      extinctionAngleRad = Math.PI;
      conductionAngleRad = Math.PI;
    } else if (isFreewheelingActive) {
      extinctionAngleRad = 2 * Math.PI;
      conductionAngleRad = Math.PI;
    } else {
      extinctionAngleRad = findExtinctionAngleBeta(0, phiRad, R, omega, L, true);
      conductionAngleRad = extinctionAngleRad;
    }

    for (let step = 0; step <= totalPoints; step++) {
      const t = step * dt;
      const theta = omega * t;
      const cycleAngle = theta % (2 * Math.PI);
      const vSource = voltage * Math.sin(theta);

      times.push(t);
      angles.push((cycleAngle * 180) / Math.PI);
      vs.push(vSource);

      let vLoad = 0;
      let iLoad = 0;
      let iSource = 0;
      let activePath = 'none';

      const m = Math.floor(theta / (2 * Math.PI));
      const deltaTheta = theta - 2 * Math.PI * m; // in [0, 2*pi)
      const thetaPrime = deltaTheta;

      if (isFreewheelingActive && !isPureR) {
        if (thetaPrime <= Math.PI) {
          vLoad = voltage * Math.sin(thetaPrime);
          const factor = (R / (omega * L)) * deltaTheta;
          iLoad = Math.max(
            0,
            (voltage / Z) * (Math.sin(thetaPrime - phiRad) + Math.sin(phiRad) * Math.exp(-factor))
          );
          iSource = iLoad;
          activePath = 'path_half_wave';
        } else {
          vLoad = 0; // Clamped by FWD!
          const deltaFwd = thetaPrime - Math.PI;
          const factorPi = (R / (omega * L)) * Math.PI;
          const iPi = Math.max(
            0,
            (voltage / Z) * (Math.sin(Math.PI - phiRad) + Math.sin(phiRad) * Math.exp(-factorPi))
          );
          iLoad = Math.max(0, iPi * Math.exp(-(R / (omega * L)) * deltaFwd));
          iSource = 0;
          activePath = iLoad > 0.05 ? 'path_fwd' : 'none';
        }
      } else if (isPureR) {
        if (thetaPrime <= Math.PI) {
          vLoad = voltage * Math.sin(thetaPrime);
          iLoad = vLoad / R;
          iSource = iLoad;
          activePath = 'path_half_wave';
        }
      } else {
        if (deltaTheta < conductionAngleRad && thetaPrime <= extinctionAngleRad) {
          vLoad = voltage * Math.sin(thetaPrime);
          const factor = (R / (omega * L)) * deltaTheta;
          iLoad = Math.max(
            0,
            (voltage / Z) * (Math.sin(thetaPrime - phiRad) + Math.sin(phiRad) * Math.exp(-factor))
          );
          iSource = iLoad;
          activePath = 'path_half_wave';
        }
      }

      vo.push(vLoad);
      io.push(iLoad);
      is.push(iSource);
      conductionStates.push(activePath);
    }
  } else if (effectiveType === 'three_phase_diode') {
    // -------------------------------------------------------------------------
    // 5. Three-Phase Uncontrolled Diode Bridge Rectifier (6 Diodes)
    // -------------------------------------------------------------------------
    const isPureR = L <= 1e-5;
    isContinuous = true;
    extinctionAngleRad = 2 * Math.PI;
    conductionAngleRad = 2 * Math.PI;

    const VmL = Math.sqrt(3) * voltage;
    const VoAvgTheor = (3 * VmL) / Math.PI;
    const iDcAvg = VoAvgTheor / R;

    for (let step = 0; step <= totalPoints; step++) {
      const t = step * dt;
      const theta = omega * t;
      const cycleAngle = theta % (2 * Math.PI);

      const vaVal = voltage * Math.sin(theta);
      const vbVal = voltage * Math.sin(theta - (2 * Math.PI) / 3);
      const vcVal = voltage * Math.sin(theta + (2 * Math.PI) / 3);

      times.push(t);
      angles.push((cycleAngle * 180) / Math.PI);
      vs.push(vaVal);
      va.push(vaVal);
      vb.push(vbVal);
      vc.push(vcVal);

      const maxPhase = Math.max(vaVal, vbVal, vcVal);
      const minPhase = Math.min(vaVal, vbVal, vcVal);
      const vLoad = maxPhase - minPhase;

      let iLoad = 0;
      if (isPureR) {
        iLoad = vLoad / R;
      } else {
        const rippleFactor = (VmL * 0.12) / Math.max(1, Math.sqrt(R * R + (6 * omega * L) ** 2));
        iLoad = Math.max(0.01, iDcAvg - rippleFactor * Math.cos(6 * theta));
      }

      let curA = 0;
      let curB = 0;
      let curC = 0;
      let activePath = 'none';

      if (vaVal === maxPhase) {
        curA = iLoad;
        if (vbVal === minPhase) {
          curB = -iLoad;
          activePath = 'path_d1_d6';
        } else {
          curC = -iLoad;
          activePath = 'path_d1_d2';
        }
      } else if (vaVal === minPhase) {
        curA = -iLoad;
        if (vbVal === maxPhase) {
          curB = iLoad;
          activePath = 'path_d3_d4';
        } else {
          curC = iLoad;
          activePath = 'path_d5_d4';
        }
      } else {
        curA = 0;
        if (vbVal === maxPhase) {
          curB = iLoad;
          curC = -iLoad;
          activePath = 'path_d3_d2';
        } else {
          curB = -iLoad;
          curC = iLoad;
          activePath = 'path_d5_d6';
        }
      }

      if (isFreewheelingActive && vLoad <= 0.05) {
        activePath = 'path_fwd';
      }

      vo.push(vLoad);
      io.push(iLoad);
      is.push(curA);
      ia.push(curA);
      ib.push(curB);
      ic.push(curC);
      conductionStates.push(activePath);
    }
  } else if (effectiveType === 'three_phase_thyristor') {
    // -------------------------------------------------------------------------
    // 6. Three-Phase Fully Controlled Rectifier (6 SCRs + FWD)
    // -------------------------------------------------------------------------
    const isPureR = L <= 1e-5;
    const VmL = Math.sqrt(3) * voltage;
    isContinuous = !isPureR && (alphaRad <= Math.PI / 3 || !isFreewheelingActive);

    const refStart = Math.PI / 6 + alphaRad;

    for (let step = 0; step <= totalPoints; step++) {
      const t = step * dt;
      const theta = omega * t;
      const cycleAngle = theta % (2 * Math.PI);

      const vaVal = voltage * Math.sin(theta);
      const vbVal = voltage * Math.sin(theta - (2 * Math.PI) / 3);
      const vcVal = voltage * Math.sin(theta + (2 * Math.PI) / 3);

      times.push(t);
      angles.push((cycleAngle * 180) / Math.PI);
      vs.push(vaVal);
      va.push(vaVal);
      vb.push(vbVal);
      vc.push(vcVal);

      const k = Math.floor((theta - refStart) / (Math.PI / 3));
      const deltaTheta = theta - (refStart + k * (Math.PI / 3)); // in [0, pi/3)
      const pulseIdx = ((k % 6) + 6) % 6;

      const vLineRaw = VmL * Math.cos(alphaRad - Math.PI / 6 + deltaTheta);

      let vLoad = vLineRaw;
      let isFreewheelingNow = false;

      if (isFreewheelingActive) {
        if (vLineRaw < 0) {
          vLoad = 0;
          isFreewheelingNow = true;
        }
      } else if (isPureR) {
        if (vLineRaw < 0) {
          vLoad = 0;
        }
      }

      let iLoad = 0;
      if (isPureR) {
        iLoad = Math.max(0, vLoad / R);
      } else {
        const VoTheor = (alphaRad <= Math.PI / 3 || !isFreewheelingActive)
          ? ((3 * VmL) / Math.PI) * Math.cos(alphaRad)
          : ((3 * VmL) / Math.PI) * (1 + Math.cos(alphaRad + Math.PI / 3));
        const iDcBase = Math.max(0, VoTheor / R);
        const rippleMag = (VmL * 0.15) / Math.max(1, Math.sqrt(R * R + (6 * omega * L) ** 2));
        iLoad = Math.max(0, iDcBase + rippleMag * Math.cos(6 * (theta - alphaRad)));
        if (isFreewheelingNow && L > 0) {
          iLoad *= Math.exp(-((R / (omega * L)) * (deltaTheta - (Math.PI / 3 - alphaRad + Math.PI / 6))));
        }
      }

      let curA = 0;
      let curB = 0;
      let curC = 0;
      let activePath = 'none';

      if (isFreewheelingNow) {
        curA = 0;
        curB = 0;
        curC = 0;
        activePath = 'path_fwd';
      } else {
        if (pulseIdx === 0) {
          curA = iLoad;
          curB = -iLoad;
          curC = 0;
          activePath = 'path_t1_t6';
        } else if (pulseIdx === 1) {
          curA = iLoad;
          curB = 0;
          curC = -iLoad;
          activePath = 'path_t1_t2';
        } else if (pulseIdx === 2) {
          curA = 0;
          curB = iLoad;
          curC = -iLoad;
          activePath = 'path_t3_t2';
        } else if (pulseIdx === 3) {
          curA = -iLoad;
          curB = iLoad;
          curC = 0;
          activePath = 'path_t3_t4';
        } else if (pulseIdx === 4) {
          curA = -iLoad;
          curB = 0;
          curC = iLoad;
          activePath = 'path_t5_t4';
        } else if (pulseIdx === 5) {
          curA = 0;
          curB = -iLoad;
          curC = iLoad;
          activePath = 'path_t5_t6';
        }
      }

      vo.push(vLoad);
      io.push(iLoad);
      is.push(curA);
      ia.push(curA);
      ib.push(curB);
      ic.push(curC);
      conductionStates.push(activePath);
    }
  } else if (effectiveType === 'three_phase_semi') {
    // -------------------------------------------------------------------------
    // 7. Three-Phase Semi-Controlled Rectifier (3 SCRs + 3 Diodes + FWD)
    // -------------------------------------------------------------------------
    const isPureR = L <= 1e-5;
    const VmL = Math.sqrt(3) * voltage;
    isContinuous = !isPureR;

    const VoAvgTheor = ((3 * VmL) / (2 * Math.PI)) * (1 + Math.cos(alphaRad));
    const iDcAvg = Math.max(0, VoAvgTheor / R);

    const refStart = Math.PI / 6 + alphaRad;

    for (let step = 0; step <= totalPoints; step++) {
      const t = step * dt;
      const theta = omega * t;
      const cycleAngle = theta % (2 * Math.PI);

      const vaVal = voltage * Math.sin(theta);
      const vbVal = voltage * Math.sin(theta - (2 * Math.PI) / 3);
      const vcVal = voltage * Math.sin(theta + (2 * Math.PI) / 3);

      times.push(t);
      angles.push((cycleAngle * 180) / Math.PI);
      vs.push(vaVal);
      va.push(vaVal);
      vb.push(vbVal);
      vc.push(vcVal);

      const k = Math.floor((theta - refStart) / (Math.PI / 3));
      const deltaTheta = theta - (refStart + k * (Math.PI / 3));
      const pulseIdx = ((k % 6) + 6) % 6;

      const vLineRaw = VmL * Math.cos(alphaRad - Math.PI / 6 + deltaTheta);

      // Semi-converter output voltage is clamped >= 0
      let vLoad = Math.max(0, vLineRaw);
      const isFreewheelingNow = vLineRaw <= 0;

      let iLoad = 0;
      if (isPureR) {
        iLoad = vLoad / R;
      } else {
        const rippleMag = (VmL * 0.15) / Math.max(1, Math.sqrt(R * R + (6 * omega * L) ** 2));
        iLoad = Math.max(0.01, iDcAvg + rippleMag * Math.cos(6 * theta));
      }

      let curA = 0;
      let curB = 0;
      let curC = 0;
      let activePath = 'none';

      if (isFreewheelingNow) {
        curA = 0;
        curB = 0;
        curC = 0;
        activePath = 'path_fwd';
      } else {
        if (pulseIdx === 0) {
          curA = iLoad;
          curB = -iLoad;
          curC = 0;
          activePath = 'path_t1_d6';
        } else if (pulseIdx === 1) {
          curA = iLoad;
          curB = 0;
          curC = -iLoad;
          activePath = 'path_t1_d2';
        } else if (pulseIdx === 2) {
          curA = 0;
          curB = iLoad;
          curC = -iLoad;
          activePath = 'path_t3_d2';
        } else if (pulseIdx === 3) {
          curA = -iLoad;
          curB = iLoad;
          curC = 0;
          activePath = 'path_t3_d4';
        } else if (pulseIdx === 4) {
          curA = -iLoad;
          curB = 0;
          curC = iLoad;
          activePath = 'path_t5_d4';
        } else if (pulseIdx === 5) {
          curA = 0;
          curB = -iLoad;
          curC = iLoad;
          activePath = 'path_t5_d6';
        }
      }

      vo.push(vLoad);
      io.push(iLoad);
      is.push(curA);
      ia.push(curA);
      ib.push(curB);
      ic.push(curC);
      conductionStates.push(activePath);
    }
  } else if (effectiveType === 'dc_transient') {
    // -------------------------------------------------------------------------
    // 5. DC Source Transient R-L Circuit
    // -------------------------------------------------------------------------
    const tau = L > 0 ? L / R : 0;
    const tFire = (alphaRad / (2 * Math.PI)) * T;

    for (let step = 0; step <= totalPoints; step++) {
      const t = step * dt;
      const vSource = voltage;
      times.push(t);
      angles.push((t / T) * 360);
      vs.push(vSource);

      let iLoad = 0;
      let vLoad = 0;
      let activePath = 'none';
      const trigTime = hasThyristor ? tFire : 0;

      if (t >= trigTime) {
        const dtCond = t - trigTime;
        iLoad = tau > 0 ? (voltage / R) * (1 - Math.exp(-dtCond / tau)) : voltage / R;
        vLoad = voltage;
        activePath = 'path_dc';
      }

      vo.push(vLoad);
      io.push(iLoad);
      is.push(iLoad);
      conductionStates.push(activePath);
    }
  } else {
    // -------------------------------------------------------------------------
    // 6. AC Series R-L Circuit (Linear Steady-State)
    // -------------------------------------------------------------------------
    for (let step = 0; step <= totalPoints; step++) {
      const t = step * dt;
      const theta = omega * t;
      const cycleAngle = theta % (2 * Math.PI);
      const vSource = voltage * Math.sin(theta);

      times.push(t);
      angles.push((cycleAngle * 180) / Math.PI);
      vs.push(vSource);

      const iVal = (voltage / Z) * Math.sin(theta - phiRad);
      vo.push(vSource);
      io.push(iVal);
      is.push(iVal);
      conductionStates.push(Math.abs(iVal) > 0.05 ? 'path_ac_linear' : 'none');
    }
  }

  // ---------------------------------------------------------------------------
  // Numerical & Analytical Calculations Across Full Cycles
  // ---------------------------------------------------------------------------
  const N = totalPoints;
  let sumVo = 0;
  let sumVoSq = 0;
  let sumIo = 0;
  let sumIoSq = 0;
  let sumVsSq = 0;
  let sumIsSq = 0;
  let sumPower = 0;
  let maxVo = -Infinity;
  let minVo = Infinity;
  let maxIo = -Infinity;
  let minIo = Infinity;

  for (let i = 0; i < N; i++) {
    sumVo += vo[i];
    sumVoSq += vo[i] * vo[i];
    sumIo += io[i];
    sumIoSq += io[i] * io[i];
    sumVsSq += vs[i] * vs[i];
    sumIsSq += is[i] * is[i];
    sumPower += vo[i] * io[i];
    if (vo[i] > maxVo) maxVo = vo[i];
    if (vo[i] < minVo) minVo = vo[i];
    if (io[i] > maxIo) maxIo = io[i];
    if (io[i] < minIo) minIo = io[i];
  }

  const voAvg = sumVo / N;
  const voRms = Math.sqrt(sumVoSq / N);
  const ioAvg = sumIo / N;
  const ioRms = Math.sqrt(sumIoSq / N);
  const vsRms = Math.sqrt(sumVsSq / N);
  const isRms = Math.sqrt(sumIsSq / N);
  const activePower = sumPower / N;
  const apparentPower = vsRms * isRms;
  const powerFactor = apparentPower > 1e-4 ? Math.min(1, Math.max(0, activePower / apparentPower)) : 1;

  // Closed-Form Theoretical Values for Output Analysis
  let theoreticalVoAvg = 0;
  let theoreticalVoRms = 0;

  if (effectiveType === 'three_phase_diode') {
    const VmL = Math.sqrt(3) * voltage;
    theoreticalVoAvg = (3 * VmL) / Math.PI;
    theoreticalVoRms = voltage * Math.sqrt(1.5 + (9 * Math.sqrt(3)) / (4 * Math.PI));
  } else if (effectiveType === 'three_phase_thyristor') {
    const VmL = Math.sqrt(3) * voltage;
    if (isFreewheelingActive && alphaRad > Math.PI / 3) {
      theoreticalVoAvg = ((3 * VmL) / Math.PI) * (1 + Math.cos(alphaRad + Math.PI / 3));
      theoreticalVoRms = VmL * Math.sqrt((3 / (2 * Math.PI)) * ((2 * Math.PI / 3 - alphaRad) + 0.5 * Math.sin(2 * (alphaRad + Math.PI / 3))));
    } else {
      theoreticalVoAvg = ((3 * VmL) / Math.PI) * Math.cos(alphaRad);
      theoreticalVoRms = VmL * Math.sqrt((3 / (2 * Math.PI)) * (Math.PI / 3 + 0.5 * Math.sin(2 * Math.PI / 3) * Math.cos(2 * alphaRad)));
    }
  } else if (effectiveType === 'three_phase_semi') {
    const VmL = Math.sqrt(3) * voltage;
    theoreticalVoAvg = ((3 * VmL) / (2 * Math.PI)) * (1 + Math.cos(alphaRad));
    theoreticalVoRms = VmL * Math.sqrt((3 / (4 * Math.PI)) * ((Math.PI - alphaRad) + 0.5 * Math.sin(2 * alphaRad)));
  } else if (effectiveType === 'full_wave_thyristor') {
    if (isFreewheelingActive) {
      theoreticalVoAvg = (voltage / Math.PI) * (1 + Math.cos(alphaRad));
      theoreticalVoRms = voltage * Math.sqrt((1 / (2 * Math.PI)) * ((Math.PI - alphaRad) + Math.sin(2 * alphaRad) / 2));
    } else if (L <= 1e-5) {
      theoreticalVoAvg = (voltage / Math.PI) * (1 + Math.cos(alphaRad));
      theoreticalVoRms = voltage * Math.sqrt((1 / (2 * Math.PI)) * ((Math.PI - alphaRad) + Math.sin(2 * alphaRad) / 2));
    } else if (isContinuous) {
      theoreticalVoAvg = (2 * voltage / Math.PI) * Math.cos(alphaRad);
      theoreticalVoRms = voltage / Math.SQRT2;
    } else {
      theoreticalVoAvg = (voltage / Math.PI) * (Math.cos(alphaRad) - Math.cos(extinctionAngleRad));
      const term = (extinctionAngleRad - alphaRad) - 0.5 * (Math.sin(2 * extinctionAngleRad) - Math.sin(2 * alphaRad));
      theoreticalVoRms = voltage * Math.sqrt(Math.max(0, term) / (2 * Math.PI));
    }
  } else if (effectiveType === 'full_wave_diode') {
    theoreticalVoAvg = (2 * voltage) / Math.PI;
    theoreticalVoRms = voltage / Math.SQRT2;
  } else if (effectiveType === 'half_wave_thyristor') {
    if (isFreewheelingActive || L <= 1e-5) {
      theoreticalVoAvg = (voltage / (2 * Math.PI)) * (1 + Math.cos(alphaRad));
      theoreticalVoRms = (voltage / 2) * Math.sqrt((1 / Math.PI) * ((Math.PI - alphaRad) + Math.sin(2 * alphaRad) / 2));
    } else {
      theoreticalVoAvg = (voltage / (2 * Math.PI)) * (Math.cos(alphaRad) - Math.cos(extinctionAngleRad));
      const term = (extinctionAngleRad - alphaRad) - 0.5 * (Math.sin(2 * extinctionAngleRad) - Math.sin(2 * alphaRad));
      theoreticalVoRms = voltage * Math.sqrt(Math.max(0, term) / (4 * Math.PI));
    }
  } else if (effectiveType === 'half_wave_diode') {
    if (isFreewheelingActive || L <= 1e-5) {
      theoreticalVoAvg = voltage / Math.PI;
      theoreticalVoRms = voltage / 2;
    } else {
      theoreticalVoAvg = (voltage / (2 * Math.PI)) * (1 - Math.cos(extinctionAngleRad));
      const term = extinctionAngleRad - 0.5 * Math.sin(2 * extinctionAngleRad);
      theoreticalVoRms = (voltage / 2) * Math.sqrt(Math.max(0, term) / Math.PI);
    }
  } else if (effectiveType === 'ac_linear') {
    theoreticalVoAvg = 0;
    theoreticalVoRms = voltage / Math.SQRT2;
  } else {
    theoreticalVoAvg = voltage;
    theoreticalVoRms = voltage;
  }

  const extinctionAngleDeg = (extinctionAngleRad * 180) / Math.PI;
  const conductionAngleDeg = (conductionAngleRad * 180) / Math.PI;
  const criticalInductanceMh = isFinite(criticalInductanceH) ? criticalInductanceH * 1000 : 0;

  const isThreePhase = effectiveType.startsWith('three_phase');

  return {
    circuitType: effectiveType,
    isThreePhase,
    times,
    angles,
    vs,
    is,
    vo,
    io,
    va: isThreePhase ? va : vs,
    vb: isThreePhase ? vb : [],
    vc: isThreePhase ? vc : [],
    ia: isThreePhase ? ia : is,
    ib: isThreePhase ? ib : [],
    ic: isThreePhase ? ic : [],
    conductionStates,
    totalTime,
    period: T,
    stats: {
      isContinuous,
      conductionMode: L <= 1e-5 ? 'R Load' : (isContinuous ? 'CCM' : 'DCM'),
      vsRms: vsRms.toFixed(2),
      isRms: isRms.toFixed(2),
      voAvg: voAvg.toFixed(2),
      voRms: voRms.toFixed(2),
      ioAvg: ioAvg.toFixed(2),
      ioRms: ioRms.toFixed(2),
      maxVo: maxVo.toFixed(2),
      minVo: minVo.toFixed(2),
      maxIo: maxIo.toFixed(2),
      minIo: Math.max(0, minIo).toFixed(2),
      currentRipple: Math.max(0, maxIo - minIo).toFixed(2),
      theoreticalVoAvg: theoreticalVoAvg.toFixed(2),
      theoreticalVoRms: theoreticalVoRms.toFixed(2),
      extinctionAngleDeg: Math.min(360, extinctionAngleDeg).toFixed(1),
      conductionAngleDeg: Math.min(360, conductionAngleDeg).toFixed(1),
      powerWatts: activePower.toFixed(2),
      apparentPowerVa: apparentPower.toFixed(2),
      powerFactor: powerFactor.toFixed(3),
      impedanceZ: Z.toFixed(2),
      phasePhiDeg: phiDeg.toFixed(1),
      criticalInductanceMh: criticalInductanceMh > 0 ? criticalInductanceMh.toFixed(1) : '0',
    },
  };
}
