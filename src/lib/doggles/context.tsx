'use client';

/**
 * Doggle Framework – React-Integration
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  DoggleProvider     → setzt Overrides für Subtree (Testing/     │
 * │                        Storybook/Preview-Mode)                  │
 * │  useDoggle()        → Hook: gibt boolean zurück                 │
 * │  DoggleComponent()  → HOC: injiziert legacy vs. current         │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Warum Context?
 *  Im Browser kann sich ein Toggle zur Laufzeit ändern
 *  (z. B. Staff-Preview-Panel). Der Context löst das Re-Render aus.
 *  Auf dem Server/Static-Build reicht die Registry direkt – kein Context nötig.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { setDoggleOverride, isDoggleActive } from './registry';
import type { DoggleKey } from './toggles';

// ─── Context ──────────────────────────────────────────────────────────────────

/** Speichert nur die Overrides, die *dieser* Provider gesetzt hat. */
type DoggleContextValue = Partial<Record<DoggleKey, boolean>>;
const DoggleContext = createContext<DoggleContextValue>({});

// ─── Provider ─────────────────────────────────────────────────────────────────

interface DoggleProviderProps {
  /**
   * Toggle-Overrides für diesen Subtree.
   * Overrides aus einem äußeren Provider werden durch diesen überschrieben.
   *
   * @example
   * <DoggleProvider overrides={{ 'legacy-chat-streaming': true }}>
   *   ...
   * </DoggleProvider>
   */
  overrides?: Partial<Record<DoggleKey, boolean>>;
  children: React.ReactNode;
}

/**
 * Wrapper-Komponente, die Toggle-Overrides in den globalen Registry-Store
 * schreibt UND per Context an alle useDoggle()-Hooks signalisiert.
 *
 * Typischer Einsatz: Tests, Storybook, Staff-Preview-Panel.
 */
export function DoggleProvider({ overrides = {}, children }: DoggleProviderProps) {
  // Overrides in den globalen Store schreiben (wirkt auch auf server-seitige Calls)
  useMemo(() => {
    for (const [key, value] of Object.entries(overrides) as [DoggleKey, boolean][]) {
      setDoggleOverride(key, value);
    }
  }, [overrides]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <DoggleContext.Provider value={overrides}>
      {children}
    </DoggleContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Gibt zurück, ob der Legacy-Code für den gegebenen Key aktiv ist.
 *
 *  false → neuer Code ist aktiv (Normalfall)
 *  true  → Legacy-Code ist aktiv
 *
 * @example
 * function ChatInput() {
 *   const isLegacy = useDoggle('legacy-chat-streaming');
 *   if (isLegacy) return <LegacyChatInput />;
 *   return <NewChatInput />;
 * }
 */
export function useDoggle(key: DoggleKey): boolean {
  // Context-Subscription erzeugt Re-Render wenn Provider-Overrides sich ändern
  const contextOverrides = useContext(DoggleContext);

  // Context-Override hat höchste Priorität (überschreibt Registry)
  if (key in contextOverrides) {
    return contextOverrides[key]!;
  }

  return isDoggleActive(key);
}

// ─── HOC ──────────────────────────────────────────────────────────────────────

/**
 * Erstellt eine Komponente, die basierend auf dem Toggle zwischen zwei
 * Implementierungen wechselt. Die Injection passiert beim Render.
 *
 * @example
 * // Einmalig definieren (z. B. in features/chat/index.ts):
 * export const ChatInput = DoggleComponent('legacy-chat-streaming', {
 *   legacy:  LegacyChatInput,   // _legacy/ChatInput.tsx
 *   current: ChatInput,          // ChatInput.tsx  (neuer Code)
 * });
 *
 * // Verwenden – Consumer muss nicht wissen, welche Version läuft:
 * <ChatInput value={...} onChange={...} />
 */
export function DoggleComponent<P extends object>(
  key: DoggleKey,
  opts: {
    legacy: React.ComponentType<P>;
    current: React.ComponentType<P>;
  },
): React.ComponentType<P> {
  function DoggleWrapper(props: P) {
    const isLegacy = useDoggle(key);
    const Component = isLegacy ? opts.legacy : opts.current;
    return <Component {...props} />;
  }

  // Schöner Name für React DevTools
  DoggleWrapper.displayName = `Doggle(${key})`;
  return DoggleWrapper;
}
