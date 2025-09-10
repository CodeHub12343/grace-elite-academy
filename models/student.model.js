const mongoose = require('mongoose');

const { Schema } = mongoose;

const StudentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    rollNumber: { type: String, unique: true, sparse: true },
    parentName: { type: String },
    parentContact: { type: String },
    // Additional profile fields
    dateOfBirth: { type: Date },
    stateOfOrigin: { type: String },
    localGovernment: { type: String },
    parentPhoneNumber: { type: String },
    houseAddress: { type: String },
    sex: { type: String, enum: ['male', 'female', 'other'] },
    religion: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', StudentSchema);


