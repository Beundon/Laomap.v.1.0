/**
 * App.tsx
 * -----------------------------------------------------------------------
 * Top-level wiring: runs the boot detection sequence, then renders the
 * map, HUD, top bar, and tool panels once a region config is resolved.
 * -----------------------------------------------------------------------
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useLaosBootSequence } from './hooks/useLaosBootSequence';
import BootSplash from './components/BootSplash';
import TopBar from './components/TopBar';
import FieldHud from './components/FieldHud';
import MapView from './components/MapView';
import MeasurementPanel from './components/MeasurementPanel';
import ImportPanel from './components/ImportPanel';
import db from './storage/db';
import type { LatLng } from './core/measurementEngine';
import { measureLineDistance, measurePolygonArea } from './core/measurementEngine';
import { exportTrackAsKml, exportTrackAsGpx, type TrackPoint } from './core/exportEngine';
import { formatIctIso8601 } from './core/timeEngine';
import './App.css';

export default function App() {
  const { config, liveGps, gpsError } = useLaosBootSequence();
  const [showImport, setShowImport] = useState(false);
  const [activeTool, setActiveTool] = useState<'none' | 'distance' | 'area'>('none');
  const [toolPoints, setToolPoints] = useState<LatLng[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [trackPoints, setTrackPoints] = useState<TrackPoint[]>([]);
  const recordWatchId = useRef<number | null>(null);

  const storedLayers = useLiveQuery(() => db.layers.toArray(), []) ?? [];

  const handleMapClick = useCallback(
    (point: LatLng) => {
      if (activeTool === 'none') return;
      setToolPoints((prev) => [...prev, point]);
    },
    [activeTool],
  );

  function handleSelectTool(tool: 'none' | 'distance' | 'area') {
    setActiveTool(tool);
    setToolPoints([]);
  }

  function handleUndo() {
    setToolPoints((prev) => prev.slice(0, -1));
  }

  function handleClear() {
    setToolPoints([]);
  }

  async function handleSaveMeasurement() {
    if (activeTool === 'distance') {
      const result = measureLineDistance(toolPoints);
      await db.measurements.add({
        kind: 'distance',
        name: 'Distance ' + formatIctIso8601(),
        points: toolPoints,
        resultMeters: result.meters,
        createdAtIct: formatIctIso8601(),
      });
    } else if (activeTool === 'area') {
      const result = measurePolygonArea(toolPoints);
      await db.measurements.add({
        kind: 'area',
        name: 'Area ' + formatIctIso8601(),
        points: toolPoints,
        resultSquareMeters: result.squareMeters,
        createdAtIct: formatIctIso8601(),
      });
    }
    setToolPoints([]);
    setActiveTool('none');
  }

  function toggleRecording() {
    if (isRecording) {
      if (recordWatchId.current !== null) {
        navigator.geolocation.clearWatch(recordWatchId.current);
        recordWatchId.current = null;
      }
      setIsRecording(false);
      return;
    }
    setTrackPoints([]);
    setIsRecording(true);
    recordWatchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setTrackPoints((prev) => [
          ...prev,
          {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            elevationMeters: pos.coords.altitude ?? null,
            timestamp: pos.timestamp,
          },
        ]);
      },
      () => {
        /* track recording continues; HUD already surfaces GPS errors */
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    );
  }

  useEffect(() => {
    return () => {
      if (recordWatchId.current !== null) {
        navigator.geolocation.clearWatch(recordWatchId.current);
      }
    };
  }, []);

  function handleExportTrack(format: 'kml' | 'gpx') {
    if (trackPoints.length === 0) return;
    const name = 'track-' + formatIctIso8601().slice(0, 10);
    if (format === 'kml') exportTrackAsKml(name, trackPoints);
    else exportTrackAsGpx(name, trackPoints);
  }

  if (!config) {
    return <BootSplash />;
  }

  return (
    <div className="app-shell">
      <TopBar
        config={config}
        layerCount={storedLayers.length}
        isRecording={isRecording}
        trackPointCount={trackPoints.length}
        onToggleImport={() => setShowImport((v) => !v)}
        onToggleRecording={toggleRecording}
        onExportTrack={handleExportTrack}
      />

      <MapView
        config={config}
        storedLayers={storedLayers.map((l) => ({ id: l.id!, geojson: l.geojson, name: l.name }))}
        activeTool={activeTool}
        activeToolPoints={toolPoints}
        onMapClick={handleMapClick}
        trackPath={trackPoints.map((p) => ({ lat: p.lat, lng: p.lng }))}
      />

      <MeasurementPanel
        activeTool={activeTool}
        points={toolPoints}
        onSelectTool={handleSelectTool}
        onUndo={handleUndo}
        onClear={handleClear}
        onSave={handleSaveMeasurement}
      />

      {showImport && (
        <ImportPanel onClose={() => setShowImport(false)} onLayerImported={() => {}} />
      )}

      <FieldHud liveGps={liveGps} gpsError={gpsError} isIct={config.isIct} />
    </div>
  );
}
