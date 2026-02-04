import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

// Note: This requires a Service Account Key (JSON) stored in an env var or file
const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: SCOPES,
});

const calendar = google.calendar({ version: 'v3', auth });

export async function createCalendarEvent(details: {
    summary: string;
    description: string;
    startTime: string; // ISO string
    durationMinutes?: number;
}) {
    const duration = details.durationMinutes || 60;
    const end = new Date(new Date(details.startTime).getTime() + duration * 60000).toISOString();

    try {
        const event = {
            summary: details.summary,
            description: details.description,
            start: {
                dateTime: details.startTime,
                timeZone: 'Europe/Berlin',
            },
            end: {
                dateTime: end,
                timeZone: 'Europe/Berlin',
            },
        };

        const response = await calendar.events.insert({
            calendarId: CALENDAR_ID,
            requestBody: event,
        });

        return response.data;
    } catch (error) {
        console.error('Google Calendar Error:', error);
        throw error;
    }
}
