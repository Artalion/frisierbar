import { NextResponse } from 'next/server';
import { createCalendarEvent } from '@/lib/calendar';

export async function POST(req: Request) {
    try {
        const { date, time, service, customerName } = await req.json();

        if (!date || !time) {
            return NextResponse.json({ error: 'Date and time are required' }, { status: 400 });
        }

        const startTime = `${date}T${time}:00`; // Assuming local time or already formatted

        const event = await createCalendarEvent({
            summary: `Friseur-Termin: ${customerName || 'Gast'}`,
            description: `Leistung: ${service || 'Nicht angegeben'}`,
            startTime,
            durationMinutes: 60, // Standard 1h
        });

        return NextResponse.json({ success: true, event });
    } catch (error: any) {
        console.error('Booking API Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to book appointment' }, { status: 500 });
    }
}
