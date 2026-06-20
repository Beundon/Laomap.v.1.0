/**
 * db.ts
 * -----------------------------------------------------------------------
 * Local offline workspace storage (spec §5 — "Local Workspace").
 *
 * Web target: IndexedDB via Dexie.
 * Mobile target (Capacitor/Android shell): the same IndexedDB store works
 * inside the WebView, so no separate SQLite/Hive layer is required for
 * the shared codebase — see android-shell/README.md for the native-bridge
 * notes on upgrading to @capacitor-community/sqlite if a future native
 * (non-WebView) rewrite is needed.
 * -----------------------------------------------------------------------
 */
import Dexie, { type EntityTable } from 'dexie';
import type { FeatureCollection } from 'geojson';

export interface StoredLayer {
  id?: number;
  name: string;
  format: string;
  geojson: FeatureCollection;
  createdAtIct: string;
  sourceFileName: string;
}

export interface StoredRasterAsset {
  id?: number;
  name: string;
  format: 'geotiff' | 'gpkg';
  blob: Blob;
  createdAtIct: string;
}

export interface StoredTrack {
  id?: number;
  name: string;
  points: { lat: number; lng: number; elevationMeters: number | null; timestamp: number }[];
  createdAtIct: string;
  distanceMeters: number;
}

export interface StoredMeasurement {
  id?: number;
  kind: 'distance' | 'area';
  name: string;
  points: { lat: number; lng: number }[];
  resultMeters?: number;
  resultSquareMeters?: number;
  createdAtIct: string;
}

const db = new Dexie('LaosFieldGisDB') as Dexie & {
  layers: EntityTable<StoredLayer, 'id'>;
  rasters: EntityTable<StoredRasterAsset, 'id'>;
  tracks: EntityTable<StoredTrack, 'id'>;
  measurements: EntityTable<StoredMeasurement, 'id'>;
};

db.version(1).stores({
  layers: '++id, name, format, createdAtIct',
  rasters: '++id, name, format, createdAtIct',
  tracks: '++id, name, createdAtIct',
  measurements: '++id, kind, name, createdAtIct',
});

export default db;
