const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Patient = require('./models/Patient');
const authRoutes = require('./routes/authRoutes');
const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: 'http://localhost:5173', // Your frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions)); // Apply CORS with options

// const frontend = express.static(path.join(__dirname, '../dist'));
// console.log(frontend)
// app.use(express.static(frontend))

// app.use(express.static(path.join(__dirname, 'public')));
const frontend = path.join(__dirname, '../frontend/dist');
console.log('Frontend directory:', frontend);
console.log('Frontend path:', path.join(__dirname, '../frontend/dist'));
// console.log('Frontend path:', frontend);
app.use(express.static(frontend));

app.use(express.json());
app.use('/api/auth', authRoutes);

require('dotenv').config();
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

app.get('/api/patients', (req, res) => {
  res.sendFile(path.join(frontend, 'index.html'))
})

app.get('/patients', async (req, res) => {
    const patients = await Patient.find();
    res.json(patients);
});
  
// Update your POST /patients route
app.post('/api/patients', async (req, res) => {
  try {
    // Create basic patient without auth fields
    const patientData = {
      name: req.body.name,
      age: req.body.age,
      ailment: req.body.ailment,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role || 'patient', // Default to 'patient' if not provided
    };
    
    const patient = new Patient(patientData);
    await patient.save();
    res.json(patient);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});
  
app.put('/api/patients/:id', async (req, res) => {
    const updated = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
});
  
app.delete('/api/patients/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const deleted = await Patient.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Patient not found' });
      }
      res.json({ message: 'Patient deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(5000, () => console.log('Server running on port 5000'));