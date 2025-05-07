// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Patient = require('../models/Patient');

/// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔐 Incoming login request:", req.body);

    // Check if email and password were provided
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Look up the user by email
    const user = await Patient.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.log("❌ User not found for email:", email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare passwords
    // const isMatch = await bcrypt.compare(password, user.password);
    // if (!isMatch) {
    //   console.log("❌ Password mismatch for user:", user.email);
    //   return res.status(401).json({ message: 'Invalid credentials' });
    // }

    // Create access token
    const accessToken = jwt.sign(
      {
        userId: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Remove password from user data before sending back
    const userData = user.toObject();
    delete userData.password;

    console.log("✅ Login successful for user:", user.email);
    res.status(200).json({
      accessToken,
      user: userData
    });

  } catch (error) {
    console.error("🚨 Login error:", error);
    res.status(500).json({ message: 'Server error during login' });
  }
});



// Enhanced register route
router.post('/register', async (req, res) => {
  const { name, email, password, age, role, ailment } = req.body;

  try {
    // Basic required fields
    if (!name || !email || !password || !age || !role || !ailment) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ message: 'Name, email, age, role, ailment and password are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Password length check
    if (password.length < 9) {
      return res.status(400).json({ message: 'Password must be at least 9 characters' });
    }

    // Check if user already exists
    const existingUser = await Patient.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Hash password
    // const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new Patient({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || 'patient', // default role
      ailment: ailment?.trim() || undefined,
      age: age ? Number(age) : undefined
    });

    const savedUser = await newUser.save();

    // Generate token
    const accessToken = jwt.sign(
      { userId: savedUser._id, role: savedUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Respond without password
    const userResponse = {
      id: savedUser._id,
      name: savedUser.name,
      email: savedUser.email,
      role: savedUser.role,
      ailment: savedUser.ailment,
      age: savedUser.age
    };

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      user: userResponse
    });

  } catch (error) {
    console.error('Registration error:', error);

    // Validation error handling
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    res.status(500).json({
      message: 'Server error during registration',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});
module.exports = router;