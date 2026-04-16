export type DaySchedule =
    | { open: false }
    | { open: true; from: string; to: string }; // HH:mm format

export const BUSINESS_HOURS: Record<string, DaySchedule> = {
    Montag:      { open: false },
    Dienstag:    { open: true, from: '09:00', to: '18:00' },
    Mittwoch:    { open: false },
    Donnerstag:  { open: true, from: '14:00', to: '19:00' },
    Freitag:     { open: true, from: '09:00', to: '16:00' },
    Samstag:     { open: true, from: '09:00', to: '13:30' },
    Sonntag:     { open: false },
};

/** Returns a human-readable string for injection into the AI system prompt. */
export function formatBusinessHoursForPrompt(): string {
    return Object.entries(BUSINESS_HOURS)
        .map(([day, schedule]) =>
            schedule.open
                ? `${day}: ${schedule.from} – ${schedule.to} Uhr`
                : `${day}: GESCHLOSSEN`
        )
        .join('\n');
}

/** Returns true if a given ISO date string falls within opening hours. */
export function isWithinBusinessHours(isoDateTime: string): boolean {
    const date = new Date(isoDateTime);
    const dayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const dayName = dayNames[date.getDay()];
    const schedule = BUSINESS_HOURS[dayName];

    if (!schedule.open) return false;

    const [fromH, fromM] = schedule.from.split(':').map(Number);
    const [toH, toM] = schedule.to.split(':').map(Number);
    const totalMinutes = date.getHours() * 60 + date.getMinutes();
    const fromMinutes = fromH * 60 + fromM;
    const toMinutes = toH * 60 + toM;

    return totalMinutes >= fromMinutes && totalMinutes < toMinutes;
}
