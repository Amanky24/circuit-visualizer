import React from 'react';
import { X, Wrench, Cpu, Compass, Layers, CheckCircle, Code2, LineChart } from 'lucide-react';

export default function ToolsExplanationModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-400" />
            <h2 className="modal-title">Tools & Architecture Needed to Build This App</h2>
          </div>
          <button onClick={onClose} className="modal-close-btn" type="button">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-intro">
            Building a web-based interactive circuit visualizer with real-time thyristor firing angles,
            schematic wiring, and accurate power electronics waveforms requires tools across 4 main domains:
          </p>

          <div className="tools-card-grid">
            {/* Tool Category 1 */}
            <div className="tool-category-card">
              <div className="tool-card-top">
                <Code2 className="w-5 h-5 text-sky-400" />
                <h3 className="tool-card-title">1. UI & Application Framework</h3>
              </div>
              <ul className="tool-list">
                <li>
                  <strong>React + Vite:</strong> Rapid component re-rendering, modular state management,
                  and sub-millisecond hot module replacement (HMR).
                </li>
                <li>
                  <strong>Lucide Icons:</strong> Crisp engineering and control interface icons.
                </li>
                <li>
                  <strong>CSS Grid & Flexbox:</strong> Three-column synchronized workbench
                  (Leftmost Controls &rarr; Schematic Canvas &rarr; Oscilloscope).
                </li>
              </ul>
            </div>

            {/* Tool Category 2 */}
            <div className="tool-category-card">
              <div className="tool-card-top">
                <Compass className="w-5 h-5 text-purple-400" />
                <h3 className="tool-card-title">2. Circuit Schematic & Wiring Engine</h3>
              </div>
              <ul className="tool-list">
                <li>
                  <strong>Scalable Vector Graphics (SVG):</strong> Resolution-independent IEEE/ANSI symbols
                  (Thyristor SCR with gate pin, AC/DC sources, inductors, resistors, diodes).
                </li>
                <li>
                  <strong>Orthogonal Wire Routing:</strong> Dynamic connection algorithms calculating terminal
                  pins with rotational transforms and orthogonal mid-point bends.
                </li>
                <li>
                  <strong>Spatial Snapping:</strong> 20px magnetic grid snapping for clean engineering layouts.
                </li>
              </ul>
            </div>

            {/* Tool Category 3 */}
            <div className="tool-category-card">
              <div className="tool-card-top">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <h3 className="tool-card-title">3. Physics & Simulation Mathematics</h3>
              </div>
              <ul className="tool-list">
                <li>
                  <strong>Newton-Raphson Root Finder:</strong> Calculates the exact extinction angle (β)
                  when thyristor conduction extends into the negative half-cycle due to inductive energy:
                  <div className="math-badge">
                    sin(β - ϕ) - sin(α - ϕ) · e<sup>-[R/(ωL)](β - α)</sup> = 0
                  </div>
                </li>
                <li>
                  <strong>Trapezoidal Numerical Integration:</strong> Solves DC/AC transient states and calculates
                  RMS, Average DC voltage, active power, and power factor.
                </li>
              </ul>
            </div>

            {/* Tool Category 4 */}
            <div className="tool-category-card">
              <div className="tool-card-top">
                <LineChart className="w-5 h-5 text-amber-400" />
                <h3 className="tool-card-title">4. Oscilloscope & Waveform Rendering</h3>
              </div>
              <ul className="tool-list">
                <li>
                  <strong>HTML5 Canvas / Vector SVG:</strong> 60 FPS sub-pixel antialiased waveform rendering with
                  CRT oscilloscope phosphor aesthetic.
                </li>
                <li>
                  <strong>Multi-Channel Synchronization:</strong> Dual-mode display (Stacked 4-channel scopes vs
                  Dual-calibrated Overlay mode with synchronized hover cursor crosshairs).
                </li>
                <li>
                  <strong>Data Export:</strong> Real-time CSV generation for offline engineering analysis in MATLAB or Python.
                </li>
              </ul>
            </div>
          </div>

          <div className="modal-summary-box">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              This entire stack has been built and integrated into this application right now. You can adjust the firing angle (α),
              voltage, and load parameters in real-time, wire components on the canvas, and inspect the accurate waveforms on the right!
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-modal-close" type="button">
            Got it, Back to Simulator
          </button>
        </div>
      </div>
    </div>
  );
}
