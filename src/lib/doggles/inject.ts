/**
 * Doggle Framework – Injection-API (Server & Client)
 *
 * Diese Datei stellt die "Spring-ähnliche" Injection bereit:
 * Du definierst old + new, das Framework liefert die richtige Implementierung.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  doggle()       → synchrone Wert- oder Funktions-Injection      │
 * │  doggleAsync()  → asynchrone Funktions-Injection                │
 * │  doggleLazy()   → Injection wird erst beim ersten Aufruf        │
 * │                   ausgewertet (gut für Server-seitige Toggles)  │
 * └─────────────────────────────────────────────────────────────────┘
 */

import { isDoggleActive } from './registry';
import type { DoggleKey } from './toggles';
import type { DoggleOptions } from './types';

// ─── Synchrone Injection ──────────────────────────────────────────────────────

/**
 * Gibt sofort die richtige Implementierung zurück (zum Modul-Load-Zeitpunkt).
 *
 * Geeignet für:
 *  - Konstante Werte
 *  - Funktionen, bei denen der Toggle sich nie zur Laufzeit ändert
 *
 * @example
 * const formatDate = doggle('legacy-date-format', {
 *   legacy:  legacyFormatDate,   // alter Code
 *   current: formatDate,         // neuer Code (läuft standardmäßig)
 * });
 */
export function doggle<T>(key: DoggleKey, opts: DoggleOptions<T>): T {
  return isDoggleActive(key) ? opts.legacy : opts.current;
}

// ─── Lazy Injection ───────────────────────────────────────────────────────────

/**
 * Gibt eine Wrapper-Funktion zurück, die den Toggle ERST beim Aufruf auswertet.
 * Gut für Server-seitige API-Routen, wo sich der Toggle per Env-Var
 * pro Deployment ändert.
 *
 * @example
 * const getExtractor = doggleLazy('legacy-appointment-extraction', {
 *   legacy:  () => new LegacyExtractor(),
 *   current: () => new NewExtractor(),
 * });
 * // irgendwo später:
 * const extractor = getExtractor();
 */
export function doggleLazy<T>(
  key: DoggleKey,
  opts: DoggleOptions<() => T>,
): () => T {
  return () => (isDoggleActive(key) ? opts.legacy() : opts.current());
}

// ─── Async Injection ──────────────────────────────────────────────────────────

/**
 * Erstellt eine async Funktion, die beim Aufruf den Toggle auswertet
 * und die richtige async Implementierung delegiert.
 *
 * Geeignet für API-Route-Handler, Service-Calls, Datenbankzugriffe.
 *
 * @example
 * export const extractAppointment = doggleAsync(
 *   'legacy-appointment-extraction',
 *   {
 *     legacy:  legacyExtractAppointment,   // _legacy/extractAppointment.ts
 *     current: extractAppointment,          // extractAppointment.ts (neuer Code)
 *   }
 * );
 *
 * // Verwendung – Consumer weiß nicht, welche Version läuft:
 * const result = await extractAppointment(messages);
 */
export function doggleAsync<TArgs extends unknown[], TReturn>(
  key: DoggleKey,
  opts: DoggleOptions<(...args: TArgs) => Promise<TReturn>>,
): (...args: TArgs) => Promise<TReturn> {
  return (...args: TArgs) =>
    isDoggleActive(key) ? opts.legacy(...args) : opts.current(...args);
}
