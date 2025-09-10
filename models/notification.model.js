const mongoose = require('mongoose');

const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['email', 'sms', 'in-app'], required: true },
    status: { type: String, enum: ['sent', 'pending', 'failed'], default: 'pending', index: true },
    metadata: { type: Schema.Types.Mixed },
    readAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', NotificationSchema);




