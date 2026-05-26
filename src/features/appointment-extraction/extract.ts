/**
 * Terminextraktion – aktuelle Implementierung
 *
 * Verbesserungen gegenüber Legacy:
 *  ✅ Zod-Schema-Validierung der Groq-Antwort
 *  ✅ Strukturierte Fehlermeldungen (AppointmentExtractionError)
 *  ✅ missing_info immer als string[]
 */

import OpenAI from 'openai';
import { z } from 'zod';

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
});

export type ChatMessage = { role: string; content: string };

// ─── Schema ───────────────────────────────────────────────────────────────────

const AppointmentSchema = z.object({
    date: z.string().nullable(),
    time: z.string().nullable(),
    service: z.string().nullable(),
    missing_info: z.array(z.string()).default([]),
});

export type AppointmentData = z.infer<typeof AppointmentSchema>;

export class AppointmentExtractionError extends Error {
    constructor(
        message: string,
        public readonly cause?: unknown,
    ) {
        super(message);
        this.name = 'AppointmentExtractionError';
    }
}

// ─── Implementierung ──────────────────────────────────────────────────────────

export async function extractAppointment(
    messages: ChatMessage[],
): Promise<AppointmentData> {
    let rawContent: string;

    try {
        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system' as const,
                    content: `Du bist ein Assistent für einen Friseursalon. Analysiere den Chatverlauf und extrahiere Termindetails.
Antworte ausschließlich mit einem JSON-Objekt in diesem Format:
{
  "date": "YYYY-MM-DD oder null",
  "time": "HH:mm oder null",
  "service": "Dienstleistung oder null",
  "missing_info": ["Liste fehlender Infos"]
}
Kein weiterer Text, nur das JSON.`,
                },
                {
                    role: 'user' as const,
                    content: `Chatverlauf:\n${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}`,
                },
            ],
            response_format: { type: 'json_object' },
        });

        rawContent = completion.choices[0].message.content ?? '{}';
    } catch (err) {
        throw new AppointmentExtractionError('Groq-API-Aufruf fehlgeschlagen', err);
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(rawContent);
    } catch (err) {
        throw new AppointmentExtractionError(
            `Ungültiges JSON von Groq: ${rawContent.slice(0, 100)}`,
            err,
        );
    }

    const result = AppointmentSchema.safeParse(parsed);
    if (!result.success) {
        throw new AppointmentExtractionError(
            `Schema-Validierung fehlgeschlagen: ${result.error.message}`,
            result.error,
        );
    }

    return result.data;
}
