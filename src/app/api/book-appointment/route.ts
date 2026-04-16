import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createCalendarEvent } from '@/lib/calendar';
import { isWithinBusinessHours } from '@/lib/business-hours';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
    try {
        const { date, time, service, customerName, conversationId } = await req.json();

        if (!date || !time) {
            return NextResponse.json({ error: 'Datum und Uhrzeit sind erforderlich' }, { status: 400 });
        }

        const startTime = `${date}T${time}:00`;

        // Validate against business hours
        if (!isWithinBusinessHours(startTime)) {
            return NextResponse.json(
                { error: 'Der gewählte Termin liegt außerhalb der Öffnungszeiten' },
                { status: 400 }
            );
        }

        // Look up customer_id from conversation
        let customerId: string | null = null;
        if (conversationId) {
            const { data: conv } = await supabaseAdmin
                .from('conversations')
                .select('customer_id')
                .eq('id', conversationId)
                .single();
            customerId = conv?.customer_id ?? null;
        }

        // Write to Supabase appointments table (source of truth for availability)
        if (conversationId && customerId) {
            await supabaseAdmin.from('appointments').insert({
                conversation_id: conversationId,
                customer_id: customerId,
                start_time: startTime,
                service_type: service ?? null,
                status: 'confirmed',
            });
        }

        // Sync to Google Calendar
        const event = await createCalendarEvent({
            summary: `Friseur-Termin: ${customerName || 'Gast'}`,
            description: `Leistung: ${service || 'Nicht angegeben'}`,
            startTime,
            durationMinutes: 60,
        });

        return NextResponse.json({ success: true, event });
    } catch (error: unknown) {
        console.error('Booking API Error:', error);
        const message = error instanceof Error ? error.message : 'Buchung fehlgeschlagen';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
