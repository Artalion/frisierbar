/**
 * Feature: Appointment Extraction
 *
 * Injection-Punkt: Hier wird entschieden, ob die Legacy- oder die
 * aktuelle Implementierung verwendet wird.
 *
 * Consumer importieren einfach `extractAppointment` von hier –
 * sie müssen nicht wissen, welche Version gerade aktiv ist.
 *
 *   import { extractAppointment } from '@/features/appointment-extraction';
 *
 * Toggle-Key: 'legacy-appointment-extraction'
 *   false (default) → neue Implementierung mit Zod-Validierung
 *   true            → alte Implementierung (Rollback / FB-002)
 */

import { doggleAsync } from '@/lib/doggles';
import { legacyExtractAppointment } from './_legacy/extract';
import { extractAppointment as currentExtractAppointment } from './extract';

export type { AppointmentData } from './extract';
export type { ChatMessage } from './extract';

/**
 * Extrahiert Termindaten aus einem Chat-Verlauf.
 *
 * Die konkrete Implementierung wird via Doggle-Toggle injiziert:
 *  - Standard: neue Impl. mit Zod-Validierung
 *  - Legacy:   alte Impl. (NEXT_PUBLIC_DOGGLE_LEGACY_APPOINTMENT_EXTRACTION=true)
 */
export const extractAppointment = doggleAsync(
    'legacy-appointment-extraction',
    {
        legacy:  legacyExtractAppointment,
        current: currentExtractAppointment,
    },
);
