export interface CalendarEventBody {
    summary: string;
    description: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    attendees: { email: string }[];
    conferenceData: {
        createRequest: {
            requestId: string;
            conferenceSolutionKey: { type: 'hangoutsMeet' };
        };
    };
}