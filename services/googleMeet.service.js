import { google } from "googleapis";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
import express from "express";
const router = express.Router();

import { Appointment } from '../models/appointment.model.js';

dotenv.config();

/**
 * ============================================================
 * GOOGLE OAUTH2
 * ============================================================
 */

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

/**
 * ============================================================
 * GOOGLE APIs
 * ============================================================
 */

const calendar = google.calendar({
  version: "v3",
  auth: oauth2Client,
});

const meet = google.meet({
  version: "v2",
  auth: oauth2Client,
});

const drive = google.drive({
  version: "v3",
  auth: oauth2Client,
});

/**
 * Google Workspace Events API
 *
 * Endpoint:
 * https://workspaceevents.googleapis.com/v1
 */
const workspaceEvents = google.workspaceevents({
  version: "v1",
  auth: oauth2Client,
});

/**
 * ============================================================
 * PUB/SUB
 * ============================================================
 */


/**
 * ============================================================
 * CONSTANTS
 * ============================================================
 */

const MEET_RECORDING_FILE_GENERATED =
  "google.workspace.meet.recording.v2.fileGenerated";

const MEET_CONFERENCE_STARTED =
  "google.workspace.meet.conference.v2.started";

const MEET_CONFERENCE_ENDED =
  "google.workspace.meet.conference.v2.ended";

/**
 * Maximum subscription lifetime.
 *
 * Google Workspace Events supports up to 7 days when
 * resource data is excluded.
 *
 * 7 days = 604800 seconds.
 */
const DEFAULT_SUBSCRIPTION_TTL =
  Number(
    process.env.GOOGLE_MEET_SUBSCRIPTION_TTL_SECONDS ||
      604800
  );

/**
 * ============================================================
 * UTILITY
 * ============================================================
 */

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ============================================================
 * ERROR LOGGER
 * ============================================================
 */

const logGoogleError = (label, error) => {
  console.error(
    `\n[GOOGLE_MEET] ${label}`,
    JSON.stringify(
      error?.response?.data ||
        error?.errors ||
        error?.message ||
        error,
      null,
      2
    )
  );
};

/**
 * ============================================================
 * EXTRACT MEETING CODE
 * ============================================================
 *
 * Example:
 *
 * https://meet.google.com/abc-defg-hij
 *
 * returns:
 *
 * abc-defg-hij
 * ============================================================
 */

export const extractMeetingCode = (meetingUri) => {
  if (!meetingUri) {
    return null;
  }

  try {
    const url = new URL(meetingUri);

    if (
      !url.hostname
        .toLowerCase()
        .includes("meet.google.com")
    ) {
      return null;
    }

    const code = url.pathname
      .replace(/^\/+/, "")
      .split("/")[0];

    return code || null;
  } catch {
    /**
     * Fallback for malformed URL.
     */

    const match = meetingUri.match(
      /meet\.google\.com\/([a-z0-9-]+)/i
    );

    return match?.[1] || null;
  }
};

/**
 * ============================================================
 * GET CANONICAL MEET SPACE
 * ============================================================
 *
 * Calendar gives us:
 *
 * https://meet.google.com/abc-defg-hij
 *
 * We use the meeting code to retrieve the canonical Meet API
 * resource:
 *
 * spaces/{serverGeneratedSpaceId}
 *
 * Google supports spaces/{meetingCode} as an alias for get().
 *
 * ============================================================
 */

export const getMeetSpaceFromMeetingUri = async ({
  meetingUri,
}) => {
  try {
    const meetingCode =
      extractMeetingCode(meetingUri);

    if (!meetingCode) {
      throw new Error(
        `Unable to extract Google Meet meeting code from: ${meetingUri}`
      );
    }

    const response =
      await meet.spaces.get({
        name: `spaces/${meetingCode}`,
      });

    if (!response.data?.name) {
      throw new Error(
        "Google Meet API did not return space name"
      );
    }

    return response.data;
  } catch (error) {
    logGoogleError(
      "Getting Meet space failed",
      error
    );

    throw error;
  }
};

/**
 * ============================================================
 * ENABLE AUTOMATIC RECORDING
 * ============================================================
 *
 * This works on a Meet space that was created by another
 * supported application, including Google Calendar.
 *
 * ============================================================
 */

export const enableAutomaticRecording = async ({
  spaceName,
}) => {
  try {
    if (!spaceName) {
      throw new Error(
        "spaceName is required"
      );
    }

    const response =
      await meet.spaces.patch({
        name: spaceName,

        updateMask:
          "config.artifactConfig.recordingConfig.autoRecordingGeneration",

        requestBody: {
          name: spaceName,

          config: {
            artifactConfig: {
              recordingConfig: {
                autoRecordingGeneration: "ON",
              },
            },
          },
        },
      });

    console.log(
      "[GOOGLE_MEET] Automatic recording enabled:",
      {
        spaceName,
        autoRecording:
          response.data?.config
            ?.artifactConfig
            ?.recordingConfig
            ?.autoRecordingGeneration,
      }
    );

    return response.data;
  } catch (error) {
    logGoogleError(
      "Enabling automatic recording failed",
      error
    );

    throw error;
  }
};

/**
 * ============================================================
 * FIND EXISTING WORKSPACE EVENTS SUBSCRIPTION
 * ============================================================
 *
 * Prevent duplicate subscriptions when createGoogleMeet()
 * is called more than once.
 * ============================================================
 */

export const findMeetEventSubscription = async ({
  targetResource,
}) => {
  try {
    if (!targetResource) {
      return null;
    }

    const filter =
      `target_resource="${targetResource}"`;

    const response =
      await workspaceEvents.subscriptions.list({
        filter,
      });

    const subscriptions =
      response.data?.subscriptions || [];

    /**
     * We specifically want a subscription that listens
     * for recording generated.
     */

    const subscription =
      subscriptions.find((item) =>
        item.eventTypes?.includes(
          MEET_RECORDING_FILE_GENERATED
        )
      );

    return subscription || null;
  } catch (error) {
    logGoogleError(
      "Finding existing Workspace Events subscription failed",
      error
    );

    throw error;
  }
};

/**
 * ============================================================
 * WAIT FOR WORKSPACE EVENTS OPERATION
 * ============================================================
 *
 * subscriptions.create returns a long-running Operation.
 *
 * ============================================================
 */

export const waitForWorkspaceEventsOperation = async ({
  operationName,
  timeoutMs = 60000,
  intervalMs = 1000,
}) => {
  if (!operationName) {
    throw new Error(
      "operationName is required"
    );
  }

  const startedAt = Date.now();

  while (
    Date.now() - startedAt <
    timeoutMs
  ) {
    const response =
      await workspaceEvents.operations.get({
        name: operationName,
      });

    const operation = response.data;

    if (operation?.done) {
      if (operation.error) {
        const error = new Error(
          operation.error.message ||
            "Workspace Events operation failed"
        );

        error.googleError =
          operation.error;

        throw error;
      }

      return operation;
    }

    await sleep(intervalMs);
  }

  throw new Error(
    `Workspace Events operation timed out: ${operationName}`
  );
};

/**
 * ============================================================
 * CREATE WORKSPACE EVENTS SUBSCRIPTION
 * ============================================================
 *
 * Target:
 *
 * //meet.googleapis.com/spaces/SPACE_ID
 *
 * Events:
 *
 * 1. Conference started
 * 2. Conference ended
 * 3. Recording file generated
 *
 * ============================================================
 */

export const createMeetEventSubscription = async ({
  spaceName,
}) => {
  try {
    if (!spaceName) {
      throw new Error(
        "spaceName is required"
      );
    }

    const targetResource =
      `//meet.googleapis.com/${spaceName}`;

    const pubsubTopic =
      process.env.GOOGLE_PUBSUB_TOPIC;

    if (!pubsubTopic) {
      throw new Error(
        "GOOGLE_PUBSUB_TOPIC is missing"
      );
    }

    /**
     * --------------------------------------------------------
     * Check existing subscription
     * --------------------------------------------------------
     */

    const existing =
      await findMeetEventSubscription({
        targetResource,
      });

    if (existing) {
      console.log(
        "[GOOGLE_MEET] Existing subscription found:",
        existing.name
      );

      return existing;
    }

    /**
     * --------------------------------------------------------
     * Create subscription
     * --------------------------------------------------------
     */

    const response =
      await workspaceEvents.subscriptions.create({
        requestBody: {
          targetResource,

          eventTypes: [
            MEET_CONFERENCE_STARTED,

            MEET_CONFERENCE_ENDED,

            MEET_RECORDING_FILE_GENERATED,
          ],

          notificationEndpoint: {
            pubsubTopic,
          },

          /**
           * For Meet, resource data is not supported here;
           * event payload gives us the resource name.
           *
           * Omitting payloadOptions is therefore fine.
           */

          ttl: `${DEFAULT_SUBSCRIPTION_TTL}s`,
        },
      });

    const operation =
      response.data;

    console.log(
      "[GOOGLE_MEET] Subscription creation operation:",
      operation?.name
    );

    /**
     * --------------------------------------------------------
     * Wait for operation
     * --------------------------------------------------------
     */

    const completed =
      await waitForWorkspaceEventsOperation({
        operationName: operation.name,
      });

    /**
     * The completed operation contains the Subscription
     * in response.
     */

    const subscription =
      completed.response;

    if (!subscription?.name) {
      throw new Error(
        "Workspace Events subscription was created but no subscription resource was returned"
      );
    }

    console.log(
      "[GOOGLE_MEET] Subscription created:",
      {
        name: subscription.name,
        targetResource:
          subscription.targetResource,
        state: subscription.state,
        expireTime:
          subscription.expireTime,
      }
    );

    return subscription;
  } catch (error) {
    logGoogleError(
      "Creating Workspace Events subscription failed",
      error
    );

    throw error;
  }
};

/**
 * ============================================================
 * CREATE GOOGLE MEET
 * ============================================================
 *
 * THIS IS THE MAIN FUNCTION.
 *
 * It creates:
 *
 * 1. Google Calendar event
 * 2. Google Meet
 * 3. Gets canonical Meet space
 * 4. Enables automatic recording
 * 5. Creates Workspace Events subscription
 * 6. Saves everything to Appointment
 *
 * ============================================================
 */

export const createGoogleMeet = async ({
  appointmentId,
  title,
  start,
  end,
}) => {
  try {
    if (!appointmentId) {
      throw new Error(
        "appointmentId is required"
      );
    }

    if (!title) {
      throw new Error(
        "title is required"
      );
    }

    if (!start) {
      throw new Error(
        "start is required"
      );
    }

    if (!end) {
      throw new Error(
        "end is required"
      );
    }

    if (!process.env.GOOGLE_CALENDAR_ID) {
      throw new Error(
        "GOOGLE_CALENDAR_ID is missing"
      );
    }

    /**
     * --------------------------------------------------------
     * Get Appointment
     * --------------------------------------------------------
     */

    const appointment =
      await Appointment.findById(
        appointmentId
      );

    if (!appointment) {
      throw new Error(
        "Appointment not found"
      );
    }

    /**
     * --------------------------------------------------------
     * Prevent duplicate Meet creation
     * --------------------------------------------------------
     */

    if (
      appointment.googleMeet
        ?.meetingUri
    ) {
      console.log(
        "[GOOGLE_MEET] Appointment already has a Meet:",
        appointment.googleMeet.meetingUri
      );

      return {
        success: true,

        alreadyExists: true,

        meetingLink:
          appointment.googleMeet
            .meetingUri,

        eventId:
          appointment.googleMeet
            .calendarEventId,

        spaceName:
          appointment.googleMeet
            .spaceName,

        subscription:
          appointment.googleMeet
            ?.eventSubscription,

        appointmentId:
          appointment._id,
      };
    }

    /**
     * --------------------------------------------------------
     * Create Google Calendar Event
     * --------------------------------------------------------
     */

    const response =
      await calendar.events.insert({
        calendarId:
          process.env.GOOGLE_CALENDAR_ID,

        conferenceDataVersion: 1,

        requestBody: {
          summary: title,

          start: {
            dateTime:
              new Date(start).toISOString(),

            timeZone: "Asia/Kolkata",
          },

          end: {
            dateTime:
              new Date(end).toISOString(),

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

    /**
     * --------------------------------------------------------
     * Extract Meet URL
     * --------------------------------------------------------
     */

    const meetingLink =
      response.data.conferenceData
        ?.entryPoints
        ?.find(
          (entry) =>
            entry.entryPointType ===
            "video"
        )?.uri || null;

    if (!meetingLink) {
      throw new Error(
        "Google Meet link was not generated"
      );
    }

    /**
     * --------------------------------------------------------
     * Calendar event ID
     * --------------------------------------------------------
     */

    const eventId =
      response.data.id;

    /**
     * --------------------------------------------------------
     * Conference ID
     * --------------------------------------------------------
     */

    const conferenceId =
      response.data.conferenceData
        ?.conferenceId || null;

    /**
     * --------------------------------------------------------
     * Get canonical Meet Space
     * --------------------------------------------------------
     */

    const space =
      await getMeetSpaceFromMeetingUri({
        meetingUri: meetingLink,
      });

    const spaceName =
      space.name;

    const meetingUri =
      space.meetingUri ||
      meetingLink;

    /**
     * --------------------------------------------------------
     * Enable automatic recording
     * --------------------------------------------------------
     */

    await enableAutomaticRecording({
      spaceName,
    });

    /**
     * --------------------------------------------------------
     * Create Workspace Events subscription
     * --------------------------------------------------------
     */

    const subscription =
      await createMeetEventSubscription({
        spaceName,
      });

    /**
     * --------------------------------------------------------
     * Save Appointment
     * --------------------------------------------------------
     */

    appointment.meetingLink =
      meetingUri;

    appointment.googleMeet = {
      ...(appointment.googleMeet
        ?.toObject?.() ||
        appointment.googleMeet ||
        {}),

      spaceName,

      meetingUri,

      calendarEventId:
        eventId,

      conferenceRecord:
        appointment.googleMeet
          ?.conferenceRecord ||
        null,

      eventSubscription: {
        name:
          subscription.name,

        expirationTime:
          subscription.expireTime
            ? new Date(
                subscription.expireTime
              )
            : null,
      },

      recording: {
        ...(appointment.googleMeet
          ?.recording
          ?.toObject?.() ||
          appointment.googleMeet
            ?.recording ||
          {}),

        status: "pending",

        error: null,
      },
    };

    await appointment.save();

    console.log(
      "[GOOGLE_MEET] Meet created successfully:",
      {
        appointmentId:
          appointment._id.toString(),

        eventId,

        meetingLink:

          meetingUri,

        spaceName,

        subscription:
          subscription.name,
      }
    );

    return {
      success: true,

      appointmentId:
        appointment._id,

      meetingLink:
        meetingUri,

      meetingUri,

      eventId,

      conferenceId,

      spaceName,

      subscription: {
        name:
          subscription.name,

        expirationTime:
          subscription.expireTime,
      },
    };
  } catch (error) {
    logGoogleError(
      "Google Meet creation failed",
      error
    );

    throw error;
  }
};

/**
 * ============================================================
 * CREATE MEET SPACE
 * ============================================================
 *
 * IMPORTANT:
 *
 * Do NOT use this together with createGoogleMeet().
 *
 * createGoogleMeet() already creates the Calendar Meet.
 *
 * This function is retained only if you separately want to
 * create a Meet API space instead of using Calendar.
 *
 * ============================================================
 */

export const createMeetSpace = async ({
  appointmentId,
}) => {
  try {
    if (!appointmentId) {
      throw new Error(
        "appointmentId is required"
      );
    }

    const appointment =
      await Appointment.findById(
        appointmentId
      );

    if (!appointment) {
      throw new Error(
        "Appointment not found"
      );
    }

    /**
     * Create Meet API space.
     */

    const response =
      await meet.spaces.create({
        requestBody: {
          config: {
            artifactConfig: {
              recordingConfig: {
                autoRecordingGeneration:
                  "ON",
              },
            },
          },
        },
      });

    const spaceName =
      response.data.name;

    const meetingUri =
      response.data.meetingUri;

    /**
     * Create Workspace Events subscription.
     */

    const subscription =
      await createMeetEventSubscription({
        spaceName,
      });

    appointment.googleMeet = {
      ...(appointment.googleMeet
        ?.toObject?.() ||
        appointment.googleMeet ||
        {}),

      spaceName,

      meetingUri,

      eventSubscription: {
        name:
          subscription.name,

        expirationTime:
          subscription.expireTime
            ? new Date(
                subscription.expireTime
              )
            : null,
      },

      recording: {
        ...(appointment.googleMeet
          ?.recording
          ?.toObject?.() ||
          appointment.googleMeet
            ?.recording ||
          {}),

        status: "pending",
      },
    };

    appointment.meetingLink =
      meetingUri;

    await appointment.save();

    return {
      success: true,

      appointmentId:
        appointment._id,

      spaceName,

      meetingUri,

      subscription: {
        name:
          subscription.name,

        expirationTime:
          subscription.expireTime,
      },
    };
  } catch (error) {
    logGoogleError(
      "Google Meet Space creation failed",
      error
    );

    throw error;
  }
};

/**
 * ============================================================
 * UPDATE MEETING LINK
 * ============================================================
 */

export const updateAppointmentMeeting = async ({
  appointmentId,
  meetingLink,
  eventId,
  spaceName = null,
}) => {
  try {
    const appointment =
      await Appointment.findById(
        appointmentId
      );

    if (!appointment) {
      throw new Error(
        "Appointment not found"
      );
    }

    appointment.meetingLink =
      meetingLink;

    appointment.googleMeet = {
      ...(appointment.googleMeet
        ?.toObject?.() ||
        appointment.googleMeet ||
        {}),

      meetingUri:
        meetingLink,

      calendarEventId:
        eventId ||
        appointment.googleMeet
          ?.calendarEventId,

      spaceName:
        spaceName ||
        appointment.googleMeet
          ?.spaceName,

      recording: {
        ...(appointment.googleMeet
          ?.recording
          ?.toObject?.() ||
          appointment.googleMeet
            ?.recording ||
          {}),

        status: "pending",
      },
    };

    await appointment.save();

    return appointment;
  } catch (error) {
    logGoogleError(
      "Updating appointment Meet failed",
      error
    );

    throw error;
  }
};

/**
 * ============================================================
 * GET GOOGLE MEET RECORDINGS
 * ============================================================
 */

export const getMeetingRecordings = async ({
  conferenceRecord,
}) => {
  try {
    if (!conferenceRecord) {
      throw new Error(
        "conferenceRecord is required"
      );
    }

    const response =
      await meet.conferenceRecords.recordings.list(
        {
          parent:
            conferenceRecord,
        }
      );

    return (
      response.data.recordings || []
    );
  } catch (error) {
    logGoogleError(
      "Getting Meet recordings failed",
      error
    );

    throw error;
  }
};

/**
 * ============================================================
 * GET SINGLE RECORDING
 * ============================================================
 */

export const getMeetingRecording = async ({
  recordingName,
}) => {
  try {
    if (!recordingName) {
      throw new Error(
        "recordingName is required"
      );
    }

    const response =
      await meet.conferenceRecords.recordings.get(
        {
          name: recordingName,
        }
      );

    return response.data;
  } catch (error) {
    logGoogleError(
      "Getting Meet recording failed",
      error
    );

    throw error;
  }
};

/**
 * ============================================================
 * GET OR CREATE PATIENT DRIVE FOLDER
 * ============================================================
 */

export const getOrCreatePatientFolder = async ({
  patientName,
}) => {
  try {
    const rootFolderId =
      process.env
        .GOOGLE_DRIVE_RECORDINGS_FOLDER_ID;

    if (!rootFolderId) {
      throw new Error(
        "GOOGLE_DRIVE_RECORDINGS_FOLDER_ID is missing"
      );
    }

    if (!patientName) {
      throw new Error(
        "patientName is required"
      );
    }

    /**
     * Escape single quotes for Drive query.
     */

    const safeName =
      patientName.replace(
        /\\/g,
        "\\\\"
      ).replace(
        /'/g,
        "\\'"
      );

    /**
     * Search existing patient folder.
     */

    const response =
      await drive.files.list({
        q: `
          name = '${safeName}'
          and '${rootFolderId}' in parents
          and mimeType = 'application/vnd.google-apps.folder'
          and trashed = false
        `,

        fields:
          "files(id,name,parents,webViewLink)",

        spaces: "drive",

        pageSize: 10,
      });

    if (
      response.data.files?.length
    ) {
      return response.data.files[0];
    }

    /**
     * Create folder.
     */

    const folder =
      await drive.files.create({
        requestBody: {
          name: patientName,

          mimeType:
            "application/vnd.google-apps.folder",

          parents: [
            rootFolderId,
          ],
        },

        fields:
          "id,name,parents,webViewLink",
      });

    return folder.data;
  } catch (error) {
    logGoogleError(
      "Patient Drive folder failed",
      error
    );

    throw error;
  }
};

/**
 * ============================================================
 * ORGANIZE RECORDING
 * ============================================================
 */

export const organizeRecording = async ({
  appointmentId,
  fileId,
  patientName,
  appointmentDate,
}) => {
  try {
    if (!appointmentId) {
      throw new Error(
        "appointmentId is required"
      );
    }

    if (!fileId) {
      throw new Error(
        "Google Drive fileId is required"
      );
    }

    if (!patientName) {
      throw new Error(
        "patientName is required"
      );
    }

    /**
     * Find/create patient folder.
     */

    const patientFolder =
      await getOrCreatePatientFolder({
        patientName,
      });

    /**
     * Format date.
     *
     * Example:
     * 02-10-2026
     */

    const formattedDate =
      new Intl.DateTimeFormat(
        "en-IN",
        {
          timeZone:
            "Asia/Kolkata",

          day: "2-digit",

          month: "2-digit",

          year: "numeric",
        }
      )
        .format(
          new Date(
            appointmentDate
          )
        )
        .replace(
          /\//g,
          "-"
        );

    /**
     * Final filename.
     */

    const fileName =
      `${patientName} - Consultation - ${formattedDate} - ${appointmentId}.mp4`;

    /**
     * Get existing Drive file.
     */

    const existingFile =
      await drive.files.get({
        fileId,

        fields:
          "id,name,parents,mimeType,webViewLink,webContentLink",
      });

    /**
     * Already processed?
     *
     * This makes the operation idempotent.
     */

    if (
      existingFile.data.name ===
      fileName
    ) {
      return {
        success: true,

        fileId:
          existingFile.data.id,

        fileName:
          existingFile.data.name,

        patientFolderId:
          patientFolder.id,

        patientFolderName:
          patientFolder.name,

        driveUrl:
          existingFile.data
            .webViewLink,

        webContentLink:
          existingFile.data
            .webContentLink,
      };
    }

    const previousParents =
      existingFile.data.parents?.join(
        ","
      ) || "";

    /**
     * Rename + move.
     */

    const response =
      await drive.files.update({
        fileId,

        addParents:
          patientFolder.id,

        removeParents:
          previousParents || undefined,

        requestBody: {
          name: fileName,
        },

        fields:
          "id,name,mimeType,parents,webViewLink,webContentLink",
      });

    return {
      success: true,

      fileId:
        response.data.id,

      fileName:
        response.data.name,

      patientFolderId:
        patientFolder.id,

      patientFolderName:
        patientFolder.name,

      driveUrl:
        response.data.webViewLink,

      webContentLink:
        response.data
          .webContentLink,
    };
  } catch (error) {
    logGoogleError(
      "Organizing Google Drive recording failed",
      error
    );

    throw error;
  }
};

/**
 * ============================================================
 * PROCESS RECORDING
 * ============================================================
 */

export const processMeetingRecording = async ({
  appointmentId,
  recording,
  patientName,
}) => {
  try {
    if (!appointmentId) {
      throw new Error(
        "appointmentId is required"
      );
    }

    if (!recording) {
      throw new Error(
        "recording is required"
      );
    }

    /**
     * Get appointment.
     */

    const appointment =
      await Appointment.findById(
        appointmentId
      );

    if (!appointment) {
      throw new Error(
        "Appointment not found"
      );
    }

    /**
     * --------------------------------------------------------
     * Already processed
     * --------------------------------------------------------
     */

    if (
      appointment.googleMeet
        ?.recording?.status ===
        "ready" &&
      appointment.googleMeet
        ?.recording?.fileId
    ) {
      console.log(
        "[GOOGLE_MEET] Recording already processed:",
        appointmentId
      );

      return {
        success: true,

        status: "ready",

        alreadyProcessed: true,

        appointment,

        recording:
          appointment.googleMeet
            .recording,
      };
    }

    /**
     * --------------------------------------------------------
     * Recording state
     * --------------------------------------------------------
     */

    if (
      recording.state &&
      recording.state !==
        "FILE_GENERATED"
    ) {
      await Appointment.findByIdAndUpdate(
        appointmentId,
        {
          $set: {
            "googleMeet.recording.status":
              "processing",

            "googleMeet.recording.recordingName":
              recording.name,

            "googleMeet.recording.startTime":
              recording.startTime
                ? new Date(
                    recording.startTime
                  )
                : null,

            "googleMeet.recording.endTime":
              recording.endTime
                ? new Date(
                    recording.endTime
                  )
                : null,
          },
        }
      );

      return {
        success: false,

        status:
          recording.state,

        message:
          "Recording is not yet generated",
      };
    }

    /**
     * --------------------------------------------------------
     * Get Drive file ID
     * --------------------------------------------------------
     */

    const fileId =
      recording
        .driveDestination
        ?.file;

    if (!fileId) {
      await Appointment.findByIdAndUpdate(
        appointmentId,
        {
          $set: {
            "googleMeet.recording.status":
              "processing",

            "googleMeet.recording.recordingName":
              recording.name,
          },
        }
      );

      return {
        success: false,

        status: "processing",

        message:
          "Google Drive recording file is not available yet",
      };
    }

    /**
     * --------------------------------------------------------
     * Patient name
     * --------------------------------------------------------
     *
     * Your current implementation uses title as fallback.
     *
     * You can pass patientName from your controller.
     */

    const finalPatientName =
      patientName ||
      appointment.title ||
      "Patient";

    /**
     * --------------------------------------------------------
     * Organize Drive recording
     * --------------------------------------------------------
     */

    const organized =
      await organizeRecording({
        appointmentId,

        fileId,

        patientName:
          finalPatientName,

        appointmentDate:
          appointment.start,
      });

    /**
     * --------------------------------------------------------
     * Update MongoDB
     * --------------------------------------------------------
     */

    const updatedAppointment =
      await Appointment.findByIdAndUpdate(
        appointmentId,

        {
          $set: {
            "googleMeet.recording.status":
              "ready",

            "googleMeet.recording.fileId":
              organized.fileId,

            "googleMeet.recording.fileName":
              organized.fileName,

            "googleMeet.recording.driveUrl":
              organized.driveUrl,

            "googleMeet.recording.recordingName":
              recording.name,

            "googleMeet.recording.startTime":
              recording.startTime
                ? new Date(
                    recording.startTime
                  )
                : null,

            "googleMeet.recording.endTime":
              recording.endTime
                ? new Date(
                    recording.endTime
                  )
                : null,

            "googleMeet.recording.processedAt":
              new Date(),

            "googleMeet.recording.error":
              null,
          },
        },

        {
          new: true,
        }
      );

    /**
     * --------------------------------------------------------
     * Optional external webhook
     * --------------------------------------------------------
     */

    await fireRecordingWebhook({
      appointment:
        updatedAppointment,

      recording: {
        fileId:
          organized.fileId,

        fileName:
          organized.fileName,

        driveUrl:
          organized.driveUrl,

        recordingName:
          recording.name,

        startTime:
          recording.startTime,

        endTime:
          recording.endTime,
      },
    });

    return {
      success: true,

      status: "ready",

      appointment:
        updatedAppointment,

      recording: {
        fileId:
          organized.fileId,

        fileName:
          organized.fileName,

        driveUrl:
          organized.driveUrl,

        recordingName:
          recording.name,

        startTime:
          recording.startTime,

        endTime:
          recording.endTime,
      },
    };
  } catch (error) {
    logGoogleError(
      "Processing Meet recording failed",
      error
    );

    try {
      await Appointment.findByIdAndUpdate(
        appointmentId,
        {
          $set: {
            "googleMeet.recording.status":
              "failed",

            "googleMeet.recording.error":
              error.message,

            "googleMeet.recording.processedAt":
              new Date(),
          },
        }
      );
    } catch (updateError) {
      console.error(
        "[GOOGLE_MEET] Failed to save recording failure:",
        updateError
      );
    }

    throw error;
  }
};

/**
 * ============================================================
 * OPTIONAL WEBHOOK AFTER RECORDING IS SAVED
 * ============================================================
 *
 * If you want your own API/webhook to receive a notification
 * after the recording has been successfully saved:
 *
 * GOOGLE_MEET_RECORDING_WEBHOOK_URL=https://your-api.com/...
 *
 * If the env variable is missing, nothing is sent.
 * ============================================================
 */

export const fireRecordingWebhook = async ({
  appointment,
  recording,
}) => {
  const webhookUrl =
    process.env
      .GOOGLE_MEET_RECORDING_WEBHOOK_URL;

  if (!webhookUrl) {
    return {
      success: true,
      skipped: true,
    };
  }

  try {
    const response =
      await fetch(webhookUrl, {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          ...(process.env
            .GOOGLE_MEET_RECORDING_WEBHOOK_SECRET
            ? {
                "x-webhook-secret":
                  process.env
                    .GOOGLE_MEET_RECORDING_WEBHOOK_SECRET,
              }
            : {}),
        },

        body: JSON.stringify({
          event:
            "google_meet.recording.ready",

          appointmentId:
            appointment?._id,

          patientId:
            appointment?.patientId,

          title:
            appointment?.title,

          meetingLink:
            appointment
              ?.meetingLink,

          conferenceRecord:
            appointment
              ?.googleMeet
              ?.conferenceRecord,

          recording,
        }),
      });

    const responseText =
      await response.text();

    if (!response.ok) {
      throw new Error(
        `Recording webhook failed: ${response.status} ${responseText}`
      );
    }

    console.log(
      "[GOOGLE_MEET] Recording webhook sent:",
      webhookUrl
    );

    return {
      success: true,
      status: response.status,
    };
  } catch (error) {
    /**
     * Do not fail the Google recording processing just
     * because your optional external webhook failed.
     */

    console.error(
      "[GOOGLE_MEET] Recording webhook failed:",
      error.message
    );

    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * ============================================================
 * FIND APPOINTMENT BY MEET SPACE
 * ============================================================
 */

export const findAppointmentByMeetSpace = async ({
  spaceName,
}) => {
  try {
    if (!spaceName) {
      return null;
    }

    const appointment =
      await Appointment.findOne({
        "googleMeet.spaceName":
          spaceName,
      });

    return appointment;
  } catch (error) {
    logGoogleError(
      "Finding appointment by Meet space failed",
      error
    );

    throw error;
  }
};

/**
 * ============================================================
 * FIND APPOINTMENT BY CONFERENCE RECORD
 * ============================================================
 */

export const findAppointmentByConferenceRecord =
  async ({
    conferenceRecord,
  }) => {
    try {
      if (!conferenceRecord) {
        return null;
      }

      return await Appointment.findOne({
        "googleMeet.conferenceRecord":
          conferenceRecord,
      });
    } catch (error) {
      logGoogleError(
        "Finding appointment by conference record failed",
        error
      );

      throw error;
    }
  };

/**
 * ============================================================
 * SAVE CONFERENCE RECORD
 * ============================================================
 */

export const saveConferenceRecord = async ({
  appointmentId,
  conferenceRecord,
}) => {
  try {
    if (
      !appointmentId ||
      !conferenceRecord
    ) {
      throw new Error(
        "appointmentId and conferenceRecord are required"
      );
    }

    const appointment =
      await Appointment.findByIdAndUpdate(
        appointmentId,

        {
          $set: {
            "googleMeet.conferenceRecord":
              conferenceRecord,

            "googleMeet.recording.status":
              "processing",
          },
        },

        {
          new: true,
        }
      );

    return appointment;
  } catch (error) {
    logGoogleError(
      "Saving conference record failed",
      error
    );

    throw error;
  }
};

/**
 * ============================================================
 * GET APPOINTMENT RECORDING
 * ============================================================
 */

export const getAppointmentRecording = async ({
  appointmentId,
}) => {
  try {
    const appointment =
      await Appointment.findById(
        appointmentId
      ).select(
        "patientId title start end meetingLink googleMeet"
      );

    if (!appointment) {
      throw new Error(
        "Appointment not found"
      );
    }

    return (
      appointment.googleMeet
        ?.recording || null
    );
  } catch (error) {
    logGoogleError(
      "Getting appointment recording failed",
      error
    );

    throw error;
  }
};

/**
 * ============================================================
 * PARSE GOOGLE WORKSPACE EVENT
 * ============================================================
 *
 * Pub/Sub gives us:
 *
 * message.attributes["ce-type"]
 *
 * message.data
 *
 * Google Meet event data:
 *
 * {
 *   "recording": {
 *      "name": "conferenceRecords/.../recordings/..."
 *   }
 * }
 *
 * ============================================================
 */

const parseWorkspaceEvent = (message) => {
  const eventType =
    message.attributes?.["ce-type"] ||
    message.attributes?.["ce_type"] ||
    null;

  const source =
    message.attributes?.[
      "ce-source"
    ] || null;

  const subject =
    message.attributes?.[
      "ce-subject"
    ] || null;

  const eventId =
    message.attributes?.["ce-id"] ||
    message.attributes?.["ce_id"] ||
    null;

  const rawData =
    message.data?.toString("utf8") ||
    "{}";

  let data = {};

  try {
    data = JSON.parse(rawData);
  } catch {
    console.error(
      "[GOOGLE_MEET] Unable to parse event data:",
      rawData
    );

    throw new Error(
      "Invalid Google Workspace event JSON"
    );
  }

  return {
    eventType,

    source,

    subject,

    eventId,

    data,
  };
};

/**
 * ============================================================
 * EXTRACT SPACE FROM SUBJECT
 * ============================================================
 *
 * Example subject:
 *
 * //meet.googleapis.com/spaces/abc123
 *
 * ============================================================
 */

const extractSpaceNameFromSubject = (
  subject
) => {
  if (!subject) {
    return null;
  }

  const marker =
    "//meet.googleapis.com/";

  const index =
    subject.indexOf(marker);

  if (index === -1) {
    return null;
  }

  return subject.substring(
    index + marker.length
  );
};

/**
 * ============================================================
 * EXTRACT CONFERENCE RECORD
 * ============================================================
 */

const extractConferenceRecordFromData =
  (data) => {
    return (
      data?.conferenceRecord
        ?.name ||
      data?.conferenceRecord ||
      null
    );
  };

/**
 * ============================================================
 * EXTRACT RECORDING NAME
 * ============================================================
 */

const extractRecordingNameFromData =
  (data) => {
    return (
      data?.recording?.name ||
      data?.recording ||
      null
    );
  };

/**
 * ============================================================
 * HANDLE CONFERENCE STARTED
 * ============================================================
 */

export const handleConferenceStarted =
  async ({
    event,
  }) => {
    const spaceName =
      extractSpaceNameFromSubject(
        event.subject
      );

    const conferenceRecord =
      extractConferenceRecordFromData(
        event.data
      );

    console.log(
      "[GOOGLE_MEET] Conference started:",
      {
        spaceName,
        conferenceRecord,
      }
    );

    let appointment = null;

    if (spaceName) {
      appointment =
        await findAppointmentByMeetSpace({
          spaceName,
        });
    }

    if (
      !appointment &&
      conferenceRecord
    ) {
      appointment =
        await findAppointmentByConferenceRecord(
          {
            conferenceRecord,
          }
        );
    }

    if (!appointment) {
      console.warn(
        "[GOOGLE_MEET] No appointment found for conference started:",
        {
          spaceName,
          conferenceRecord,
        }
      );

      return;
    }

    await Appointment.findByIdAndUpdate(
      appointment._id,
      {
        $set: {
          "googleMeet.recording.status":
            "recording",

          ...(conferenceRecord
            ? {
                "googleMeet.conferenceRecord":
                  conferenceRecord,
              }
            : {}),
        },
      }
    );
  };

/**
 * ============================================================
 * HANDLE CONFERENCE ENDED
 * ============================================================
 *
 * This is the "meeting ended" event.
 *
 * IMPORTANT:
 *
 * We DO NOT process the MP4 here.
 *
 * Google may still be generating the recording.
 *
 * We process it when:
 *
 * google.workspace.meet.recording.v2.fileGenerated
 *
 * arrives.
 *
 * ============================================================
 */

export const handleConferenceEnded =
  async ({
    event,
  }) => {
    const spaceName =
      extractSpaceNameFromSubject(
        event.subject
      );

    const conferenceRecord =
      extractConferenceRecordFromData(
        event.data
      );

    console.log(
      "[GOOGLE_MEET] Conference ended:",
      {
        spaceName,
        conferenceRecord,
      }
    );

    let appointment = null;

    if (spaceName) {
      appointment =
        await findAppointmentByMeetSpace({
          spaceName,
        });
    }

    if (
      !appointment &&
      conferenceRecord
    ) {
      appointment =
        await findAppointmentByConferenceRecord(
          {
            conferenceRecord,
          }
        );
    }

    if (!appointment) {
      console.warn(
        "[GOOGLE_MEET] No appointment found for conference ended:",
        {
          spaceName,
          conferenceRecord,
        }
      );

      return;
    }

    await Appointment.findByIdAndUpdate(
      appointment._id,
      {
        $set: {
          ...(conferenceRecord
            ? {
                "googleMeet.conferenceRecord":
                  conferenceRecord,
              }
            : {}),

          "googleMeet.recording.status":
            "processing",
        },
      }
    );

    /**
     * Do NOT process recording here.
     *
     * Wait for fileGenerated event.
     */
  };

/**
 * ============================================================
 * HANDLE RECORDING FILE GENERATED
 * ============================================================
 *
 * THIS IS THE MOST IMPORTANT HANDLER.
 *
 * Google sends:
 *
 * google.workspace.meet.recording.v2.fileGenerated
 *
 * Then we:
 *
 * 1. Get recording resource
 * 2. Get Drive file ID
 * 3. Find appointment
 * 4. Organize Drive
 * 5. Update MongoDB
 *
 * ============================================================
 */

export const handleRecordingFileGenerated =
  async ({
    event,
  }) => {
    const recordingName =
      extractRecordingNameFromData(
        event.data
      );

    if (!recordingName) {
      throw new Error(
        "Recording resource name missing from Google Meet event"
      );
    }

    console.log(
      "[GOOGLE_MEET] Recording file generated:",
      recordingName
    );

    /**
     * --------------------------------------------------------
     * Get recording details
     * --------------------------------------------------------
     */

    const recording =
      await getMeetingRecording({
        recordingName,
      });

    console.log(
      "[GOOGLE_MEET] Recording details:",
      {
        name:
          recording.name,

        state:
          recording.state,

        driveFile:
          recording
            .driveDestination
            ?.file,
      }
    );

    /**
     * --------------------------------------------------------
     * Get conference record from recording name
     * --------------------------------------------------------
     *
     * Recording name:
     *
     * conferenceRecords/ABC/recordings/XYZ
     *
     * Therefore:
     *
     * conferenceRecords/ABC
     *
     * --------------------------------------------------------
     */

    const conferenceRecord =
      recordingName.split(
        "/recordings/"
      )[0];

    /**
     * --------------------------------------------------------
     * Find appointment
     * --------------------------------------------------------
     */

    let appointment =
      await findAppointmentByConferenceRecord(
        {
          conferenceRecord,
        }
      );

    /**
     * If conference record wasn't stored previously,
     * get the conference record itself and find by space.
     */

    if (!appointment) {
      try {
        const conferenceResponse =
          await meet.conferenceRecords.get(
            {
              name:
                conferenceRecord,
            }
          );

        const spaceName =
          conferenceResponse.data
            ?.space;

        if (spaceName) {
          appointment =
            await findAppointmentByMeetSpace({
              spaceName,
            });
        }
      } catch (error) {
        logGoogleError(
          "Getting conference record during recording processing failed",
          error
        );
      }
    }

    if (!appointment) {
      throw new Error(
        `No Appointment found for conference record: ${conferenceRecord}`
      );
    }

    /**
     * --------------------------------------------------------
     * Save conference record first
     * --------------------------------------------------------
     */

    await Appointment.findByIdAndUpdate(
      appointment._id,
      {
        $set: {
          "googleMeet.conferenceRecord":
            conferenceRecord,

          "googleMeet.recording.status":
            "processing",

          "googleMeet.recording.recordingName":
            recording.name,

          "googleMeet.recording.startTime":
            recording.startTime
              ? new Date(
                  recording.startTime
                )
              : null,

          "googleMeet.recording.endTime":
            recording.endTime
              ? new Date(
                  recording.endTime
                )
              : null,
        },
      }
    );

    /**
     * --------------------------------------------------------
     * Drive file ID
     * --------------------------------------------------------
     */

    const fileId =
      recording
        .driveDestination
        ?.file;

    if (!fileId) {
      throw new Error(
        `Drive file ID is not available for recording: ${recordingName}`
      );
    }

    /**
     * --------------------------------------------------------
     * Patient name
     * --------------------------------------------------------
     *
     * Current fallback:
     *
     * appointment.title
     *
     * If you have a Patient name field, populate patientId
     * here instead.
     * --------------------------------------------------------
     */

    const patientName =
      appointment.title ||
      "Patient";

    /**
     * --------------------------------------------------------
     * Process recording
     * --------------------------------------------------------
     */

    const result =
      await processMeetingRecording({
        appointmentId:
          appointment._id,

        recording,

        patientName,
      });

    console.log(
      "[GOOGLE_MEET] Recording processing complete:",
      {
        appointmentId:
          appointment._id.toString(),

        fileId,

        status:
          result.status,
      }
    );

    return result;
  };

/**
 * ============================================================
 * PROCESS GOOGLE MEET PUB/SUB EVENT
 * ============================================================
 */

export const processGoogleMeetEvent =
  async ({
    message,
  }) => {
    const event =
      parseWorkspaceEvent(message);

    console.log(
      "[GOOGLE_MEET] Event received:",
      {
        type:
          event.eventType,

        eventId:
          event.eventId,

        subject:
          event.subject,

        source:
          event.source,
      }
    );

    switch (
      event.eventType
    ) {
      case MEET_CONFERENCE_STARTED:
        await handleConferenceStarted({
          event,
        });
        break;

      case MEET_CONFERENCE_ENDED:
        await handleConferenceEnded({
          event,
        });
        break;

      case MEET_RECORDING_FILE_GENERATED:
        await handleRecordingFileGenerated({
          event,
        });
        break;

      default:
        console.log(
          "[GOOGLE_MEET] Ignoring event:",
          event.eventType
        );
    }
  };

/**
 * ============================================================
 * START PUB/SUB LISTENER
 * ============================================================
 *
 * Call this ONCE when your Node.js application starts.
 *
 * ============================================================
 */



export async function receiveGoogleMeetPubSub(req, res) {
  try {
    console.log(
      "[GOOGLE_MEET] Pub/Sub push received"
    );

    const message = req.body?.message;

    if (!message) {
      console.warn(
        "[GOOGLE_MEET] Pub/Sub message missing"
      );

      // Acknowledge so Pub/Sub does not keep retrying
      return res.sendStatus(204);
    }

    /**
     * ---------------------------------------------------------
     * Decode Pub/Sub data
     * ---------------------------------------------------------
     */

    const rawData = message.data
      ? Buffer.from(
          message.data,
          "base64"
        )
      : Buffer.from("{}");

    console.log(
      "[GOOGLE_MEET] Raw event data:",
      rawData.toString("utf8")
    );

    /**
     * ---------------------------------------------------------
     * Rebuild the message in the same format expected by
     * processGoogleMeetEvent()
     * ---------------------------------------------------------
     */

    const pubSubMessage = {
      id:
        message.messageId ||
        message.message_id ||
        null,

      attributes:
        message.attributes || {},

      data: rawData,
    };

    console.log(
      "[GOOGLE_MEET] Pub/Sub attributes:",
      pubSubMessage.attributes
    );

    /**
     * ---------------------------------------------------------
     * Process Google Workspace event
     * ---------------------------------------------------------
     */

    await processGoogleMeetEvent({
      message: pubSubMessage,
    });

    /**
     * ---------------------------------------------------------
     * IMPORTANT
     *
     * HTTP 2xx tells Pub/Sub:
     * "Message processed successfully."
     * ---------------------------------------------------------
     */

    console.log(
      "[GOOGLE_MEET] Pub/Sub event processed successfully"
    );

    return res.sendStatus(204);

  } catch (error) {

    console.error(
      "[GOOGLE_MEET] Pub/Sub webhook processing failed:",
      error?.response?.data ||
        error?.message ||
        error
    );

    /**
     * Returning 500 causes Pub/Sub to retry the message.
     */
    return res.sendStatus(500);
  }
}

router.post(
  "/google-meet/pubsub",
  receiveGoogleMeetPubSub
);

export default router;