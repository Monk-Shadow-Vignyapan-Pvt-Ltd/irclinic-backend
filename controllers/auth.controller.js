import { User } from '../models/user.model.js';
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import sharp from 'sharp';
import dotenv from "dotenv";
import { Staff } from "../models/staff.model.js";
import axios from "axios";

dotenv.config();

// Signup Controller
export const addUser = async (req, res) => {
  try {
    const { email, password, username, avatar ,role,roles,centerId,userId} = req.body;
    if (!email || !password || !username || !role) {
      return res.status(400).json({ msg: "Please enter all the fields" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ msg: "Password should be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ msg: "User with the same email already exists" });
    }

    const hashedPassword = await bcryptjs.hash(password, 8);

    if (avatar && !avatar.startsWith('data:image')) {
        return res.status(400).json({ message: 'Invalid image data', success: false });
      }
      let compressedBase64 = "";
    if(avatar){
      const base64Data = avatar.split(';base64,').pop();
      const buffer = Buffer.from(base64Data, 'base64');

      // Resize and compress the image using sharp
      const compressedBuffer = await sharp(buffer)
          .resize(800, 600, { fit: 'inside' }) // Resize to 800x600 max, maintaining aspect ratio
          .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
          .toBuffer();

      // Convert back to Base64 for storage (optional)
       compressedBase64 = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
    }
      
    const newUser = new User({ email, password: hashedPassword, username, avatar:avatar ? compressedBase64 : avatar,role,roles,centerId: (centerId === '') ? null : centerId ,userId :(userId === '') ? null : userId});

    const savedUser = await newUser.save();
    res.json(savedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Login Controller
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ msg: "Please enter all the fields" });
    }

    const user = await User.findOne({ email: new RegExp(`^${email}$`, 'i') });
    if (!user) {
      return res.status(400).send({ msg: "User with this email does not exist" });
    }

    const isMatch = await bcryptjs.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send({ msg: "Incorrect password." });
    }

    const token = jwt.sign({ id: user._id }, "passwordKey");
    res.json({ token, user: { id: user._id, username: user.username } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Token Validation Controller
export const tokenIsValid = async (req, res) => {
  try {
    const token = req.header("x-auth-token");
    if (!token) return res.json(false);

    const verified = jwt.verify(token, "passwordKey");
    if (!verified) return res.json(false);

    const user = await User.findById(verified.id);
    if (!user) return res.json(false);

    return res.json(true);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get User Info Controller
export const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user);
    const users = await User.find();
    const filteredUsers = users.map(({ _id, email, username, avatar,centerId,userId}) => ({
      _id,
      email,
      username,
      avatar,
      centerId,
      userId
  }));

  const staff = await Staff.findOne({
          $expr: {
            $regexMatch: {
              input: { $concat: ["$firstName", " ", "$lastName"] },
              regex: user.username,
              options: "i"
            }
          }
        }).select("sop");

   
    res.json({
      username: user.username,
      id: user._id,
      avatar: user.avatar,
      role:user.role,
      roles:user.roles,
      notifications:user.notifications ? user.notifications.reverse() : [],
      selectedRoles:user.selectedRoles,
      userId:user.userId,
      users:filteredUsers,
      sop: staff ? staff.sop : null
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// export const getUsers = async (req, res) => {
//     try {
//         const users = await User.find();
//         if (!users) return res.status(404).json({ message: "Users not found", success: false });
//         return res.status(200).json({ users });
//     } catch (error) {
//         console.log(error);
//         res.status(500).json({ message: 'Failed to fetch users', success: false });
//     }
// };

export const getUsers = async (req, res) => {
    try {
        const users = await User.find();
        if (!users ) {
            return res.status(404).json({ message: "No Users found", success: false });
        }
        const reversedusers = users.reverse();
        const page = parseInt(req.query.page) || 1;

        // Define the number of items per page
        const limit = 12;

        // Calculate the start and end indices for pagination
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Paginate the reversed movies array
        const paginatedusers = reversedusers.slice(startIndex, endIndex);
        return res.status(200).json({ 
            users:paginatedusers, 
            success: true ,
            pagination: {
            currentPage: page,
            totalPages: Math.ceil(users.length / limit),
            totalusers: users.length,
        },});
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users', success: false });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email,password, username, avatar ,role,roles,centerId,userId} = req.body;

        // Validate base64 image data if provided
        if (!email  || !username || !role) {
            return res.status(400).json({ msg: "Please enter all the fields" });
          }
          // if (password.length < 6) {
          //   return res
          //     .status(400)
          //     .json({ msg: "Password should be at least 6 characters" });
          // }
    
      
          // const hashedPassword = await bcryptjs.hash(password, 8);
      
          if (avatar && !avatar.startsWith('data:image')) {
              return res.status(400).json({ message: 'Invalid image data', success: false });
            }

            const base64Data = avatar ? avatar.split(';base64,').pop() : null;
            const buffer = avatar ? Buffer.from(base64Data, 'base64') : null;
      
            // Resize and compress the image using sharp
            const compressedBuffer = avatar ? await sharp(buffer)
                .resize(800, 600, { fit: 'inside' }) // Resize to 800x600 max, maintaining aspect ratio
                .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
                .toBuffer() : null;
      
            // Convert back to Base64 for storage (optional)
            const compressedBase64 = avatar ? `data:image/jpeg;base64,${compressedBuffer.toString('base64')}` : null;  

        const updatedData = { email, ...(password && { password }), username, avatar:compressedBase64,role,roles,centerId: (centerId === '') ? null : centerId ,userId : (userId === '') ? null : userId};

        const user = await User.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
        if (!user) return res.status(404).json({ message: "User not found!", success: false });
        return res.status(200).json({ user, success: true });
    } catch (error) {
        console.log(error);
        res.status(400).json({ message: error.message, success: false });
    }
};

export const updatePassword = async (req, res) => {
  try {
      const { id } = req.params;
      const { email,password, username, avatar ,role,roles,centerId,userId} = req.body;

      // Validate base64 image data if provided
      if (!email  || !username || !role) {
          return res.status(400).json({ msg: "Please enter all the fields" });
        }
        if (password.length < 6) {
          return res
            .status(400)
            .json({ msg: "Password should be at least 6 characters" });
        }
  
    
        const hashedPassword = await bcryptjs.hash(password, 8);
    
        if (avatar && !avatar.startsWith('data:image')) {
            return res.status(400).json({ message: 'Invalid image data', success: false });
          }

          const base64Data = avatar ? avatar.split(';base64,').pop() : null;
          const buffer = avatar ? Buffer.from(base64Data, 'base64') : null;
    
          // Resize and compress the image using sharp
          const compressedBuffer = avatar ? await sharp(buffer)
              .resize(800, 600, { fit: 'inside' }) // Resize to 800x600 max, maintaining aspect ratio
              .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
              .toBuffer() : null;
    
          // Convert back to Base64 for storage (optional)
          const compressedBase64 = avatar ? `data:image/jpeg;base64,${compressedBuffer.toString('base64')}` : null;  

      const updatedData = { email,password: hashedPassword, username, avatar:compressedBase64,role,roles,centerId: (centerId === '') ? null : centerId ,userId : (userId === '') ? null : userId};

      const user = await User.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
      if (!user) return res.status(404).json({ message: "User not found!", success: false });
      return res.status(200).json({ user, success: true });
  } catch (error) {
      console.log(error);
      res.status(400).json({ message: error.message, success: false });
  }
};

export const updateUserPassword = async (req, res) => {
  try {
      const { id } = req.params;
      const { email,password,existPassword, username, avatar ,role,roles,centerId,userId} = req.body;

      // Validate base64 image data if provided
      if (!email || !existPassword  || !username || !role) {
          return res.status(400).json({ msg: "Please enter all the fields" });
        }

        const userMatch = await User.findOne({ email });
        if (!userMatch) {
          return res
            .status(400)
            .send({ msg: "User with this email does not exist" });
        }
    
        const isMatch = await bcryptjs.compare(existPassword, userMatch.password);
        if (!isMatch) {
          return res.status(400).send({ msg: "Incorrect Existing password." });
        }
        if (password.length < 6) {
          return res
            .status(400)
            .json({ msg: "Password should be at least 6 characters" });
        }
  
    
        const hashedPassword = await bcryptjs.hash(password, 8);
    
       

      const updatedData = { email,password: hashedPassword, username, avatar:avatar,role,roles,centerId: (centerId === '') ? null : centerId ,userId : (userId === '') ? null : userId};

      const user = await User.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
      if (!user) return res.status(404).json({ message: "User not found!", success: false });
      return res.status(200).json({ user, success: true });
  } catch (error) {
      console.log(error);
      res.status(400).json({ message: error.message, success: false });
  }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
        if (!user) return res.status(404).json({ message: "User not found!", success: false });
        return res.status(200).json({ user, success: true });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to delete user', success: false });
    }
};

export const updateDashboard = async (req, res) => {
  try {
      const { id } = req.params;
      const { selectedRoles} = req.body;
      const existingEntry = await User.findById(id); 

      const updatedData = { 
        email:existingEntry.email,
        password: existingEntry.password,
        username:existingEntry.username,
        avatar:existingEntry.avatar,
        role:existingEntry.role,
        roles:existingEntry.roles,
        centerId: existingEntry.centerId ,
        userId : existingEntry.userId,
        notifications:existingEntry.notifications,
        selectedRoles
      }

      const user = await User.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
      if (!user) return res.status(404).json({ message: "User not found!", success: false });
      return res.status(200).json({ user, success: true });
  } catch (error) {
      console.log(error);
      res.status(400).json({ message: error.message, success: false });
  }
};

export const updateNotifications = async (req, res) => {
  try {
      const { id } = req.params;
      const { notifications} = req.body;
      const existingEntry = await User.findById(id); 

      const updatedData = { 
        email:existingEntry.email,
        password: existingEntry.password,
        username:existingEntry.username,
        avatar:existingEntry.avatar,
        role:existingEntry.role,
        roles:existingEntry.roles,
        centerId: existingEntry.centerId ,
        userId : existingEntry.userId,
        selectedRoles:existingEntry.selectedRoles,
        notifications
      }

      const user = await User.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });
      if (!user) return res.status(404).json({ message: "User not found!", success: false });
      return res.status(200).json({ user, success: true });
  } catch (error) {
      console.log(error);
      res.status(400).json({ message: error.message, success: false });
  }
};

export const searchUsers = async (req, res) => {
    try {
        const { search } = req.query;
        if (!search) {
            return res.status(400).json({ message: 'Search query is required', success: false });
        }

        const regex = new RegExp(search, 'i'); // Case-insensitive search

        const users = await User.find({
            $or: [
                { email: regex },
                { username: regex },
                // { hospitalAddress: regex },
                // { adminPhoneNo: regex },
                // { accountPhoneNo: regex },
                // { city: regex },
                // { state: regex }
            ]
        });

        if (!users) {
            return res.status(404).json({ message: 'No users found', success: false });
        }

        return res.status(200).json({
            users: users,
            success: true,
            pagination: {
                currentPage: 1,
                totalPages: Math.ceil(users.length / 12),
                totalusers: users.length,
            },
        });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Failed to search users', success: false });
    }
};

export const getAllUsers = async (req, res) => {
  try {
      const users = await User.find().select("username role centerId");
      if (!users ) {
          return res.status(404).json({ message: "No Users found", success: false });
      }
      
      return res.status(200).json({users, 
        success: true ,
         });
  } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users', success: false });
  }
};

// Turnstile Verification Controller
export const verifyTurnstile = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, msg: "No token provided" });
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    const result = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
        }),
      }
    );

    const data = await result.json();

    if (data.success) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(400).json({ success: false, error: data["error-codes"] });
    }
  } catch (err) {
    console.error("Turnstile verification error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};


const EXOTEL_BASE_URL = "https://api.exotel.com";

const EXOTEL_ACCOUNT_SID = "irclinic1";

const exotelClient = axios.create({
  baseURL: EXOTEL_BASE_URL,

  auth: {
    username: process.env.EXOTEL_API_KEY,
    password: process.env.EXOTEL_API_TOKEN,
  },

  headers: {
    Accept: "application/json",
  },

  timeout: 30000,
});


/**
 * GET EXOTEL CALLS
 *
 * Supports:
 *
 * pageSize
 * after
 * before
 *
 * fromDate
 * toDate
 *
 * search
 * status
 * direction
 * phoneNumber
 * customField
 * sid
 *
 * sortBy
 */
export const getExotelCalls = async (req, res) => {
  try {

    if (!EXOTEL_ACCOUNT_SID) {
      return res.status(500).json({
        success: false,
        message: "EXOTEL_ACCOUNT_SID is not configured",
      });
    }


    // --------------------------------------------------
    // QUERY PARAMETERS
    // --------------------------------------------------

    const {
      pageSize = 50,

      after,
      before,

      fromDate,
      toDate,

      search,

      status,

      direction,

      phoneNumber,

      customField,

      sid,

      sortBy = "DateCreated:desc",
    } = req.query;


    // --------------------------------------------------
    // PAGE SIZE
    // --------------------------------------------------

    let limit = parseInt(pageSize, 10);

    if (Number.isNaN(limit)) {
      limit = 50;
    }

    // Exotel supports maximum 100 records per request
    limit = Math.min(Math.max(limit, 1), 100);


    // --------------------------------------------------
    // BUILD PARAMETERS
    // --------------------------------------------------

    const params = {
      PageSize: limit,
    };


    // --------------------------------------------------
    // DATE RANGE
    // --------------------------------------------------

    if (fromDate || toDate) {

      if (!fromDate || !toDate) {

        return res.status(400).json({
          success: false,
          message:
            "Both fromDate and toDate are required when using date range",
        });

      }


      params.DateCreated =
        `gte:${fromDate};lte:${toDate}`;
    }


    // --------------------------------------------------
    // CURSOR PAGINATION
    // --------------------------------------------------

    if (after) {
      params.After = after;
    }

    if (before) {
      params.Before = before;
    }


    // --------------------------------------------------
    // SORT
    // --------------------------------------------------

    const allowedSortFields = [
      "DateCreated",
      "DateUpdated",
      "StartTime",
      "EndTime",
    ];

    const [sortField, sortDirection] =
      String(sortBy).split(":");


    const safeSortField =
      allowedSortFields.includes(sortField)
        ? sortField
        : "DateCreated";


    const safeSortDirection =
      sortDirection === "asc"
        ? "asc"
        : "desc";


    params.SortBy =
      `${safeSortField}:${safeSortDirection}`;


    // --------------------------------------------------
    // SEARCH BY SID
    // --------------------------------------------------

    if (sid) {
      params.Sid = sid;
    }


    // --------------------------------------------------
    // PHONE NUMBER
    // --------------------------------------------------

    if (phoneNumber) {
      params.PhoneNumber = phoneNumber;
    }


    // --------------------------------------------------
    // STATUS
    // --------------------------------------------------

    const allowedStatuses = [
      "completed",
      "busy",
      "failed",
      "no-answer",
      "canceled",
      "from_leg_unanswered",
      "to_leg_unanswered",
      "from_leg_cancelled",
      "to_leg_no_dial",
      "from_leg_no_dial",
    ];

    if (status) {

      if (!allowedStatuses.includes(status)) {

        return res.status(400).json({
          success: false,
          message: "Invalid status",
          allowedStatuses,
        });

      }

      params.Status = status;
    }


    // --------------------------------------------------
    // DIRECTION
    // --------------------------------------------------

    const allowedDirections = [
      "inbound",
      "outbound",
    ];

    if (direction) {

      if (!allowedDirections.includes(direction)) {

        return res.status(400).json({
          success: false,
          message: "Invalid direction",
          allowedDirections,
        });

      }

      params.Direction = direction;
    }


    // --------------------------------------------------
    // CUSTOM FIELD
    // --------------------------------------------------

    if (customField) {
      params.CustomField = customField;
    }


    // --------------------------------------------------
    // SEARCH
    // --------------------------------------------------
    //
    // IMPORTANT:
    // Exotel's v1 endpoint does not provide a general
    // "search everywhere" parameter.
    //
    // Therefore, if search is supplied, we fetch the
    // filtered Exotel page and perform matching on the
    // returned records.
    //
    // This searches:
    //
    // Sid
    // From
    // To
    // PhoneNumber
    // CallerName
    // CustomField
    //
    // --------------------------------------------------

    const response = await exotelClient.get(
      `/v1/Accounts/${EXOTEL_ACCOUNT_SID}/Calls.json`,
      {
        params,
      }
    );


    const data = response.data || {};


    // --------------------------------------------------
    // EXOTEL CALLS
    // --------------------------------------------------

    let calls = Array.isArray(data.Calls)
      ? data.Calls
      : [];


    // --------------------------------------------------
    // LOCAL SEARCH
    // --------------------------------------------------

    if (search) {

      const searchText =
        String(search).trim().toLowerCase();


      calls = calls.filter((call) => {

        const searchableValues = [
          call.Sid,
          call.From,
          call.To,
          call.PhoneNumber,
          call.PhoneNumberSid,
          call.CallerName,
          call.CustomField,
          call.Status,
          call.Direction,
        ];


        return searchableValues.some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(searchText)
        );

      });

    }


    // --------------------------------------------------
    // METADATA
    // --------------------------------------------------

    const metadata = data.Metadata || {};


    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    return res.status(200).json({

      success: true,

      data: calls,

      pagination: {

        total: metadata.Total || null,

        pageSize:
          metadata.PageSize || limit,

        firstPageUri:
          metadata.FirstPageUri || null,

        prevPageUri:
          metadata.PrevPageUri || null,

        nextPageUri:
          metadata.NextPageUri || null,

        // Extract cursor values so React
        // doesn't have to parse Exotel URLs

        nextCursor:
          extractCursor(
            metadata.NextPageUri,
            "After"
          ),

        previousCursor:
          extractCursor(
            metadata.PrevPageUri,
            "Before"
          ),
      },

      filters: {

        fromDate:
          fromDate || null,

        toDate:
          toDate || null,

        search:
          search || null,

        status:
          status || null,

        direction:
          direction || null,

        phoneNumber:
          phoneNumber || null,

        customField:
          customField || null,

        sid:
          sid || null,

        sortBy:
          params.SortBy,
      },

    });

  } catch (error) {

    console.error(
      "Exotel Calls API Error:",
      error.response?.data || error.message
    );


    // --------------------------------------------------
    // EXOTEL RESPONSE ERROR
    // --------------------------------------------------

    if (error.response) {

      return res.status(error.response.status).json({

        success: false,

        message:
          "Exotel API request failed",

        exotelStatus:
          error.response.status,

        error:
          error.response.data,

      });

    }


    // --------------------------------------------------
    // NETWORK / TIMEOUT ERROR
    // --------------------------------------------------

    if (error.code === "ECONNABORTED") {

      return res.status(504).json({

        success: false,

        message:
          "Exotel API request timed out",

      });

    }


    // --------------------------------------------------
    // GENERAL ERROR
    // --------------------------------------------------

    return res.status(500).json({

      success: false,

      message:
        "Failed to fetch Exotel calls",

      error:
        error.message,

    });

  }
};


/**
 * Extract cursor from:
 *
 * /Calls.json?...&After=xxxxx
 */
function extractCursor(url, parameter) {

  if (!url) {
    return null;
  }

  try {

    const parsed =
      new URL(
        url,
        EXOTEL_BASE_URL
      );

    return parsed.searchParams.get(
      parameter
    );

  } catch (error) {

    return null;

  }
}

export const getExotelRecording = async (req, res) => {
  try {
    const { callSid } = req.params;

    if (!callSid) {
      return res.status(400).json({
        success: false,
        message: "Call SID is required",
      });
    }

    const accountSid = "irclinic1";

    // Exotel recording URL
    const recordingUrl =
      `https://recordings.exotel.com/exotelrecordings/${accountSid}/${callSid}.mp3`;

  //  console.log("Fetching recording:", recordingUrl);

    const response = await axios.get(recordingUrl, {
      auth: {
        username: process.env.EXOTEL_API_KEY,
        password: process.env.EXOTEL_API_TOKEN,
      },

      responseType: "stream",

      timeout: 30000,
    });

    res.setHeader(
      "Content-Type",
      response.headers["content-type"] || "audio/mpeg"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${callSid}.mp3"`
    );

    response.data.pipe(res);

  } catch (error) {

    console.error(
      "Exotel Recording Error:",
      error.response?.status,
      error.response?.data || error.message
    );

    if (error.response?.status === 404) {
      return res.status(404).json({
        success: false,
        message: "Recording not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to fetch recording",
    });
  }
};




