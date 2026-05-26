/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║              DOGGLE TOGGLE REGISTRY                          ║
 * ║                                                              ║
 * ║  Das ist die EINZIGE Datei, die du anpassen musst,          ║
 * ║  wenn du ein neues Toggle definierst.                        ║
 * ║                                                              ║
 * ║  Namenskonvention: 'legacy-{feature-name}'                   ║
 * ║    default: false  → neuer Code läuft (Normalfall)           ║
 * ║    default: true   → alter Code aktiv (Notfall-Rollback)     ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Env-Override:
 *   NEXT_PUBLIC_DOGGLE_LEGACY_CHAT_STREAMING=true
 *   (Muster: NEXT_PUBLIC_DOGGLE_ + KEY.toUpperCase().replace(/-/g, '_'))
 */

import type { DoggleRegistry } from './types';

export const DOGGLES = {
  /**
   * Legacy-Streaming ohne Retry-Logik und ohne Fehler-Feedback.
   * Ticket: FB-001 – kann entfernt werden sobald neues Streaming stabil ist.
   */
  'legacy-chat-streaming': {
    description: 'Altes AI-Streaming ohne Retry und ohne strukturiertes Error-Handling',
    default: false,
    ticket: 'FB-001',
  },

  /**
   * Alte Terminextraktion (einfaches Prompt-Template ohne Zod-Validierung).
   * Ticket: FB-002
   */
  'legacy-appointment-extraction': {
    description: 'Alte Terminextraktion ohne Schema-Validierung',
    default: false,
    ticket: 'FB-002',
  },
} as const satisfies DoggleRegistry;

// ─── Abgeleitete Typen ────────────────────────────────────────────────────────
// Streng typisierter Key – verhindert Tippfehler an der Verwendungsstelle.
export type DoggleKey = keyof typeof DOGGLES;
