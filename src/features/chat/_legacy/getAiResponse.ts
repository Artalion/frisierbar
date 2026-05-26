/**
 * ⚠️  LEGACY-IMPLEMENTIERUNG  ⚠️
 *
 * Toggle: 'legacy-chat-streaming' (FB-001)
 * Läuft nur wenn Toggle aktiv (default: false = neuer Code läuft).
 *
 * Was ist hier das Problem?
 *  - Kein Retry bei Netzwerkfehlern
 *  - Fehler werden nur geloggt, kein strukturiertes Feedback an UI
 *  - ReadableStream-Reader wird bei Fehler nicht geschlossen
 *
 * NICHT EDITIEREN – alter Code bleibt hier eingefroren.
 */

export interface LegacyStreamHandlers {
    onChunk: (text: string) => void;
    onComplete: (fullText: string) => void;
    onError: (msg: string) => void;
}

/**
 * @deprecated Wird über Doggle 'legacy-chat-streaming' injiziert.
 */
export async function legacyGetAiResponse(
    messages: { role: 'user' | 'assistant'; content: string }[],
    handlers: LegacyStreamHandlers,
): Promise<void> {
    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages }),
        });

        if (!res.ok || !res.body) {
            handlers.onError('Antwort fehlgeschlagen. Bitte erneut versuchen.');
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            fullText += chunk;
            handlers.onChunk(fullText);
        }

        handlers.onComplete(fullText);
    } catch {
        // Legacy: kein Retry, generische Fehlermeldung
        handlers.onError('Verbindungsfehler. Bitte Internetverbindung prüfen.');
    }
}
