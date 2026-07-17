import { google } from "googleapis";
import { randomUUID } from "crypto";
import dotenv from "dotenv";

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const calendar = google.calendar({
    version: "v3",
    auth: oauth2Client,
});
export const createGoogleMeet = async ({ title, start, end }) => {
    const response = await calendar.events.insert({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        conferenceDataVersion: 1,
        requestBody: {
            summary: title,
            start: {
                dateTime: new Date(start).toISOString(),
                timeZone: "Asia/Kolkata",
            },
            end: {
                dateTime: new Date(end).toISOString(),
                timeZone: "Asia/Kolkata",
            },
            conferenceData: {
                createRequest: {
                    requestId: randomUUID(),
                    conferenceSolutionKey: {
                        type: "hangoutsMeet",
                    },
                },
            },
        },
    });

    const meetingLink =
        response.data.conferenceData?.entryPoints?.find(
            p => p.entryPointType === "video"
        )?.uri || null;

    return {
        meetingLink,
        eventId: response.data.id,
    };
};