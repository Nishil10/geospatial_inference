import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import compareRoutes from './routes/compare.js';
import cityRoutes from './routes/city.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
// Base64 image payloads are not posted here, but comparison requests still
// carry more than the 100kb default.
app.use(express.json({ limit: '2mb' }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/compare', compareRoutes);
app.use('/api/city', cityRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
