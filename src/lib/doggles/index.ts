/**
 * Doggle Framework – Public API
 *
 * Import-Pfad: '@/lib/doggles'
 *
 * ─── Server & Client ─────────────────────────────────────────────
 *  doggle()              Synchrone Injection (Wert oder Funktion)
 *  doggleAsync()         Async-Funktions-Injection
 *  doggleLazy()          Lazy-Injection (erst beim Aufruf ausgewertet)
 *  isDoggleActive()      Rohzugriff auf Toggle-Zustand
 *  setDoggleOverride()   Toggle zur Laufzeit überschreiben (Tests)
 *  clearDoggleOverrides() Alle Overrides zurücksetzen
 *  getDoggleSnapshot()   Alle aktuellen Toggle-Zustände
 *
 * ─── Nur Client ('use client') ───────────────────────────────────
 *  DoggleProvider        React Context Provider für Overrides
 *  useDoggle()           Hook: boolean für einen Toggle-Key
 *  DoggleComponent()     HOC: injiziert legacy vs. current Komponente
 *
 * ─── Typen ───────────────────────────────────────────────────────
 *  DoggleKey             Union aller definierten Toggle-Keys
 *  DoggleDefinition      Struktur einer Toggle-Definition
 *  DoggleOptions<T>      { legacy: T; current: T }
 *  DOGGLES               Das zentrale Toggle-Registry-Objekt
 */

// Core (Server + Client)
export { doggle, doggleAsync, doggleLazy } from './inject';
export {
  isDoggleActive,
  setDoggleOverride,
  clearDoggleOverrides,
  getDoggleSnapshot,
} from './registry';

// React (Client only – importiert diese Datei nie in Server-Komponenten direkt)
export { DoggleProvider, useDoggle, DoggleComponent } from './context';

// Typen
export type { DoggleKey } from './toggles';
export type { DoggleDefinition, DoggleRegistry, DoggleOptions } from './types';

// Registry-Objekt (für Debug-UIs oder Admin-Panels)
export { DOGGLES } from './toggles';
