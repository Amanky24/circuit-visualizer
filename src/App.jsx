import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Header from './components/Header';
import LeftmostSliders from './components/LeftmostSliders';
import ComponentPalette from './components/ComponentPalette';
import CircuitCanvas from './components/CircuitCanvas';
import WaveformViewer from './components/WaveformViewer';
import ComponentInspector from './components/ComponentInspector';
import ToolsExplanationModal from './components/ToolsExplanationModal';
import CircuitAnalysisPanel from './components/CircuitAnalysisPanel';
import { CIRCUIT_PRESETS, COMPONENT_CATALOG } from './constants/components';
import { simulateCircuit } from './simulation/solver';
import './App.css';

export default function App() {
  // Theme state ('dark' | 'light')
  const [theme, setTheme] = useState('dark');

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Live wire conduction glow state (shared between Palette toggle and CircuitCanvas)
  const [showConductionEffect, setShowConductionEffect] = useState(true);

  // Preset selection state (default: Full-Wave Thyristor Bridge Rectifier with R-L Load)
  const [selectedPresetId, setSelectedPresetId] = useState('full-wave-thyristor-rl');

  // Simulation execution state
  const [isSimulating, setIsSimulating] = useState(false);
  const [showToolsModal, setShowToolsModal] = useState(false);

  // Active phase angle in cycle [0, 360) for live conduction & cursor synchronization
  const [activeAngleDeg, setActiveAngleDeg] = useState(0);

  // Circuit parameters (bound to value changers & active components)
  const [circuitParams, setCircuitParams] = useState({
    circuitType: 'full_wave_thyristor',
    sourceType: 'ac',
    voltage: 230,
    frequency: 50,
    firingAngleDeg: 45,
    hasThyristor: true,
    hasDiode: false,
    resistance: 20,
    inductance: 0.05, // 50 mH in Henry
    isFreewheelingActive: false,
    cycles: 2,
  });

  // Schematic canvas components and wires
  const [components, setComponents] = useState([]);
  const [wires, setWires] = useState([]);
  const [selectedCompId, setSelectedCompId] = useState(null);

  // Toggle freewheeling diode active status across parameters and canvas components
  const handleToggleFreewheeling = useCallback(() => {
    setCircuitParams((prev) => {
      const nextActive = !prev.isFreewheelingActive;
      setComponents((compPrev) =>
        compPrev.map((c) => {
          if (c.type === 'freewheeling_diode') {
            return {
              ...c,
              props: {
                ...c.props,
                isActive: nextActive,
              },
            };
          }
          return c;
        })
      );
      return { ...prev, isFreewheelingActive: nextActive };
    });
  }, []);

  // Load a preset circuit into state
  const loadPreset = useCallback((presetId) => {
    const preset = CIRCUIT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setSelectedPresetId(presetId);
    setComponents(JSON.parse(JSON.stringify(preset.components)));
    setWires(JSON.parse(JSON.stringify(preset.wires)));
    setSelectedCompId(null);

    const hasThyristor = preset.components.some((c) => c.type === 'thyristor');
    const hasDiode = preset.components.some((c) => c.type === 'diode');
    const fwdComp = preset.components.find((c) => c.type === 'freewheeling_diode');
    const isFwdActive = Boolean(fwdComp?.props?.isActive);

    setCircuitParams((prev) => ({
      ...prev,
      circuitType: preset.circuitType || 'auto',
      sourceType: preset.sourceType || 'ac',
      voltage: preset.sourceVoltage || 230,
      frequency: preset.frequency || 50,
      firingAngleDeg: preset.firingAngle !== undefined ? preset.firingAngle : 45,
      resistance: preset.resistance || 20,
      inductance: (preset.inductance || 0) / 1000,
      hasThyristor,
      hasDiode,
      isFreewheelingActive: isFwdActive,
    }));
  }, []);

  // Initialize with Full-Wave Thyristor R-L preset on mount
  useEffect(() => {
    loadPreset('full-wave-thyristor-rl');
  }, [loadPreset]);

  // Synchronize parameter updates from Leftmost Sliders
  const handleParamChange = (key, value) => {
    setCircuitParams((prev) => {
      let updated = { ...prev };
      if (key === 'inductance') {
        updated.inductance = value / 1000;
      } else {
        updated[key] = value;
      }
      return updated;
    });

    // Also update any corresponding components on the canvas
    setComponents((prev) =>
      prev.map((c) => {
        if (key === 'firingAngleDeg' && c.type === 'thyristor') {
          return {
            ...c,
            props: { ...c.props, firingAngle: value },
          };
        }
        if (key === 'voltage' && (c.type === 'ac_source' || c.type === 'dc_source')) {
          return {
            ...c,
            props: { ...c.props, voltage: value },
          };
        }
        if (key === 'frequency' && c.type === 'ac_source') {
          return {
            ...c,
            props: { ...c.props, frequency: value },
          };
        }
        if (key === 'resistance' && c.type === 'resistor') {
          return {
            ...c,
            props: { ...c.props, resistance: value, label: `R (${value}Ω)` },
          };
        }
        if (key === 'isFreewheelingActive' && c.type === 'freewheeling_diode') {
          return {
            ...c,
            props: { ...c.props, isActive: value },
          };
        }
        if (key === 'inductance' && c.type === 'inductor') {
          return {
            ...c,
            props: { ...c.props, inductance: value, label: `L (${value}mH)` },
          };
        }
        return c;
      })
    );
  };

  const handleResetParams = () => {
    loadPreset(selectedPresetId || 'full-wave-thyristor-rl');
  };

  const handleAddComponent = (type) => {
    const catalogItem = COMPONENT_CATALOG.find((c) => c.type === type);
    if (!catalogItem) return;

    const newComp = {
      id: `c_${Date.now()}`,
      type,
      x: 300,
      y: 200,
      rotation: 0,
      props: { ...catalogItem.defaultProps },
    };

    setComponents((prev) => [...prev, newComp]);
    setSelectedCompId(newComp.id);
  };

  const handleAddComponentAt = (type, x, y) => {
    const catalogItem = COMPONENT_CATALOG.find((c) => c.type === type);
    if (!catalogItem) return;

    const newComp = {
      id: `c_${Date.now()}`,
      type,
      x,
      y,
      rotation: 0,
      props: { ...catalogItem.defaultProps },
    };

    setComponents((prev) => [...prev, newComp]);
    setSelectedCompId(newComp.id);
  };

  const handleUpdateComponentPosition = (id, x, y) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, x, y } : c))
    );
  };

  const handleRotateComponent = (id) => {
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, rotation: ((c.rotation || 0) + 90) % 360 } : c))
    );
  };

  const handleDeleteComponent = (id) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
    setWires((prev) => prev.filter((w) => w.fromComp !== id && w.toComp !== id));
    if (selectedCompId === id) setSelectedCompId(null);
  };

  const handleUpdateComponentProps = (id, newProps) => {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updatedProps = { ...c.props, ...newProps };
        if (c.type === 'thyristor' && newProps.firingAngle !== undefined) {
          setCircuitParams((p) => ({ ...p, firingAngleDeg: newProps.firingAngle }));
        }
        if (c.type === 'resistor' && newProps.resistance !== undefined) {
          setCircuitParams((p) => ({ ...p, resistance: newProps.resistance }));
        }
        if (c.type === 'inductor' && newProps.inductance !== undefined) {
          setCircuitParams((p) => ({ ...p, inductance: newProps.inductance / 1000 }));
        }
        if (c.type === 'ac_source' && newProps.voltage !== undefined) {
          setCircuitParams((p) => ({ ...p, voltage: newProps.voltage }));
        }
        return { ...c, props: updatedProps };
      })
    );
  };

  const handleAddWire = (wireData) => {
    const exists = wires.some(
      (w) =>
        (w.fromComp === wireData.fromComp &&
          w.fromPin === wireData.fromPin &&
          w.toComp === wireData.toComp &&
          w.toPin === wireData.toPin) ||
        (w.fromComp === wireData.toComp &&
          w.fromPin === wireData.toPin &&
          w.toComp === wireData.fromComp &&
          w.toPin === wireData.fromPin)
    );
    if (exists) return;

    const newWire = {
      id: `w_${Date.now()}`,
      pathRole: 'path_always',
      ...wireData,
    };
    setWires((prev) => [...prev, newWire]);
  };

  const handleDeleteWire = (wireId) => {
    setWires((prev) => prev.filter((w) => w.id !== wireId));
  };

  const handleClearCanvas = () => {
    setComponents([]);
    setWires([]);
    setSelectedCompId(null);
    setSelectedPresetId('');
  };

  const circuitValidation = useMemo(() => {
    const hasSource = components.some((c) => c.type === 'ac_source' || c.type === 'dc_source');
    const hasLoad = components.some((c) => c.type === 'resistor' || c.type === 'inductor');
    const thyristorCount = components.filter((c) => c.type === 'thyristor').length;
    const diodeCount = components.filter((c) => c.type === 'diode').length;

    if (components.length === 0) {
      return { isValid: false, message: 'Canvas empty — place components or load preset' };
    }
    if (!hasSource) {
      return { isValid: false, message: 'Missing Voltage Source (AC or DC)' };
    }
    if (!hasLoad) {
      return { isValid: false, message: 'Missing Load element (Resistor or Inductor)' };
    }
    if (wires.length < 2) {
      return { isValid: false, message: 'Connect components with wires to complete loop' };
    }

    let typeStr = 'Direct Linear';
    if (thyristorCount >= 4) {
      typeStr = 'Full-Wave Thyristor Bridge';
    } else if (diodeCount >= 4) {
      typeStr = 'Full-Wave Diode Bridge';
    } else if (thyristorCount >= 1) {
      typeStr = 'Half-Wave Thyristor Controlled';
    } else if (diodeCount >= 1) {
      typeStr = 'Half-Wave Diode Rectified';
    }

    return { isValid: true, message: `Circuit Ready: ${typeStr} Loop Active` };
  }, [components, wires]);

  // Compute effective circuit parameters considering active schematic components
  const effectiveParams = useMemo(() => {
    const thyristorCount = components.filter((c) => c.type === 'thyristor').length;
    const diodeCount = components.filter((c) => c.type === 'diode').length;
    const hasDcSource = components.some((c) => c.type === 'dc_source');
    const hasAcSource = components.some((c) => c.type === 'ac_source');
    const hasThreePhaseSource = components.some((c) => c.type === 'three_phase_source');
    const isThreePhase = hasThreePhaseSource || thyristorCount >= 6 || diodeCount >= 6;

    return {
      ...circuitParams,
      isThreePhase,
      hasThyristor: thyristorCount > 0,
      hasDiode: diodeCount > 0,
      thyristorCount,
      diodeCount,
      sourceType: hasDcSource && !hasAcSource && !hasThreePhaseSource ? 'dc' : 'ac',
    };
  }, [circuitParams, components]);

  // Run physics simulation whenever parameters change (and simulation is active)
  const simulationResult = useMemo(() => {
    if (!isSimulating) return null;
    return simulateCircuit(effectiveParams, circuitParams.cycles || 2, 1200);
  }, [isSimulating, effectiveParams, circuitParams.cycles]);

  const selectedComponent = components.find((c) => c.id === selectedCompId);

  return (
    <div className="circuit-app-root" data-theme={theme}>
      {/* Top Header Bar */}
      <Header
        selectedPresetId={selectedPresetId}
        onSelectPreset={loadPreset}
        isSimulating={isSimulating}
        onToggleSimulation={() => setIsSimulating((prev) => !prev)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onResetCanvas={() => loadPreset(selectedPresetId || 'full-wave-thyristor-rl')}
      />

      {/* 2-Column Studio Workbench: 50% Left (Circuit -> Sliders -> Analytics) | 50% Right (Waveform Plots) */}
      <main className="studio-main-layout">
        {/* LEFT 50% COLUMN: CIRCUIT -> SLIDERS -> ANALYTICS */}
        <section className="studio-left-column" aria-label="Circuit Construction, Controls & In-depth Analysis">
          {/* 1. Circuit Construction & Interactive Canvas */}
          <div className="workbench-circuit-section">
            <ComponentPalette
              onAddComponent={handleAddComponent}
              showConductionEffect={showConductionEffect}
              onToggleGlow={() => setShowConductionEffect((prev) => !prev)}
            />

            <div className="canvas-and-inspector-container">
              <CircuitCanvas
                components={components}
                wires={wires}
                selectedCompId={selectedCompId}
                onSelectComponent={setSelectedCompId}
                onUpdateComponentPosition={handleUpdateComponentPosition}
                onRotateComponent={handleRotateComponent}
                onDeleteComponent={handleDeleteComponent}
                onAddComponentAt={handleAddComponentAt}
                onAddWire={handleAddWire}
                onDeleteWire={handleDeleteWire}
                onClearCanvas={handleClearCanvas}
                onLoadPreset={loadPreset}
                circuitValidation={circuitValidation}
                isSimulating={isSimulating}
                simulationResult={simulationResult}
                activeAngleDeg={activeAngleDeg}
                onAngleChange={setActiveAngleDeg}
                showConductionEffect={showConductionEffect}
                onToggleFreewheeling={handleToggleFreewheeling}
                isFreewheelingActive={circuitParams.isFreewheelingActive}
              />

              {/* Inspector drawer for selected component */}
              {selectedComponent && (
                <ComponentInspector
                  component={selectedComponent}
                  onUpdateProps={handleUpdateComponentProps}
                  onRotate={handleRotateComponent}
                  onDelete={handleDeleteComponent}
                  onClose={() => setSelectedCompId(null)}
                />
              )}
            </div>
          </div>

          {/* 2. Component Value Sliders (Parameter Console) */}
          <div className="workbench-sliders-section">
            <LeftmostSliders
              params={{
                ...circuitParams,
                inductance: Number((circuitParams.inductance * 1000).toFixed(4)),
              }}
              onParamChange={handleParamChange}
              isSimulating={isSimulating}
              onToggleSimulation={() => setIsSimulating((prev) => !prev)}
              onResetParams={handleResetParams}
            />
          </div>

          {/* 3. Analytic Stuff: Physical Explanations & Step-by-Step Mathematical Derivations */}
          <div className="workbench-analytics-section">
            <CircuitAnalysisPanel
              circuitParams={effectiveParams}
              simulationResult={simulationResult}
              isSimulating={isSimulating}
              activeAngleDeg={activeAngleDeg}
            />
          </div>
        </section>

        {/* RIGHT 50% COLUMN: OSCILLOSCOPE WAVEFORM PLOTS */}
        <section className="studio-right-column" aria-label="Oscilloscope Waveform Plots">
          <WaveformViewer
            simulationResult={simulationResult}
            isSimulating={isSimulating}
            onStartSimulation={() => setIsSimulating(true)}
            circuitParams={effectiveParams}
            onHoverAngle={setActiveAngleDeg}
          />
        </section>
      </main>

      {/* Tools & Architecture Explanation Modal */}
      <ToolsExplanationModal
        isOpen={showToolsModal}
        onClose={() => setShowToolsModal(false)}
      />
    </div>
  );
}
