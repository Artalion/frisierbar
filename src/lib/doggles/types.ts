/**
 * Doggle Framework – Typen
 *
 * Konvention:  Toggle-Name = 'legacy-{feature}'
 *   false (default) → neuer Code läuft
 *   true            → alter Code wird injiziert (Rollback / Canary-Rückfahrt)
 */

export interface DoggleDefinition {
  /** Menschenlesbare Beschreibung des alten Verhaltens. */
  description: string;
  /**
   * Standardwert des Toggles.
   *  false = neuer Code aktiv (Normalfall)
   *  true  = Legacy-Code aktiv (z. B. nach ungewolltem Rollout)
   */
  default: boolean;
  /** Optionaler Ticket-/Issue-Link für Aufräumarbeiten. */
  ticket?: string;
}

export type DoggleRegistry = Record<string, DoggleDefinition>;

/**
 * Injection-Options – immer dieses Schema:
 *  legacy  = alter Code (läuft wenn Toggle aktiv)
 *  current = neuer Code (läuft wenn Toggle inaktiv, also Normalfall)
 */
export interface DoggleOptions<T> {
  legacy: T;
  current: T;
}
