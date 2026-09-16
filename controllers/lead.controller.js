import axios from "axios";
import { Lead } from "../models/lead.model.js";
import ExcelJS from 'exceljs';
import dotenv from "dotenv";

dotenv.config();


const buildLeadRecord = (type, leadId, payload = {}, leadDetails = null, normalizedLeadData = null) => ({
  type,
  leadId,
  pageId: payload.page_id || payload.pageId || null,
  formId: payload.form_id || payload.formId || null,
  adId: payload.ad_id || payload.adId || null,
  campaignId: payload.campaign_id || payload.campaignId || null,
  webhookSource: payload.webhookSource || null,
  leadDetails,
  normalizedLeadData,
  rawPayload: payload,
  receivedAt: new Date(),
  followups:[{
      followStatus: "Pending",
      followupMessage: "Pending",
      updatedDate: new Date(),
    }]
});

const upsertLead = async (leadData) => {
  return Lead.findOneAndUpdate(
    { type: leadData.type, leadId: leadData.leadId },
    { $set: leadData },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );
};

const normalizeMetaFieldData = (fieldData = []) => {
  if (!Array.isArray(fieldData)) {
    return fieldData;
  }

  return fieldData.reduce((accumulator, item) => {
    if (!item?.name) {
      return accumulator;
    }

    accumulator[item.name] = Array.isArray(item.values) && item.values.length === 1
      ? item.values[0]
      : item.values || null;

    return accumulator;
  }, {});
};

const normalizeGoogleLeadData = (userColumnData = []) => {
  if (!Array.isArray(userColumnData)) return {};

  return userColumnData.reduce((acc, item) => {
    const key =
      item.column_id ||
      item.column_name ||
      item.name;

    if (!key) return acc;

    acc[key] =
      item.string_value ??
      item.value ??
      item.column_value ??
      "";

    return acc;
  }, {});
};

const fetchMetaLeadDetails = async (leadId) => {
  if (!process.env.META_ACCESS_TOKEN) {
    return null;
  }

  const response = await axios.get(
    `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION}/${leadId}`,
    {
      params: {
        access_token: process.env.META_ACCESS_TOKEN,
        fields: "field_data,created_time",
      },
    }
  );

  return response.data;
};

export const verifyMetaWebhook = (req, res) => {

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (
    mode === "subscribe" &&
    token === process.env.META_VERIFY_TOKEN
  ) {
    return res.status(200).send(challenge);
  }


  return res.status(403).json({
    success: false,
    message: "Invalid Meta webhook verification request",
  });
};

export const receiveMetaLeadWebhook = async (req, res) => {
  try {
    const { body } = req;

    if (body.object !== "page" || !Array.isArray(body.entry)) {
      return res.status(400).json({
        message: "Invalid Meta webhook payload",
        success: false,
      });
    }

    const storedLeads = [];

    for (const entry of body.entry) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        if (change?.field !== "leadgen" || !change?.value?.leadgen_id) {
          continue;
        }

        const metaPayload = {
          ...change.value,
          page_id: change.value.page_id || entry.id,
          webhookSource: "meta-webhook",
        };

        let leadDetails = null;
        try {
          leadDetails = await fetchMetaLeadDetails(change.value.leadgen_id);
        } catch (error) {
            console.error("================================");
            console.error("Status:", error.response?.status);
            console.error("Data:", JSON.stringify(error.response?.data, null, 2));
            console.error("Message:", error.message);
            console.error("================================");
            }

        const normalizedLeadData = normalizeMetaFieldData(leadDetails?.field_data);
        const savedLead = await upsertLead(
          buildLeadRecord("meta", change.value.leadgen_id, metaPayload, leadDetails, normalizedLeadData)
        );

        storedLeads.push(savedLead);
      }
    }

    return res.status(200).json({
      message: "Meta webhook processed successfully",
      success: true,
      count: storedLeads.length,
      leads: storedLeads,
    });
  } catch (error) {
    console.error("Error processing Meta webhook:", error);
    return res.status(500).json({
      message: "Failed to process Meta webhook",
      success: false,
    });
  }
};

export const receiveGoogleLeadWebhook = async (req, res) => {
  try {
    const payload = req.body || {};

    console.log(
      "Google Lead Received:",
      JSON.stringify(payload, null, 2)
    );

    // ---------------------------------------
    // Validate Webhook Key
    // ---------------------------------------

    if (
      process.env.GOOGLE_ADS_WEBHOOK_KEY &&
      payload.google_key !== process.env.GOOGLE_ADS_WEBHOOK_KEY
    ) {
      return res.status(403).json({
        success: false,
        message: "Invalid Google Webhook Key",
      });
    }

    // ---------------------------------------
    // Ignore Test Leads (optional)
    // ---------------------------------------

    if (payload.is_test === true) {
      return res.status(200).json({
        success: true,
        message: "Test lead received",
      });
    }

    // ---------------------------------------
    // Lead ID
    // ---------------------------------------

    const leadId =
      payload.lead_id ||
      payload.resource_name ||
      payload.gclid;

    if (!leadId) {
      return res.status(400).json({
        success: false,
        message: "Lead ID missing",
      });
    }

    // ---------------------------------------
    // Normalize Lead Data
    // ---------------------------------------

    const normalizedLeadData = normalizeGoogleLeadData(
      payload.user_column_data || []
    );

    // ---------------------------------------
    // Prevent Duplicate Leads
    // ---------------------------------------

    const existingLead = await Lead.findOne({
      type: "google",
      leadId: String(leadId),
    });

    if (existingLead) {
      return res.status(200).json({
        success: true,
        message: "Lead already exists",
      });
    }

    // ---------------------------------------
    // Save Lead
    // ---------------------------------------

    const lead = await Lead.create({
      type: "google",

      leadId: String(leadId),

      pageId: null,

      formId:
        payload.form_id ||
        payload.formId ||
        null,

      adId:
        payload.ad_id ||
        payload.adId ||
        null,

      campaignId:
        payload.campaign_id ||
        payload.campaignId ||
        null,

      webhookSource: "google-webhook",

      leadDetails: payload,

      normalizedLeadData,

      rawPayload: payload,
      followups:[{
      followStatus: "Pending",
      followupMessage: "Pending",
      updatedDate: new Date(),
    }],

      receivedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: "Lead stored successfully",
      lead,
    });
  } catch (error) {
    console.error("Google Lead Error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getLeads = async (req, res) => {
  try {
    const {
      type,
      page = 1,
      limit = 25,
      status = "",
      search = "",
    } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const matchStage = {};

    // Type filter
    if (type) {
      matchStage.type = type;
    }

    // Search filter
    if (search.trim()) {
      const searchRegex = {
        $regex: search.trim(),
        $options: "i",
      };

      matchStage.$or = [
        // Lead ID
        {
          leadId: searchRegex,
        },

        // Meta information
        {
          formId: searchRegex,
        },
        {
          adId: searchRegex,
        },
        {
          campaignId: searchRegex,
        },

        // Search field names
        {
          "leadDetails.field_data.name": searchRegex,
        },

        // Search field values
        {
          "leadDetails.field_data.values": searchRegex,
        },
      ];
    }

    const basePipeline = [
      {
        $match: matchStage,
      },

      // Get latest followup
      ...(status
        ? [
            {
              $addFields: {
                lastFollowup: {
                  $arrayElemAt: ["$followups", -1],
                },
              },
            },
            {
              $match: {
                "lastFollowup.followStatus": status,
              },
            },
          ]
        : []),
    ];

    // Fetch leads
    const leads = await Lead.aggregate([
      ...basePipeline,

      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $skip: skip,
      },

      {
        $limit: limitNumber,
      },
    ]);

    // Count total
    const [totalResult] = await Lead.aggregate([
      ...basePipeline,

      {
        $count: "total",
      },
    ]);

    const total = totalResult?.total || 0;

    return res.status(200).json({
      success: true,
      leads,
      pagination: {
        currentPage: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        totalLeads: total,
      },
    });
  } catch (error) {
    console.error("Error fetching leads:", error);

    return res.status(500).json({
      message: "Failed to fetch leads",
      success: false,
    });
  }
};




export const downloadLeadsExcel = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      type,
      status = "",
      search = "",
    } = req.query;

    const filter = {};

    if (type) {
      filter.type = type;
    }

    // Validate required date fields
    if (!startDate || !endDate) {
      return res.status(400).json({
        message:
          "Please provide startDate and endDate in query params (YYYY-MM-DD)",
        success: false,
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include end of the day

    filter.createdAt = { $gte: start, $lte: end };

    // --------------------------------------------------
    // Search filter (same as getLeads)
    // --------------------------------------------------
    if (search && search.trim()) {
      const searchRegex = {
        $regex: search.trim(),
        $options: "i",
      };

      filter.$or = [
        { leadId: searchRegex },
        { formId: searchRegex },
        { adId: searchRegex },
        { campaignId: searchRegex },
        { "leadDetails.field_data.name": searchRegex },
        { "leadDetails.field_data.values": searchRegex },
      ];
    }

    // --------------------------------------------------
    // Status filter (based on latest followup)
    // Uses aggregation so we can filter on the last element
    // of the followups array.
    // --------------------------------------------------
    let leads;

    if (status && status.trim()) {
      const pipeline = [
        { $match: filter },

        // Compute last followup
        {
          $addFields: {
            lastFollowup: { $arrayElemAt: ["$followups", -1] },
          },
        },

        // Filter by last followup status
        {
          $match: {
            "lastFollowup.followStatus": status,
          },
        },

        // Sort latest first
        { $sort: { createdAt: -1 } },
      ];

      leads = await Lead.aggregate(pipeline);
    } else {
      leads = await Lead.find(filter).sort({ createdAt: -1 }).lean();
    }

    if (leads.length === 0) {
      return res.status(404).json({
        message: "No leads found for the selected filters",
        success: false,
      });
    }

    // --------------------------------------------------
    // Build Excel
    // --------------------------------------------------
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Leads");

    worksheet.columns = [
      { header: "Name", key: "name", width: 20 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Status", key: "status", width: 25 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];

    // Optional header styling
    worksheet.getRow(1).font = { bold: true };

    // Add data rows
    leads.forEach((lead) => {
      const fieldData = lead.leadDetails?.field_data || [];

      const getFieldValue = (name) => {
        const field = fieldData.find((f) => f.name === name);
        return field?.values?.[0] || "N/A";
      };

      worksheet.addRow({
        name: getFieldValue("full_name"),
        phone: getFieldValue("phone_number"),
        email: getFieldValue("email"),
        status:
          lead.followups?.length > 0
            ? lead.followups[lead.followups.length - 1].followStatus
            : "N/A",
        createdAt: lead.createdAt
          ? new Date(lead.createdAt).toISOString().split("T")[0]
          : "",
      });
    });

    // --------------------------------------------------
    // Response headers
    // --------------------------------------------------
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=leads_${startDate}_to_${endDate}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error generating Excel:", error);
    res.status(500).json({
      message: "Failed to generate Excel",
      success: false,
    });
  }
};

export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      followups,
      userId
    } = req.body;

    const updatedData = {
      followups,
      userId
    };

    const lead = await Lead.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });
    if (!lead)
      return res
        .status(404)
        .json({ message: "Lead not found!", success: false });
    return res.status(200).json({ lead, success: true });
  } catch (error) {
    console.log(error);
    res.status(400).json({ message: error.message, success: false });
  }
};
