/**
 * MapView.tsx
 * -----------------------------------------------------------------------
 * Core map surface. Forces OpenTopoMap as the default basemap (spec
 * requires a free contour-line topo layer), centers/locks on Laos per
 * the resolved AppRegionConfig, and renders imported layers, tracks, and
 * in-progress measurement geometry.
 * -----------------------------------------------------------------------
 */
import { MapContainer, TileLayer, Polyline, Polygon, GeoJSON, useMapEvents, Marker, Popup } from 'react-leaflet';
import { useMemo } from 'react';
import L from 'leaflet';
import type { FeatureCollection } from 'geojson';
import { LAOS_BBOX } from '../core/laosGeo';
import type { AppRegionConfig } from '../core/bootDetection';
import type { LatLng } from '../core/measurementEngine';

// Leaflet's default marker icons reference image paths that don't survive
// bundling; point them at the CDN-hosted assets explicitly.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  config: AppRegionConfig;
  storedLayers: { id: number; geojson: FeatureCollection; name: string }[];
  activeToolPoints: LatLng[];
  activeTool: 'none' | 'distance' | 'area';
  onMapClick: (point: LatLng) => void;
  trackPath: LatLng[];
}

function ClickHandler({ onClick }: { onClick: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapView({
  config,
  storedLayers,
  activeToolPoints,
  activeTool,
  onMapClick,
  trackPath,
}: MapViewProps) {
  const laosBounds = useMemo<L.LatLngBoundsExpression>(
    () => [
      [LAOS_BBOX.minLat, LAOS_BBOX.minLon],
      [LAOS_BBOX.maxLat, LAOS_BBOX.maxLon],
    ],
    [],
  );

  return (
    <MapContainer
      center={config.initialCenter}
      zoom={config.initialZoom}
      maxBounds={config.lockViewportToLaos ? laosBounds : undefined}
      maxBoundsViscosity={config.lockViewportToLaos ? 0.8 : 0}
      minZoom={config.lockViewportToLaos ? 6 : 2}
      className="map-root"
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
        attribution="Map data: OpenStreetMap contributors, SRTM | Map style: OpenTopoMap (CC-BY-SA)"
        maxZoom={17}
      />

      <ClickHandler onClick={onMapClick} />

      {storedLayers.map((layer) => (
        <GeoJSON key={layer.id} data={layer.geojson} />
      ))}

      {trackPath.length > 1 && (
        <Polyline positions={trackPath.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#e8541f', weight: 3 }} />
      )}

      {activeTool === 'distance' && activeToolPoints.length > 0 && (
        <>
          <Polyline
            positions={activeToolPoints.map((p) => [p.lat, p.lng])}
            pathOptions={{ color: '#f2b657', weight: 3, dashArray: '6 4' }}
          />
          {activeToolPoints.map((p, i) => (
            <Marker key={i} position={[p.lat, p.lng]}>
              <Popup>Point {i + 1}</Popup>
            </Marker>
          ))}
        </>
      )}

      {activeTool === 'area' && activeToolPoints.length > 0 && (
        <Polygon
          positions={activeToolPoints.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: '#5fb87a', fillOpacity: 0.18, weight: 3 }}
        />
      )}
    </MapContainer>
  );
}
