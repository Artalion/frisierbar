/**
 * Feature: Chat Streaming
 *
 * Injection-Punkt: Consumer importieren `getAiResponse` von hier.
 *
 *   import { getAiResponse } from '@/features/chat';
 *
 * Toggle-Key: 'legacy-chat-streaming'
 *   false (default) → neue Impl. mit Retry und sauberem Error-Handling
 *   true            → alte Impl. (Rollback / FB-001)
 */

import { doggleAsync } from '@/lib/doggles';
import { legacyGetAiResponse, type LegacyStreamHandlers } from './_legacy/getAiResponse';
import { getAiResponse as currentGetAiResponse, type StreamHandlers } from './getAiResponse';

// Die Signaturen sind kompatibel genug – beide haben (messages, handlers)
// Für den Toggle verwenden wir den gemeinsamen Basis-Typ.
type AnyStreamHandlers = StreamHandlers & LegacyStreamHandlers;

type StreamFn = (
    messages: { role: 'user' | 'assistant'; content: string }[],
    handlers: AnyStreamHandlers,
) => Promise<void>;

export type { StreamHandlers } from './getAiResponse';
export type { AiStreamError } from './getAiResponse';

/**
 * Streamt eine AI-Antwort.
 *
 * Die konkrete Implementierung wird via Doggle-Toggle injiziert:
 *  - Standard: neue Impl. mit Retry (FB-001 geschlossen)
 *  - Legacy:   alte Impl. (NEXT_PUBLIC_DOGGLE_LEGACY_CHAT_STREAMING=true)
 */
export const getAiResponse: StreamFn = doggleAsync(
    'legacy-chat-streaming',
    {
        legacy:  legacyGetAiResponse as StreamFn,
        current: currentGetAiResponse as StreamFn,
    },
);
