const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');

const generateAccessToken = (patient) => {
  return jwt.sign(
    { id: patient._id, role: patient.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' }
  );
};

const generateRefreshToken = (patient) => {
  return jwt.sign(
    { id: patient._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
};

// Register Patient
exports.register = async (req, res) => {
  const { name, email, password, role, ailment, age } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newPatient = await Patient.create({
      name,
      email,
      password: hashedPassword,
      role,
      ailment,
      age
    });
    res.status(201).json({ message: 'Patient registered successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Patient already exists or bad input' });
  }
};

// Login Patient
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const patient = await Patient.findOne({ email });
    if (!patient || !(await bcrypt.compare(password, patient.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(patient);
    const refreshToken = generateRefreshToken(patient);

    patient.refreshToken = refreshToken;
    await patient.save();

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // set to true in production
      sameSite: 'Strict', // CSRF protection
      path: '/api/auth/refresh-token',
    });

    res.json({ accessToken });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
};

// Refresh Access Token
exports.refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.sendStatus(401);

  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const patient = await Patient.findById(payload.id);
    if (!patient || patient.refreshToken !== refreshToken) return res.sendStatus(403);

    const newAccessToken = generateAccessToken(patient);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.sendStatus(403);
  }
};

// Logout
exports.logout = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  const patient = await Patient.findOne({ refreshToken });

  if (patient) {
    patient.refreshToken = '';
    await patient.save();
  }

  res.clearCookie('refreshToken', {
    path: '/api/auth/refresh-token',
  });

  res.sendStatus(204);
};
