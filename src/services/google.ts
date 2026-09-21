import { ENV } from '@constants/config.js';
import { calendar_v3, google } from 'googleapis';

function getAuth() {
    const auth = new google.auth.OAuth2(
        ENV.GOOGLE.CLIENT_ID,
        ENV.GOOGLE.CLIENT_SECRET,
        'http://localhost'
    );
    auth.setCredentials({ refresh_token: ENV.GOOGLE.REFRESH_TOKEN });
    return auth;
}

export function getCalendar(): calendar_v3.Calendar {
    return google.calendar({ version: 'v3', auth: getAuth() });
}