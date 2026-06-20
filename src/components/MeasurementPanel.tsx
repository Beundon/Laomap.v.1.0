/**
 * MeasurementPanel.tsx
 * -----------------------------------------------------------------------
 * Controls for the Distance and Area tools (spec section 4). Distance
 * displays exclusively in meters/kilometers; Area displays in both
 * square meters and hectares.
 * -----------------------------------------------------------------------
 */
import { measureLineDistance, measurePolygonArea, formatDistance, formatArea } from '../core/measurementEngine';
import type { LatLng } from '../core/measurementEngine';
import './MeasurementPanel.css';

interface MeasurementPanelProps {
  activeTool: 'none' | 'distance' | 'area';
  points: LatLng[];
  onSelectTool: (tool: 'none' | 'distance' | 'area') => void;
  onUndo: () => void;
  onClear: () => void;
  onSave: () => void;
}

export default function MeasurementPanel({
  activeTool,
  points,
  onSelectTool,
  onUndo,
  onClear,
  onSave,
}: MeasurementPanelProps) {
  const distanceResult = activeTool === 'distance' ? measureLineDistance(points) : null;
  const areaResult = activeTool === 'area' ? measurePolygonArea(points) : null;

  return (
    <div className="measure-panel">
      <div className="measure-panel__tools">
        <ToolButton
          label="Distance"
          active={activeTool === 'distance'}
          onClick={() => onSelectTool(activeTool === 'distance' ? 'none' : 'distance')}
        />
        <ToolButton
          label="Area"
          active={activeTool === 'area'}
          onClick={() => onSelectTool(activeTool === 'area' ? 'none' : 'area')}
        />
      </div>

      {activeTool !== 'none' && (
        <div className="measure-panel__readout">
          {activeTool === 'distance' && distanceResult && (
            <div className="measure-panel__value">
              {formatDistance(distanceResult.meters)}
              <span className="measure-panel__value-alt">
                ({distanceResult.kilometers.toFixed(3)} km)
              </span>
            </div>
          )}
          {activeTool === 'area' && areaResult && (
            <div className="measure-panel__value">{formatArea(areaResult.squareMeters)}</div>
          )}
          <div className="measure-panel__actions">
            <button onClick={onUndo} disabled={points.length === 0}>
              Undo point
            </button>
            <button onClick={onClear} disabled={points.length === 0}>
              Clear
            </button>
            <button className="measure-panel__save" onClick={onSave} disabled={points.length < 2}>
              Save
            </button>
          </div>
          <p className="measure-panel__hint">
            Tap the map to add {activeTool === 'distance' ? 'line' : 'polygon'} points.
          </p>
        </div>
      )}
    </div>
  );
}

function ToolButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button className={'tool-btn ' + (active ? 'tool-btn--active' : '')} onClick={onClick}>
      {label}
    </button>
  );
}
