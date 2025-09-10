

const crypto = require('crypto');
const User = require('../models/user.model');
const Student = require('../models/student.model');
const Teacher = require('../models/teacher.model');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../config/jwt');
const sendEmail = require('../utils/sendEmail');

function buildUserResponse(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
}

function setRefreshCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already in use' });

    const user = await User.create({ name, email, password, role });

    const accessToken = signAccessToken({ sub: String(user._id), role: user.role });
    const refreshToken = signRefreshToken({ sub: String(user._id) });
    user.refreshToken = refreshToken;
    await user.save();
    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      user: buildUserResponse(user),
      tokens: { accessToken },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const accessToken = signAccessToken({ sub: String(user._id), role: user.role });
    const refreshToken = signRefreshToken({ sub: String(user._id) });

    user.refreshToken = refreshToken;
    await user.save();
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      user: buildUserResponse(user),
      tokens: { accessToken },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.logoutUser = async (req, res) => {
  try {
    const refreshToken = req.cookies && req.cookies.refreshToken;
    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await User.updateOne({ _id: payload.sub, refreshToken }, { $unset: { refreshToken: 1 } });
      } catch (_e) {}
    }
    res.clearCookie('refreshToken', { path: '/api/auth' });
    return res.status(200).json({ message: 'Logged out' });
  } catch (_err) {
    return res.status(200).json({ message: 'Logged out' });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies && req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: 'Missing refresh token' });

    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findOne({ _id: payload.sub, refreshToken });
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });

    const newAccessToken = signAccessToken({ sub: String(user._id), role: user.role });
    return res.status(200).json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ message: 'If that email exists, a reset link was sent' });

    const token = crypto.randomBytes(32).toString('hex');
    const resetToken = signRefreshToken({ sub: String(user._id), jti: token });
    const resetLink = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;

    await sendEmail(user.email, 'Password Reset', `Click to reset your password: ${resetLink}`);
    return res.status(200).json({ message: 'If that email exists, a reset link was sent' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    if (!password) return res.status(400).json({ message: 'Password is required' });

    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(400).json({ message: 'Invalid token' });

    user.password = password; // will be hashed by pre-save
    await user.save();
    return res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ user: buildUserResponse(user) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const update = {};
    if (name) update.name = name;
    if (email) update.email = email;
    const user = await User.findByIdAndUpdate(req.user.sub, update, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ user: buildUserResponse(user) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PUT /auth/change-password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ message: 'oldPassword and newPassword are required' });
    const user = await User.findById(req.user.sub);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ message: 'Old password is incorrect' });
    user.password = newPassword;
    await user.save();
    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE /auth/account
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.sub);
    res.clearCookie('refreshToken', { path: '/api/auth' });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ message: 'Account deleted' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /auth/reset-password (token in body)
exports.resetPasswordWithBodyToken = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ message: 'token and password are required' });
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(400).json({ message: 'Invalid token' });
    user.password = password;
    await user.save();
    return res.status(200).json({ message: 'Password reset successful' });
  } catch (err) {
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
};

// GET /auth/student/profile - Get student profile
exports.getStudentProfile = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied. Student role required.' });
    }

    const student = await Student.findOne({ userId: req.user.sub })
      .populate('userId', 'name email')
      .populate('classId', 'name');

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const profile = {
      id: student._id,
      user: {
        id: student.userId._id,
        name: student.userId.name,
        email: student.userId.email,
      },
      class: {
        id: student.classId._id,
        name: student.classId.name,
      },
      rollNumber: student.rollNumber,
      parentName: student.parentName,
      parentContact: student.parentContact,
      dateOfBirth: student.dateOfBirth,
      stateOfOrigin: student.stateOfOrigin,
      localGovernment: student.localGovernment,
      parentPhoneNumber: student.parentPhoneNumber,
      houseAddress: student.houseAddress,
      sex: student.sex,
      religion: student.religion,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };

    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PUT /auth/student/profile - Update student profile
exports.updateStudentProfile = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied. Student role required.' });
    }

    const {
      dateOfBirth,
      stateOfOrigin,
      localGovernment,
      parentPhoneNumber,
      houseAddress,
      sex,
      religion,
      parentName,
      parentContact,
    } = req.body;

    // Validate sex if provided
    if (sex && !['male', 'female', 'other'].includes(sex)) {
      return res.status(400).json({ message: 'sex must be one of: male, female, other' });
    }

    // Validate date of birth if provided
    if (dateOfBirth && isNaN(new Date(dateOfBirth).getTime())) {
      return res.status(400).json({ message: 'Invalid date of birth format' });
    }

    const updateData = {};
    if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
    if (stateOfOrigin !== undefined) updateData.stateOfOrigin = stateOfOrigin;
    if (localGovernment !== undefined) updateData.localGovernment = localGovernment;
    if (parentPhoneNumber !== undefined) updateData.parentPhoneNumber = parentPhoneNumber;
    if (houseAddress !== undefined) updateData.houseAddress = houseAddress;
    if (sex !== undefined) updateData.sex = sex;
    if (religion !== undefined) updateData.religion = religion;
    if (parentName !== undefined) updateData.parentName = parentName;
    if (parentContact !== undefined) updateData.parentContact = parentContact;

    const student = await Student.findOneAndUpdate(
      { userId: req.user.sub },
      updateData,
      { new: true, runValidators: true }
    ).populate('userId', 'name email').populate('classId', 'name');

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const profile = {
      id: student._id,
      user: {
        id: student.userId._id,
        name: student.userId.name,
        email: student.userId.email,
      },
      class: {
        id: student.classId._id,
        name: student.classId.name,
      },
      rollNumber: student.rollNumber,
      parentName: student.parentName,
      parentContact: student.parentContact,
      dateOfBirth: student.dateOfBirth,
      stateOfOrigin: student.stateOfOrigin,
      localGovernment: student.localGovernment,
      parentPhoneNumber: student.parentPhoneNumber,
      houseAddress: student.houseAddress,
      sex: student.sex,
      religion: student.religion,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };

    return res.status(200).json({ success: true, data: profile, message: 'Profile updated successfully' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PUT /auth/student/change-password - Change student password
exports.changeStudentPassword = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Access denied. Student role required.' });
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'oldPassword and newPassword are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// GET /auth/teacher/profile - Get teacher profile
exports.getTeacherProfile = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied. Teacher role required.' });
    }

    const teacher = await Teacher.findOne({ userId: req.user.sub })
      .populate('userId', 'name email')
      .populate('subjects', 'name code')
      .populate('classes', 'name');

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found' });
    }

    const profile = {
      id: teacher._id,
      user: {
        id: teacher.userId._id,
        name: teacher.userId.name,
        email: teacher.userId.email,
      },
      subjects: teacher.subjects,
      classes: teacher.classes,
      phone: teacher.phone,
      qualification: teacher.qualification,
      experience: teacher.experience,
      dateOfBirth: teacher.dateOfBirth,
      stateOfOrigin: teacher.stateOfOrigin,
      localGovernment: teacher.localGovernment,
      parentPhoneNumber: teacher.parentPhoneNumber,
      houseAddress: teacher.houseAddress,
      sex: teacher.sex,
      religion: teacher.religion,
      accountNumber: teacher.accountNumber,
      bankName: teacher.bankName,
      accountName: teacher.accountName,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    };

    return res.status(200).json({ success: true, data: profile });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PUT /auth/teacher/profile - Update teacher profile
exports.updateTeacherProfile = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied. Teacher role required.' });
    }

    const {
      dateOfBirth,
      stateOfOrigin,
      localGovernment,
      parentPhoneNumber,
      houseAddress,
      sex,
      religion,
      accountNumber,
      bankName,
      accountName,
      phone,
      qualification,
      experience,
    } = req.body;

    if (sex && !['male', 'female', 'other'].includes(sex)) {
      return res.status(400).json({ message: 'sex must be one of: male, female, other' });
    }
    if (dateOfBirth && isNaN(new Date(dateOfBirth).getTime())) {
      return res.status(400).json({ message: 'Invalid date of birth format' });
    }

    const updateData = {};
    if (dateOfBirth !== undefined) updateData.dateOfBirth = new Date(dateOfBirth);
    if (stateOfOrigin !== undefined) updateData.stateOfOrigin = stateOfOrigin;
    if (localGovernment !== undefined) updateData.localGovernment = localGovernment;
    if (parentPhoneNumber !== undefined) updateData.parentPhoneNumber = parentPhoneNumber;
    if (houseAddress !== undefined) updateData.houseAddress = houseAddress;
    if (sex !== undefined) updateData.sex = sex;
    if (religion !== undefined) updateData.religion = religion;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (accountName !== undefined) updateData.accountName = accountName;
    if (phone !== undefined) updateData.phone = phone;
    if (qualification !== undefined) updateData.qualification = qualification;
    if (experience !== undefined) updateData.experience = experience;

    const teacher = await Teacher.findOneAndUpdate(
      { userId: req.user.sub },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('userId', 'name email')
      .populate('subjects', 'name code')
      .populate('classes', 'name');

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found' });
    }

    const profile = {
      id: teacher._id,
      user: {
        id: teacher.userId._id,
        name: teacher.userId.name,
        email: teacher.userId.email,
      },
      subjects: teacher.subjects,
      classes: teacher.classes,
      phone: teacher.phone,
      qualification: teacher.qualification,
      experience: teacher.experience,
      dateOfBirth: teacher.dateOfBirth,
      stateOfOrigin: teacher.stateOfOrigin,
      localGovernment: teacher.localGovernment,
      parentPhoneNumber: teacher.parentPhoneNumber,
      houseAddress: teacher.houseAddress,
      sex: teacher.sex,
      religion: teacher.religion,
      accountNumber: teacher.accountNumber,
      bankName: teacher.bankName,
      accountName: teacher.accountName,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    };

    return res.status(200).json({ success: true, data: profile, message: 'Profile updated successfully' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// PUT /auth/teacher/change-password - Change teacher password
exports.changeTeacherPassword = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied. Teacher role required.' });
    }

    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'oldPassword and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }

    const user = await User.findById(req.user.sub);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Old password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    return res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

