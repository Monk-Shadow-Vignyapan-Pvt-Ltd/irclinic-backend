import { User } from '../models/user.model.js';
import jwt from "jsonwebtoken";
import bcryptjs from "bcryptjs";
import sharp from 'sharp';

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

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .send({ msg: "User with this email does not exist" });
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
   
    res.json({
      username: user.username,
      id: user._id,
      avatar: user.avatar,
      role:user.role,
      roles:user.roles,
      notifications:user.notifications ? user.notifications.reverse() : [],
      selectedRoles:user.selectedRoles,
      userId:user.userId,
      users:filteredUsers
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



