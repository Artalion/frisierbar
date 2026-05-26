/**
 * Doggle Framework – Toggle-Auflösung
 *
 * Priorität (höchste zuerst):
 *  1. Runtime-Overrides  (gesetzt via setDoggleOverride – ideal für Tests/Previews)
 *  2. Umgebungsvariablen (NEXT_PUBLIC_DOGGLE_<KEY>=true|false)
 *  3. Config-Default     (aus toggles.ts)
 */

import { DOGGLES, type DoggleKey } from './toggles';

// ─── Runtime-Override-Store ───────────────────────────────────────────────────
// Lebt im Modul-Scope → einmal gesetzt, gilt für alle nachfolgenden Aufrufe
// (auf dem Server pro Request isoliert, im Browser über die Session).
const runtimeOverrides: Partial<Record<DoggleKey, boolean>> = {};

/** Setzt einen Toggle zur Laufzeit (z. B. in Tests oder Preview-Mode). */
export function setDoggleOverride(key: DoggleKey, value: boolean): void {
  runtimeOverrides[key] = value;
}

/** Entfernt alle Runtime-Overrides (nützlich zwischen Tests). */
export function clearDoggleOverrides(): void {
  for (const k of Object.keys(runtimeOverrides) as DoggleKey[]) {
    delete runtimeOverrides[k];
  }
}

/**
 * Gibt zurück, ob der Legacy-Code für diesen Key aktiv ist.
 *
 *  true  → Legacy-Implementierung läuft
 *  false → Neue Implementierung läuft (Normalfall)
 */
export function isDoggleActive(key: DoggleKey): boolean {
  // 1. Runtime-Override
  if (key in runtimeOverrides) {
    return runtimeOverrides[key]!;
  }

  // 2. Umgebungsvariable
  //    NEXT_PUBLIC_DOGGLE_LEGACY_CHAT_STREAMING=true
  const envKey = `NEXT_PUBLIC_DOGGLE_${key.toUpperCase().replace(/-/g, '_')}`;
  const envVal = typeof process !== 'undefined' ? process.env[envKey] : undefined;
  if (envVal !== undefined) {
    return envVal === 'true' || envVal === '1';
  }

  // 3. Config-Default
  return DOGGLES[key].default;
}

/**
 * Gibt alle aktuellen Toggle-Zustände zurück – nützlich für Debug-Ausgaben
 * oder ein Admin-UI.
 */
export function getDoggleSnapshot(): Record<DoggleKey, boolean> {
  const snapshot = {} as Record<DoggleKey, boolean>;
  for (const key of Object.keys(DOGGLES) as DoggleKey[]) {
    snapshot[key] = isDoggleActive(key);
  }
  return snapshot;
}
