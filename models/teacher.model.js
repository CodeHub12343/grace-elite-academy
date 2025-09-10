const mongoose = require('mongoose');

const { Schema } = mongoose;

const TeacherSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subjects: [{ type: Schema.Types.ObjectId, ref: 'Subject' }],
    classes: [{ type: Schema.Types.ObjectId, ref: 'Class' }],
    phone: { type: String },
    qualification: { type: String },
    experience: { type: Number, min: 0 },
    // Extended profile fields
    dateOfBirth: { type: Date },
    stateOfOrigin: { type: String },
    localGovernment: { type: String },
    parentPhoneNumber: { type: String },
    houseAddress: { type: String },
    sex: { type: String, enum: ['male', 'female', 'other'] },
    religion: { type: String },
    accountNumber: { type: String },
    bankName: { type: String },
    accountName: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Teacher', TeacherSchema);


