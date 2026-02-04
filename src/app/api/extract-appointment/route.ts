import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const AppointmentSchema = z.object({
    date: z.string().nullable().describe("Das Datum des Termins im Format YYYY-MM-DD"),
    time: z.string().nullable().describe("Die Uhrzeit des Termins im Format HH:mm"),
    service: z.string().nullable().describe("Die gewünschte Dienstleistung (z.B. Haarschnitt, Färben)"),
    missing_info: z.array(z.string()).describe("Liste der fehlenden Informationen"),
});

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system" as const,
                    content: "Du bist ein Assistent für einen Friseursalon. Analysiere den Chatverlauf und extrahiere Termindetails. Wenn Informationen fehlen, gib null für das Feld zurück und liste sie in missing_info auf."
                },
                {
                    role: "user" as const,
                    content: `Chatverlauf:\n${(messages as { role: string; content: string }[]).map((m) => `${m.role}: ${m.content}`).join('\n')}`
                }
            ],
            response_format: zodResponseFormat(AppointmentSchema, "appointment"),
        });

        const appointment = JSON.parse(completion.choices[0].message.content || '{}');

        return NextResponse.json(appointment);
    } catch (error) {
        console.error('AI Extraction Error:', error);
        return NextResponse.json({ error: 'Failed to extract appointment info' }, { status: 500 });
    }
}
