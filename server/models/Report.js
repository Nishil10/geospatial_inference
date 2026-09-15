import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  // Optional: posts survive even if the authoring user is later removed, so the
  // display name is denormalised rather than populated on every read.
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  authorName: {
    type: String,
    required: true,
    default: 'Anonymous'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  body: {
    type: String,
    default: '',
    trim: true
  },
  location: {
    type: String,
    default: '',
    trim: true
  },
  // Stored normalised (lowercase, no '#') so a tag search is an exact index hit
  // rather than a case-insensitive scan.
  tags: {
    type: [String],
    default: [],
    index: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN REVIEW', 'RESOLVED'],
    default: 'PENDING'
  }
}, {
  timestamps: true
});

// The feed is always "newest first, optionally filtered by tag".
reportSchema.index({ createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);

export default Report;
