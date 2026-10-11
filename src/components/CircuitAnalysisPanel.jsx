import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Calculator,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Zap,
  TrendingDown,
  Gauge,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Flame,
  Info
} from 'lucide-react';
import {
  calculateConverterMetrics,
  generateCommutationTimeline,
} from '../simulation/powerElectronicsEngine';

export default function CircuitAnalysisPanel({
  circuitParams = {},
  simulationResult = null,
  isSimulating = false,
  activeAngleDeg = 0,
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Dynamically calculate analytical and simulated power electronics metrics
  const metrics = useMemo(() => {
    return calculateConverterMetrics(circuitParams, simulationResult);
  }, [circuitParams, simulationResult]);

  // Programmatically generate commutation timeline segments and table intervals
  const { timelineSegments, timelineRows } = useMemo(() => {
    return generateCommutationTimeline(circuitParams, metrics, activeAngleDeg);
  }, [circuitParams, metrics, activeAngleDeg]);

  const {
    effectiveType,
    topologyName,
    isControlled,
    isHalfWave,
    isThreePhase,
    isInductive,
    isFreewheelingActive,
    isContinuous,
    conductionMode,
    Vm,
    VsRms,
    VmL,
    VsLRms,
    R,
    L,
    XL,
    Z,
    phiDeg,
    tauMs,
    f,
    activeAlphaDeg,
    alphaRad,
    cosAlpha,
    betaDeg,
    conductionAngleDeg,
    theoreticalVoAvg,
    theoreticalVoRms,
    simVoAvg,
    simVoRms,
    simIoAvg,
    simIoRms,
    formFactor,
    rippleFactor,
    Pdc,
    Pac,
    efficiency,
    formatted,
  } = metrics;

  return (
    <section className="circuit-analysis-panel" aria-label="Circuit Output Analysis & Derivations">
      {/* Panel Master Header */}
      <div className="analysis-header-bar">
        <div className="analysis-header-left">
          <div className="analysis-icon-box">
            <Calculator className="w-4 h-4 text-amber-400" />
          </div>
          <div className="analysis-title-group">
            <h2 className="analysis-main-title">Output Analysis & Theoretical Derivations</h2>
            <p className="analysis-sub-title">
              Mathematical derivations, operating physics, and live parametric verification
            </p>
          </div>
        </div>

        <div className="analysis-header-right">
          {/* Topology badge */}
          <span className="topology-badge">{topologyName}</span>

          {/* Clean Conduction Mode Badge: CCM / DCM */}
          <span className={`conduction-mode-pill ${isContinuous ? 'mode-ccm' : 'mode-dcm'}`}>
            {isInductive ? (isFreewheelingActive ? 'FWD Clamped' : isContinuous ? '● CCM' : '○ DCM') : 'R Load'}
          </span>

          <button
            type="button"
            className="btn-collapse-toggle"
            onClick={() => setIsExpanded((prev) => !prev)}
            title={isExpanded ? 'Collapse Analysis Panel' : 'Expand Analysis Panel'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="analysis-content-container">
          {/* Quick Metrics Bar across top: Exactly 4 Symmetric Cards */}
          <div className="analysis-metric-strip">
            <div className="metric-chip">
              <span className="metric-chip-label">{isControlled ? 'Firing Angle (α)' : 'Operating Mode'}</span>
              <span className="metric-chip-val text-purple-400">{formatted.alphaDeg}</span>
              <span className="metric-chip-sub">{formatted.alphaRad} ({formatted.alphaTimeMs})</span>
            </div>
            <div className="metric-chip">
              <span className="metric-chip-label">Average Output (Vo,avg)</span>
              <span className="metric-chip-val text-amber-400">{formatted.voAvg}</span>
              <span className="metric-chip-sub">Theory: {formatted.theoVoAvg}</span>
            </div>
            <div className="metric-chip">
              <span className="metric-chip-label">RMS Output (Vo,rms)</span>
              <span className="metric-chip-val text-emerald-400">{formatted.voRms}</span>
              <span className="metric-chip-sub">Theory: {formatted.theoVoRms}</span>
            </div>
            <div className="metric-chip">
              <span className="metric-chip-label">Ripple Factor (RF)</span>
              <span className="metric-chip-val text-rose-400">{formatted.rippleFactor}</span>
              <span className="metric-chip-sub">Form Factor: {formatted.formFactor}</span>
            </div>
          </div>

          <div className="analysis-sections-stream">
            {/* Section 1: Operating Physics */}
            <section id="sec-physics" className="analysis-section-block">
              <div className="section-block-header">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-sky-400" />
                  <h3 className="section-block-title">1. Why is Output Like This? (Physical Operating Mechanism)</h3>
                </div>
              </div>
              <div className="tab-pane-content">
                <div className="explanation-grid">
                  {/* Physical mechanism card 1 */}
                  <div className="explanation-card">
                    <div className="exp-card-header">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <h3>
                        {isControlled
                          ? `1. Gate Triggering & Firing Angle Delay (0 ≤ ωt < ${activeAlphaDeg}°)`
                          : '1. Diode Natural Forward-Bias Turn-On (ωt = 0°)'}
                      </h3>
                    </div>
                    <div className="exp-card-body">
                      {isControlled ? (
                        <>
                          <p>
                            In thyristors (SCRs), forward voltage alone cannot turn the device ON. Even though the AC source enters the positive half-cycle (v<sub>s</sub> &gt; 0), thyristors{' '}
                            <strong>{isThreePhase ? 'T₁' : isHalfWave ? 'T₁' : 'T₁ and T₂'}</strong> remain in their{' '}
                            <strong>Forward Blocking State</strong> because no gate trigger pulse has been applied yet.
                          </p>
                          <div className="exp-highlight-box">
                            <strong>Result:</strong> Conduction is delayed until ωt = α = {activeAlphaDeg}° ({formatted.alphaTimeMs}).{' '}
                            {isContinuous
                              ? 'In continuous conduction (CCM), the incoming device waits while stored inductive energy maintains circulating current.'
                              : 'Load voltage remains 0 V during this initial blocking interval.'}
                          </div>
                        </>
                      ) : (
                        <>
                          <p>
                            In uncontrolled diode converters, diodes turn ON spontaneously the moment supply voltage crosses zero and provides forward bias (v<sub>s</sub> &gt; 0).
                          </p>
                          <div className="exp-highlight-box">
                            <strong>Result:</strong> Zero gating delay (α = 0°). Conduction starts immediately without blocking dead-time.
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Physical mechanism card 2 */}
                  <div className="explanation-card">
                    <div className="exp-card-header">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <h3>
                        2. Active Rectification & Inductive Storage ({activeAlphaDeg}° ≤ ωt &lt; {isThreePhase ? `${activeAlphaDeg + 60}°` : '180°'})
                      </h3>
                    </div>
                    <div className="exp-card-body">
                      <p>
                        At ωt = α, {isControlled ? 'gate firing pulses trigger conducting devices' : 'forward voltage engages diodes'}. Load voltage matches the AC supply:
                      </p>
                      <div className="math-code-box">
                        v<sub>o</sub>(ωt) = +v<sub>s</sub>(ωt) = V<sub>m</sub> sin(ωt) = {Vm.toFixed(1)} sin(ωt) V
                      </div>
                      <p>
                        Current i<sub>o</sub>(t) rises through resistor R = {R.toFixed(1)} Ω and inductor L = {(L * 1000).toFixed(1)} mH. The magnetic field absorbs energy:
                      </p>
                      <div className="math-code-box">
                        E<sub>L</sub> = ½ L i<sub>o</sub>², v<sub>L</sub>(t) = L (di<sub>o</sub>/dt) &gt; 0 (X<sub>L</sub> = {formatted.xl})
                      </div>
                    </div>
                  </div>

                  {/* Physical mechanism card 3: Negative Voltage Excursion or FWD Clamping */}
                  <div className="explanation-card card-spotlight">
                    <div className="exp-card-header">
                      <TrendingDown className="w-4 h-4 text-rose-400" />
                      <h3>
                        {isFreewheelingActive
                          ? '3. Freewheeling Diode (FWD) Clamping — Clamped Vo ≥ 0 V'
                          : !isInductive
                          ? '3. Pure Resistive Load Commutation at 180° (Zero Excursion)'
                          : `3. Negative Voltage Excursion (180° ≤ ωt < ${isContinuous ? `${180 + activeAlphaDeg}°` : `${betaDeg.toFixed(1)}°`})`}
                      </h3>
                    </div>
                    <div className="exp-card-body">
                      {isFreewheelingActive ? (
                        <>
                          <p>
                            <strong>Freewheeling Diode eliminates negative excursion:</strong>
                          </p>
                          <ul className="exp-bullets">
                            <li>
                              At ωt = 180° (π), input voltage v<sub>s</sub> reverses polarity. The freewheeling diode (FWD) immediately becomes forward-biased and conducts.
                            </li>
                            <li>
                              <strong>Clamping action:</strong> Load voltage is held strictly at v<sub>o</sub> = 0 V, reverse-biasing and extinguishing the active SCRs naturally.
                            </li>
                            <li>
                              Inductor current freewheels harmlessly through the diode loop, converting magnetic energy into load heat instead of feeding back into the AC grid.
                            </li>
                          </ul>
                        </>
                      ) : !isInductive ? (
                        <>
                          <p>
                            <strong>Resistive Load (L = 0 mH):</strong>
                          </p>
                          <ul className="exp-bullets">
                            <li>
                              Current is in direct phase with voltage (i<sub>o</sub> = v<sub>o</sub> / R).
                            </li>
                            <li>
                              When line voltage reaches 180° (zero-crossing), load current simultaneously reaches 0 A.
                            </li>
                            <li>
                              Thyristors turn OFF naturally without any negative voltage excursion. Load voltage remains 0 V until the next firing pulse.
                            </li>
                          </ul>
                        </>
                      ) : (
                        <>
                          <p>
                            <strong>Inductive Load without FWD (L = {(L * 1000).toFixed(1)} mH):</strong>
                          </p>
                          <ul className="exp-bullets">
                            <li>
                              At ωt = 180° (π), input voltage v<sub>s</sub> crosses zero and reverses polarity (v<sub>s</sub> &lt; 0).
                            </li>
                            <li>
                              Inductor L opposes the drop in current (di/dt &lt; 0), generating a self-induced back-EMF:
                              <div className="math-inline-quote">
                                e<sub>L</sub> = -L (di<sub>o</sub>/dt) [Back-EMF forces thyristors to stay forward-biased]
                              </div>
                            </li>
                            <li>
                              <strong>Consequence:</strong> Load voltage v<sub>o</sub>(t) follows the supply into negative values. Energy is fed back into the source until{' '}
                              <strong>ωt = {isContinuous ? `${180 + activeAlphaDeg}°` : `${betaDeg.toFixed(1)}°`}</strong>.
                            </li>
                          </ul>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Physical mechanism card 4 */}
                  <div className="explanation-card">
                    <div className="exp-card-header">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      <h3>
                        4.{' '}
                        {isContinuous
                          ? `Natural / Line Commutation at ωt = ${isThreePhase ? `${30 + activeAlphaDeg + 60}°` : `${180 + activeAlphaDeg}°`}`
                          : isFreewheelingActive
                          ? `Next Pulse Gating at ωt = ${180 + activeAlphaDeg}°`
                          : `Current Extinction Commutation at ωt = β = ${betaDeg.toFixed(1)}°`}
                      </h3>
                    </div>
                    <div className="exp-card-body">
                      {isContinuous ? (
                        <>
                          <p>
                            At ωt = {isThreePhase ? `${30 + activeAlphaDeg + 60}°` : `${180 + activeAlphaDeg}°`}, gate firing pulses trigger the incoming device pair{' '}
                            <strong>{isThreePhase ? 'next phase SCRs' : 'T₃ and T₄'}</strong>.
                          </p>
                          <p>
                            Turning ON the incoming pair places line reverse bias across the previously conducting SCRs, extinguishing them cleanly without external circuitry. This is{' '}
                            <strong>Natural / Line Commutation</strong>.
                          </p>
                          <div className="exp-highlight-box">
                            Output voltage flips to the positive rectified envelope, repeating symmetrically.
                          </div>
                        </>
                      ) : isFreewheelingActive ? (
                        <>
                          <p>
                            Freewheeling current naturally decays through load resistance R. When the next gate pulse arrives at ωt = {180 + activeAlphaDeg}°, the incoming devices take over smoothly.
                          </p>
                          <div className="exp-highlight-box">
                            Rectifier switches between active supply and zero-voltage freewheeling intervals.
                          </div>
                        </>
                      ) : (
                        <>
                          <p>
                            In discontinuous conduction mode (DCM), stored inductive energy is fully exhausted at extinction angle β = {betaDeg.toFixed(1)}°.
                          </p>
                          <p>
                            Current drops below holding current (I<sub>H</sub>) to zero, turning off the thyristors naturally. The circuit remains in a zero-current blocking state until the next pulse at {180 + activeAlphaDeg}°.
                          </p>
                          <div className="exp-highlight-box">
                            Extinction angle β = {betaDeg.toFixed(1)}° (conduction angle γ = {formatted.gammaDeg}).
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: Derivation of Vo(avg) */}
            <section id="sec-derivation-avg" className="analysis-section-block">
              <div className="section-block-header">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" />
                  <h3 className="section-block-title">2. Analytical Derivation of Average Output Voltage (Vo,avg)</h3>
                </div>
              </div>
              <div className="tab-pane-content">
                <div className="derivation-container">
                  <div className="derivation-header">
                    <h3>Analytical Derivation of Average Output Voltage (V<sub>o,avg</sub>)</h3>
                    <p>Step-by-step calculus integration over the active conduction period with live parametric substitution</p>
                  </div>

                  {/* Step 1: Definition */}
                  <div className="derivation-step">
                    <div className="step-badge">Step 1</div>
                    <div className="step-details">
                      <h4>Fundamental Definition of Average Value</h4>
                      <p>
                        The average output voltage is defined as the definite integral of instantaneous load voltage v<sub>o</sub>(ωt) over one fundamental cycle period:
                      </p>
                      <div className="math-step-formula">
                        <div className="math-display">
                          <span className="var">V</span><sub>o,avg</sub> ={' '}
                          <span className="fraction">
                            <span className="num">1</span>
                            <span className="den">{isThreePhase ? 'π/3' : isHalfWave ? '2π' : 'π'}</span>
                          </span>{' '}
                          <span className="integral">∫</span>
                          <span className="limits">
                            <span className="lim-up">{isThreePhase ? 'α + π/3' : isContinuous ? 'π + α' : isFreewheelingActive || !isInductive ? 'π' : 'β'}</span>
                            <span className="lim-low">{isControlled ? 'α' : '0'}</span>
                          </span>{' '}
                          <span className="var">v</span><sub>o</sub>(ωt) d(ωt)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Substitution of Source Function */}
                  <div className="derivation-step">
                    <div className="step-badge">Step 2</div>
                    <div className="step-details">
                      <h4>Substitute Sinusoidal Voltage Function</h4>
                      <p>
                        During the conduction interval, the load connects to the AC source v<sub>o</sub>(ωt) = {isThreePhase ? 'VmL sin(ωt)' : 'Vm sin(ωt)'}:
                      </p>
                      <div className="math-step-formula">
                        <div className="math-display">
                          <span className="var">V</span><sub>o,avg</sub> ={' '}
                          <span className="fraction">
                            <span className="num"><span className="var">V</span><sub>m{isThreePhase ? 'L' : ''}</sub></span>
                            <span className="den">{isThreePhase ? 'π/3' : isHalfWave ? '2π' : 'π'}</span>
                          </span>{' '}
                          <span className="integral">∫</span>
                          <span className="limits">
                            <span className="lim-up">{isContinuous ? 'π + α' : isFreewheelingActive || !isInductive ? 'π' : 'β'}</span>
                            <span className="lim-low">{isControlled ? 'α' : '0'}</span>
                          </span>{' '}
                          sin(ωt) d(ωt)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Integration of Sine */}
                  <div className="derivation-step">
                    <div className="step-badge">Step 3</div>
                    <div className="step-details">
                      <h4>Perform Definite Integration</h4>
                      <p>The antiderivative of sin(θ) is -cos(θ). Evaluating across the active integration limits:</p>
                      <div className="math-step-formula">
                        <div className="math-display">
                          <span className="var">V</span><sub>o,avg</sub> ={' '}
                          <span className="fraction">
                            <span className="num"><span className="var">V</span><sub>m{isThreePhase ? 'L' : ''}</sub></span>
                            <span className="den">{isThreePhase ? 'π/3' : isHalfWave ? '2π' : 'π'}</span>
                          </span>{' '}
                          <span className="brackets">[</span> -cos(ωt) <span className="brackets">]</span>
                          <span className="limits">
                            <span className="lim-up">{isContinuous ? 'π + α' : isFreewheelingActive || !isInductive ? 'π' : 'β'}</span>
                            <span className="lim-low">{isControlled ? 'α' : '0'}</span>
                          </span>
                        </div>
                        <div className="math-display mt-2">
                          <span className="var">V</span><sub>o,avg</sub> ={' '}
                          <span className="fraction">
                            <span className="num"><span className="var">V</span><sub>m{isThreePhase ? 'L' : ''}</sub></span>
                            <span className="den">{isThreePhase ? 'π/3' : isHalfWave ? '2π' : 'π'}</span>
                          </span>{' '}
                          <span className="parens">(</span>{' '}
                          {isContinuous ? '-cos(π + α) - (-cos α)' : isFreewheelingActive || !isInductive ? '-cos(π) - (-cos α)' : '-cos(β) - (-cos α)'}{' '}
                          <span className="parens">)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Trigonometric Simplification */}
                  <div className="derivation-step">
                    <div className="step-badge">Step 4</div>
                    <div className="step-details">
                      <h4>Trigonometric Identity Simplification</h4>
                      <p>
                        Applying algebraic simplification with active parameters:{' '}
                        {isContinuous ? (
                          <span className="highlight-tag">-cos(π + α) = +cos(α) ⇒ cos(α) + cos(α) = 2 cos(α)</span>
                        ) : isFreewheelingActive || !isInductive ? (
                          <span className="highlight-tag">-cos(π) = 1 ⇒ 1 + cos(α)</span>
                        ) : (
                          <span className="highlight-tag">cos(α) - cos(β) with β = {betaDeg.toFixed(1)}°</span>
                        )}
                      </p>
                      <div className="math-step-formula">
                        <div className="math-display">
                          {isContinuous && !isThreePhase ? (
                            <>-cos(π + α) = -(-cos α) = +cos α ⇒ V<sub>o,avg</sub> = (2 V<sub>m</sub> / π) cos α</>
                          ) : isFreewheelingActive || !isInductive ? (
                            <>-cos(π) + cos α = 1 + cos α ⇒ V<sub>o,avg</sub> = (V<sub>m</sub> / {isHalfWave ? '2π' : 'π'}) (1 + cos α)</>
                          ) : (
                            <>cos α - cos β = cos({activeAlphaDeg}°) - cos({betaDeg.toFixed(1)}°) = {(cosAlpha - Math.cos(metrics.betaRad)).toFixed(4)}</>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 5: Final Equation & Live Calculation */}
                  <div className="derivation-result-card">
                    <div className="result-card-badge">Closed-Form Result</div>
                    <div className="result-formula-display">
                      <strong>
                        {isThreePhase ? (
                          <>V<sub>o,avg</sub> = (3 V<sub>mL</sub> / π) cos(α) = {theoreticalVoAvg.toFixed(2)} V</>
                        ) : isContinuous ? (
                          <>V<sub>o,avg</sub> = <span className="fraction"><span className="num">2 V<sub>m</sub></span><span className="den">π</span></span> cos(α)</>
                        ) : isFreewheelingActive || !isInductive ? (
                          <>V<sub>o,avg</sub> = <span className="fraction"><span className="num">V<sub>m</sub></span><span className="den">{isHalfWave ? '2π' : 'π'}</span></span> (1 + cos α)</>
                        ) : (
                          <>V<sub>o,avg</sub> = <span className="fraction"><span className="num">V<sub>m</sub></span><span className="den">{isHalfWave ? '2π' : 'π'}</span></span> (cos α - cos β)</>
                        )}
                      </strong>
                    </div>

                    <div className="live-substitution-grid">
                      <div className="sub-item">
                        <span className="sub-label">1. Peak Supply Voltage (Vm):</span>
                        <span className="sub-formula">
                          Vm = <strong>{Vm.toFixed(2)} V</strong> (Supply RMS Vs = Vm/√2 = <strong>{VsRms.toFixed(2)} V</strong>)
                        </span>
                      </div>
                      <div className="sub-item">
                        <span className="sub-label">2. Firing Angle Term:</span>
                        <span className="sub-formula">
                          cos(α) = cos({activeAlphaDeg}°) = <strong>{cosAlpha.toFixed(4)}</strong> (α = {formatted.alphaRad})
                        </span>
                      </div>
                      <div className="sub-item">
                        <span className="sub-label">3. Max Rectified Average (α = 0°):</span>
                        <span className="sub-formula">
                          {isThreePhase
                            ? `(3 × ${VmL.toFixed(1)}) / π = ${((3 * VmL) / Math.PI).toFixed(2)} V`
                            : isHalfWave
                            ? `${Vm.toFixed(2)} / π = ${(Vm / Math.PI).toFixed(2)} V`
                            : `(2 × ${Vm.toFixed(2)}) / π = ${((2 * Vm) / Math.PI).toFixed(2)} V`}
                        </span>
                      </div>
                      <div className="sub-item highlight-sub">
                        <span className="sub-label">4. Theoretical Evaluated Value:</span>
                        <span className="sub-formula text-emerald-400 font-bold">
                          V<sub>o,avg</sub> = <strong>{theoreticalVoAvg.toFixed(2)} V</strong> (Simulated: <strong>{simVoAvg.toFixed(2)} V</strong>)
                        </span>
                      </div>
                    </div>

                    {/* Special Cases Info Box */}
                    <div className="special-cases-strip">
                      <div className="case-item">
                        <span className="case-title">α = 0° (Diode Baseline):</span>
                        <span className="case-val">
                          V<sub>o,avg</sub> = <strong>{((2 * Vm) / Math.PI).toFixed(1)} V</strong>
                        </span>
                      </div>
                      <div className="case-item">
                        <span className="case-title">α = 90° (Zero DC Net in CCM):</span>
                        <span className="case-val">
                          cos(90°) = 0 ⇒ V<sub>o,avg</sub> = <strong>0.00 V</strong>
                        </span>
                      </div>
                      <div className="case-item">
                        <span className="case-title">α &gt; 90° (Inverter Mode in CCM):</span>
                        <span className="case-val">
                          cos(α) &lt; 0 ⇒ V<sub>o,avg</sub> &lt; 0 (Power DC → AC)
                        </span>
                      </div>
                      <div className="case-item">
                        <span className="case-title">Pure Resistive Load (R):</span>
                        <span className="case-val">
                          V<sub>o,avg</sub> = (Vm/π)(1 + cos α) = <strong>{((Vm / Math.PI) * (1 + cosAlpha)).toFixed(1)} V</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 3: Derivation of Vo(rms) */}
            <section id="sec-derivation-rms" className="analysis-section-block">
              <div className="section-block-header">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <h3 className="section-block-title">3. Analytical Derivation of RMS Output Voltage (Vo,rms)</h3>
                </div>
              </div>
              <div className="tab-pane-content">
                <div className="derivation-container">
                  <div className="derivation-header">
                    <h3>Analytical Derivation of RMS Output Voltage (V<sub>o,rms</sub>)</h3>
                    <p>Root-Mean-Square integration for continuous, discontinuous, and clamped conduction modes</p>
                  </div>

                  <div className="derivation-step">
                    <div className="step-badge">Step 1</div>
                    <div className="step-details">
                      <h4>Fundamental Definition of Root-Mean-Square (RMS)</h4>
                      <p>The RMS value represents the effective heating equivalent of the periodic waveform:</p>
                      <div className="math-step-formula">
                        <div className="math-display">
                          <span className="var">V</span><sub>o,rms</sub> ={' '}
                          <span className="sqrt">√</span>
                          <span className="radicand">
                            <span className="fraction">
                              <span className="num">1</span>
                              <span className="den">{isHalfWave ? '2π' : 'π'}</span>
                            </span>{' '}
                            <span className="integral">∫</span>
                            <span className="limits">
                              <span className="lim-up">{isContinuous ? 'π + α' : isFreewheelingActive || !isInductive ? 'π' : 'β'}</span>
                              <span className="lim-low">{isControlled ? 'α' : '0'}</span>
                            </span>{' '}
                            <span className="var">v</span><sub>o</sub><sup>2</sup>(ωt) d(ωt)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="derivation-step">
                    <div className="step-badge">Step 2</div>
                    <div className="step-details">
                      <h4>Substitute Voltage Square & Half-Angle Identity</h4>
                      <p>Since v<sub>o</sub>(ωt) = V<sub>m</sub> sin(ωt), we apply sin²(θ) = (1 - cos 2θ) / 2:</p>
                      <div className="math-step-formula">
                        <div className="math-display">
                          <span className="var">V</span><sub>o,rms</sub> ={' '}
                          <span className="fraction">
                            <span className="num"><span className="var">V</span><sub>m</sub></span>
                            <span className="den">√π</span>
                          </span>{' '}
                          <span className="sqrt">√</span>
                          <span className="radicand">
                            <span className="integral">∫</span>
                            <span className="limits">
                              <span className="lim-up">{isContinuous ? 'π + α' : isFreewheelingActive || !isInductive ? 'π' : 'β'}</span>
                              <span className="lim-low">{isControlled ? 'α' : '0'}</span>
                            </span>{' '}
                            <span className="fraction"><span className="num">1 - cos(2ωt)</span><span className="den">2</span></span> d(ωt)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="derivation-step">
                    <div className="step-badge">Step 3</div>
                    <div className="step-details">
                      <h4>Evaluate Integral for Active Operating Mode</h4>
                      <p>
                        {isContinuous
                          ? 'In continuous conduction, integrating ½ over an interval width of π yields π/2, while the periodic cosine integrates to 0 over a half-cycle:'
                          : 'Evaluating over limits [α, β], the integral depends on conduction angle γ = β - α:'}
                      </p>
                      <div className="math-step-formula">
                        <div className="math-display">
                          {isContinuous ? (
                            <>
                              <span className="fraction"><span className="num">1</span><span className="den">π</span></span> [ ωt/2 - sin(2ωt)/4 ] = 1/2 ⇒ V<sub>o,rms</sub> = V<sub>m</sub> / √2 = {VsRms.toFixed(2)} V
                            </>
                          ) : (
                            <>
                              V<sub>o,rms</sub> = V<sub>m</sub> √[ ( (β - α) - ½(sin 2β - sin 2α) ) / (2π) ] = {theoreticalVoRms.toFixed(2)} V
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="derivation-result-card">
                    <div className="result-card-badge">Closed-Form RMS Expression</div>
                    <div className="result-formula-display">
                      <strong>
                        {isContinuous ? (
                          <>V<sub>o,rms</sub> = <span className="fraction"><span className="num">V<sub>m</sub></span><span className="den">√2</span></span> = V<sub>s,rms</sub> = {VsRms.toFixed(2)} V</>
                        ) : (
                          <>V<sub>o,rms</sub> = <strong>{theoreticalVoRms.toFixed(2)} V</strong></>
                        )}
                      </strong>
                    </div>
                    <p className="text-xs text-slate-300 mt-2">
                      <strong>Physical Insight:</strong>{' '}
                      {isContinuous
                        ? `For continuous conduction with RL load, because the waveform consists of uninterrupted segments of the sinusoidal supply (phase-shifted), its RMS value is strictly equal to AC line RMS (${VsRms.toFixed(2)} V)!`
                        : `In ${conductionMode} mode, RMS output varies with firing angle α = ${activeAlphaDeg}° and conduction duration (evaluated at ${theoreticalVoRms.toFixed(2)} V).`}
                    </p>

                    <div className="live-substitution-grid mt-3">
                      <div className="sub-item">
                        <span className="sub-label">Continuous R-L Load RMS:</span>
                        <span className="sub-formula font-mono text-emerald-400">
                          V<sub>o,rms</sub> = V<sub>m</sub> / √2 = <strong>{VsRms.toFixed(2)} V</strong>
                        </span>
                      </div>
                      <div className="sub-item">
                        <span className="sub-label">Theoretical Evaluated RMS:</span>
                        <span className="sub-formula font-mono text-amber-400">
                          V<sub>o,rms</sub> = <strong>{theoreticalVoRms.toFixed(2)} V</strong> (Simulated: <strong>{simVoRms.toFixed(2)} V</strong>)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 4: Performance, Harmonics & Quality Metrics */}
            <section id="sec-metrics" className="analysis-section-block">
              <div className="section-block-header">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-purple-400" />
                  <h3 className="section-block-title">4. Performance, Harmonic & Quality Metrics</h3>
                </div>
              </div>
              <div className="tab-pane-content">
                <div className="metrics-cards-grid">
                  {/* Card 1: Form Factor */}
                  <div className="metric-box">
                    <div className="metric-box-top">
                      <span className="metric-box-name">Form Factor (FF)</span>
                      <span className="metric-box-symbol">FF = V<sub>rms</sub> / V<sub>avg</sub></span>
                    </div>
                    <div className="metric-box-value text-amber-400">
                      {formatted.formFactor}
                    </div>
                    <div className="metric-box-desc">
                      Ratio of RMS to Average DC voltage. Ideal pure DC has FF = 1.000. Higher values denote harmonic pulsation.
                    </div>
                    <div className="metric-progress-bar">
                      <div
                        className="metric-progress-fill"
                        style={{ width: `${Math.min(100, (formFactor / 2.5) * 100)}%`, backgroundColor: '#f59e0b' }}
                      />
                    </div>
                  </div>

                  {/* Card 2: Ripple Factor */}
                  <div className="metric-box">
                    <div className="metric-box-top">
                      <span className="metric-box-name">Ripple Factor (RF)</span>
                      <span className="metric-box-symbol">RF = √(FF² - 1)</span>
                    </div>
                    <div className="metric-box-value text-rose-400">
                      {formatted.rippleFactor}
                    </div>
                    <div className="metric-box-desc">
                      Measures remaining AC ripple voltage content relative to useful DC. Uncontrolled bridge baseline: RF = 0.483.
                    </div>
                    <div className="metric-progress-bar">
                      <div
                        className="metric-progress-fill"
                        style={{ width: `${Math.min(100, (rippleFactor / 2.0) * 100)}%`, backgroundColor: '#f43f5e' }}
                      />
                    </div>
                  </div>

                  {/* Card 3: Rectification Efficiency */}
                  <div className="metric-box">
                    <div className="metric-box-top">
                      <span className="metric-box-name">Rectification Efficiency (η)</span>
                      <span className="metric-box-symbol">η = P<sub>dc</sub> / P<sub>ac</sub></span>
                    </div>
                    <div className="metric-box-value text-emerald-400">
                      {formatted.efficiency}
                    </div>
                    <div className="metric-box-desc">
                      DC power delivered to load: <strong>{formatted.pdc}</strong> compared to total apparent power: <strong>{formatted.pac}</strong>.
                    </div>
                    <div className="metric-progress-bar">
                      <div className="metric-progress-fill" style={{ width: `${efficiency}%`, backgroundColor: '#10b981' }} />
                    </div>
                  </div>

                  {/* Card 4: Load Impedance & Phase Angle */}
                  <div className="metric-box">
                    <div className="metric-box-top">
                      <span className="metric-box-name">Load Impedance (Z) & Angle (φ)</span>
                      <span className="metric-box-symbol">Z = √(R² + ω²L²)</span>
                    </div>
                    <div className="metric-box-value text-sky-400">
                      {formatted.impedance} <span className="text-xs text-slate-400">∠{formatted.phiDeg}</span>
                    </div>
                    <div className="metric-box-desc">
                      R = {R.toFixed(1)} Ω, Inductive Reactance X<sub>L</sub> = ωL = 2π({f}Hz)({(L * 1000).toFixed(1)}mH) = <strong>{formatted.xl}</strong>.
                    </div>
                  </div>

                  {/* Card 5: Inductive Time Constant */}
                  <div className="metric-box">
                    <div className="metric-box-top">
                      <span className="metric-box-name">Time Constant (τ = L/R)</span>
                      <span className="metric-box-symbol">τ = L / R</span>
                    </div>
                    <div className="metric-box-value text-purple-400">
                      {formatted.tauMs}
                    </div>
                    <div className="metric-box-desc">
                      Grid period T = {formatted.periodMs}. Ratio τ/T = {(tauMs / (1000 / f)).toFixed(3)} ({conductionMode} mode).
                    </div>
                  </div>

                  {/* Card 6: Conduction & Extinction Angles */}
                  <div className="metric-box">
                    <div className="metric-box-top">
                      <span className="metric-box-name">Conduction Angle (γ = β - α)</span>
                      <span className="metric-box-symbol">γ = {formatted.gammaDeg}</span>
                    </div>
                    <div className="metric-box-value text-teal-400">
                      {formatted.gammaDeg}
                    </div>
                    <div className="metric-box-desc">
                      Extinction angle β = <strong>{formatted.betaDeg}</strong>. Conduction is continuous when γ ≥ 180°.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5: Commutation Timeline */}
            <section id="sec-timeline" className="analysis-section-block">
              <div className="section-block-header">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <h3 className="section-block-title">5. Cycle Conduction & Commutation Timeline [0° to 360°]</h3>
                </div>
              </div>
              <div className="tab-pane-content">
                <div className="timeline-container">
                  <div className="timeline-header">
                    <h3>Cycle Conduction & Commutation Timeline [0° to 360°]</h3>
                    <p>
                      Current active cursor angle:{' '}
                      <strong className="text-amber-400 font-mono">{activeAngleDeg.toFixed(1)}°</strong>
                    </p>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="timeline-visual-bar">
                    {timelineSegments.map((segment, idx) => (
                      <div
                        key={idx}
                        className={segment.className}
                        style={{ width: `${segment.widthPct}%`, ...segment.style }}
                        title={segment.title}
                      >
                        <span>{segment.label}</span>
                      </div>
                    ))}

                    {/* Active Angle Needle */}
                    <div
                      className="timeline-angle-needle"
                      style={{ left: `${((((activeAngleDeg % 360) + 360) % 360) / 360) * 100}%` }}
                    />
                  </div>

                  {/* Interval Detail Table */}
                  <div className="timeline-table-wrapper">
                    <table className="timeline-table">
                      <thead>
                        <tr>
                          <th>Interval (ωt)</th>
                          <th>Conducting Devices</th>
                          <th>Source Voltage (vs)</th>
                          <th>Output Voltage (vo)</th>
                          <th>Inductor State (L)</th>
                          <th>Energy Flow</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timelineRows.map((row, idx) => (
                          <tr key={idx} className={row.isActive ? 'row-active' : ''}>
                            <td><strong>{row.intervalStr}</strong></td>
                            <td>{row.devices}</td>
                            <td>{row.vsStr}</td>
                            <td>{row.voStr}</td>
                            <td>{row.inductorState}</td>
                            <td>{row.energyFlow}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </section>
  );
}
