/**
 * ⚠️  LEGACY-IMPLEMENTIERUNG  ⚠️
 *
 * Dieser Code wird über das Doggle-Toggle 'legacy-appointment-extraction' gesteuert.
 * Er läuft nur wenn der Toggle aktiv ist (default: false = neuer Code läuft).
 *
 * Ticket zum Aufräumen: FB-002
 *
 * Was ist hier das Problem?
 *  - Kein Schema-Validierung der Groq-Antwort (JSON.parse ohne Typsicherheit)
 *  - Keine strukturierten Fehlermeldungen
 *  - `missing_info` wird nicht validiert
 *
 * NICHT EDITIEREN – alter Code bleibt hier eingefroren bis Toggle entfernt wird.
 */

import OpenAI from 'openai';

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
});

export type ChatMessage = { role: string; content: string };

export interface LegacyAppointmentData {
    date: string | null;
    time: string | null;
    service: string | null;
    missing_info: string[];
}

/**
 * @deprecated Wird über Doggle 'legacy-appointment-extraction' injiziert.
 * Verwende stattdessen extractAppointment aus features/appointment-extraction.
 */
export async function legacyExtractAppointment(
    messages: ChatMessage[],
): Promise<LegacyAppointmentData> {
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

    // Keine Validierung – raw JSON.parse (das ist der Legacy-Bug)
    return JSON.parse(completion.choices[0].message.content || '{}');
}
