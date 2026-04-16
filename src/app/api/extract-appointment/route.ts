import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
});

export async function POST(req: Request) {
    try {
        const { messages } = await req.json();

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
                    content: `Chatverlauf:\n${(messages as { role: string; content: string }[]).map((m) => `${m.role}: ${m.content}`).join('\n')}`,
                },
            ],
            response_format: { type: 'json_object' },
        });

        const appointment = JSON.parse(completion.choices[0].message.content || '{}');
        return NextResponse.json(appointment);
    } catch (error) {
        console.error('AI Extraction Error:', error);
        return NextResponse.json({ error: 'Failed to extract appointment info' }, { status: 500 });
    }
}
