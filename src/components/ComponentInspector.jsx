import React from 'react';
import { X, Settings, Trash2, RotateCw } from 'lucide-react';
import { COMPONENT_CATALOG } from '../constants/components';

export default function ComponentInspector({
  component,
  onUpdateProps,
  onRotate,
  onDelete,
  onClose,
}) {
  if (!component) return null;

  const catalogItem = COMPONENT_CATALOG.find((c) => c.type === component.type);
  const props = component.props || {};

  return (
    <div className="component-inspector-card" role="region" aria-label="Component Properties">
      <div className="inspector-header">
        <div className="flex items-center gap-1.5">
          <Settings className="w-4 h-4 text-sky-400" />
          <h4 className="inspector-title">{catalogItem?.name || 'Component'}</h4>
        </div>
        <button onClick={onClose} className="icon-btn-subtle" title="Close inspector" type="button">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="inspector-body">
        {/* Label field */}
        <div className="form-field">
          <label className="form-label">Component Label</label>
          <input
            type="text"
            className="form-input"
            value={props.label || ''}
            onChange={(e) => onUpdateProps(component.id, { label: e.target.value })}
          />
        </div>

        {/* Dynamic fields based on component type */}
        {component.type === 'ac_source' && (
          <>
            <div className="form-field">
              <label className="form-label">Peak Voltage Vm (V)</label>
              <input
                type="number"
                className="form-input"
                min="1"
                max="500"
                value={props.voltage || 230}
                onChange={(e) => onUpdateProps(component.id, { voltage: Number(e.target.value) })}
              />
            </div>
            <div className="form-field">
              <label className="form-label">Frequency f (Hz)</label>
              <input
                type="number"
                className="form-input"
                min="1"
                max="500"
                value={props.frequency || 50}
                onChange={(e) => onUpdateProps(component.id, { frequency: Number(e.target.value) })}
              />
            </div>
          </>
        )}

        {component.type === 'dc_source' && (
          <div className="form-field">
            <label className="form-label">DC Voltage Vdc (V)</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max="500"
              value={props.voltage || 100}
              onChange={(e) => onUpdateProps(component.id, { voltage: Number(e.target.value) })}
            />
          </div>
        )}

        {component.type === 'thyristor' && (
          <div className="form-field">
            <label className="form-label">Firing Angle α (Degrees: 0° - 180°)</label>
            <input
              type="number"
              className="form-input"
              min="0"
              max="180"
              value={props.firingAngle !== undefined ? props.firingAngle : 45}
              onChange={(e) => onUpdateProps(component.id, { firingAngle: Number(e.target.value) })}
            />
          </div>
        )}

        {component.type === 'resistor' && (
          <div className="form-field">
            <label className="form-label">Resistance R (Ω)</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max="10000"
              value={props.resistance || 20}
              onChange={(e) => onUpdateProps(component.id, { resistance: Number(e.target.value) })}
            />
          </div>
        )}

        {component.type === 'inductor' && (
          <div className="form-field">
            <label className="form-label">Inductance L (mH)</label>
            <input
              type="number"
              className="form-input"
              min="0"
              max="5000"
              value={props.inductance !== undefined ? props.inductance : 50}
              onChange={(e) => onUpdateProps(component.id, { inductance: Number(e.target.value) })}
            />
          </div>
        )}

        {/* Quick actions: Rotate and Delete */}
        <div className="inspector-actions">
          <button
            onClick={() => onRotate(component.id)}
            className="btn-inspector-action"
            type="button"
          >
            <RotateCw className="w-3.5 h-3.5 text-sky-400" />
            <span>Rotate 90°</span>
          </button>
          <button
            onClick={() => onDelete(component.id)}
            className="btn-inspector-delete"
            type="button"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
