const mongoose = require('mongoose');

const { Schema } = mongoose;

const FileSchema = new Schema(
  {
    fileName: { type: String, required: true },
    key: { type: String, required: true, index: true, unique: true },
    url: { type: String },
    uploaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['admin', 'teacher', 'student', 'parent'] },
    category: { type: String, enum: ['profile', 'assignment', 'resource', 'other'], default: 'other' },
    size: { type: Number },
    mimeType: { type: String },
    relatedId: { type: Schema.Types.ObjectId },
    isPublic: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'uploaded', 'deleted'], default: 'pending' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('File', FileSchema);




