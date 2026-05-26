/**
 * AI-Streaming – aktuelle Implementierung
 *
 * Verbesserungen gegenüber Legacy:
 *  ✅ 1 automatischer Retry bei Netzwerkfehler
 *  ✅ Reader wird im finally-Block geschlossen (kein Memory-Leak)
 *  ✅ HTTP-Statuscode im Fehlertext
 *  ✅ onError erhält strukturierten Fehlertyp
 */

export type AiStreamError = 'network' | 'server' | 'timeout';

export interface StreamHandlers {
    onChunk: (text: string) => void;
    onComplete: (fullText: string) => void;
    onError: (msg: string, type: AiStreamError) => void;
}

const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 800;

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptStream(
    messages: { role: 'user' | 'assistant'; content: string }[],
    handlers: StreamHandlers,
): Promise<boolean> {
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages }),
        });

        if (!res.ok || !res.body) {
            handlers.onError(
                `Server-Fehler (HTTP ${res.status}). Bitte erneut versuchen.`,
                'server',
            );
            return false;
        }

        reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value, { stream: true });
            handlers.onChunk(fullText);
        }

        handlers.onComplete(fullText);
        return true;
    } catch {
        return false; // Retry möglich
    } finally {
        try { reader?.cancel(); } catch { /* ignore */ }
    }
}

export async function getAiResponse(
    messages: { role: 'user' | 'assistant'; content: string }[],
    handlers: StreamHandlers,
): Promise<void> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            await sleep(RETRY_DELAY_MS);
        }

        const success = await attemptStream(messages, handlers);
        if (success) return;
    }

    // Alle Versuche erschöpft
    handlers.onError(
        'Verbindungsfehler nach mehreren Versuchen. Bitte Internetverbindung prüfen.',
        'network',
    );
}
