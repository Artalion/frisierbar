import OpenAI from 'openai';
import { formatBusinessHoursForPrompt } from '@/lib/business-hours';
import { formatPreilisteDamenFuerPrompt } from '@/lib/preisliste-damen';

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
});

function buildSystemPrompt(): string {
    const today = new Date().toLocaleDateString('de-DE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    return `Du bist ein freundlicher Assistent des Friseursalons "Frisierbar".
Heute ist ${today}.

ÖFFNUNGSZEITEN:
${formatBusinessHoursForPrompt()}

${formatPreilisteDamenFuerPrompt()}

DEINE AUFGABE:
Nimm Terminanfragen entgegen und beantworte Fragen zu Leistungen und Preisen.
Wenn ein Kunde einen Termin buchen möchte, sammle der Reihe nach folgende Informationen – stelle immer nur eine Frage auf einmal:
1. Gewünschte Dienstleistung (nutze die Preisliste oben, um zu helfen)
2. Haarlänge (kurz bis 10 cm / mittel 10–30 cm / lang ab 30 cm) – nur wenn preisrelevant
3. Gewünschtes Datum
4. Gewünschte Uhrzeit

WICHTIGE REGELN:
- Wenn ein Kunde nach Preisen oder Leistungen fragt, antworte direkt anhand der Preisliste. Nenne immer den Preis für die passende Haarlänge, falls bekannt.
- Wenn ein Kunde einen Tag nennt, an dem der Salon geschlossen ist (Montag, Mittwoch oder Sonntag), erkläre dies höflich und nenne die offenen Alternativen.
- Wenn eine Uhrzeit außerhalb der Öffnungszeiten des gewünschten Tages liegt, weise den Kunden darauf hin und nenne die korrekten Zeiten für diesen Tag.
- Sobald du alle Informationen für eine Buchung hast, fasse den Termin kurz zusammen und teile mit, dass das Team ihn prüft und in Kürze bestätigt.
- Beantworte keine Fragen, die nichts mit dem Salon, den Leistungen oder Terminen zu tun haben.
- Antworte immer auf Deutsch. Halte Antworten kurz und freundlich.`;
}

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

        const stream = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: buildSystemPrompt() },
                ...messages,
            ],
            stream: true,
            max_tokens: 300,
        });

        const readable = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    const text = chunk.choices[0]?.delta?.content ?? '';
                    if (text) {
                        controller.enqueue(new TextEncoder().encode(text));
                    }
                }
                controller.close();
            },
        });

        return new Response(readable, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    } catch (error) {
        console.error('Chat API Error:', error);
        return Response.json({ error: 'Chat fehlgeschlagen' }, { status: 500 });
    }
}
