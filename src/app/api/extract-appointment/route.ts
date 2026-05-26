import { NextResponse } from 'next/server';
import { extractAppointment } from '@/features/appointment-extraction';
import { AppointmentExtractionError } from '@/features/appointment-extraction/extract';

/**
 * POST /api/extract-appointment
 *
 * Die konkrete Extraktions-Logik wird per Doggle-Toggle injiziert.
 * Toggle: 'legacy-appointment-extraction' (default: false = neue Impl.)
 *
 * Umschalten auf Legacy:
 *   NEXT_PUBLIC_DOGGLE_LEGACY_APPOINTMENT_EXTRACTION=true
 */
export async function POST(req: Request) {
    try {
        const { messages } = await req.json();
        const appointment = await extractAppointment(messages);
        return NextResponse.json(appointment);
    } catch (error) {
        if (error instanceof AppointmentExtractionError) {
            console.error('[extract-appointment] Extraction failed:', error.message, error.cause);
            return NextResponse.json(
                { error: error.message },
                { status: 422 },
            );
        }

        console.error('[extract-appointment] Unexpected error:', error);
        return NextResponse.json(
            { error: 'Failed to extract appointment info' },
            { status: 500 },
        );
    }
}
