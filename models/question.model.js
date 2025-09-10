const mongoose = require('mongoose');

const { Schema } = mongoose;

const QuestionSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    type: { type: String, enum: ['mcq', 'true_false', 'short_answer'], required: true },
    questionText: { type: String, required: true },
    options: [{ type: String }],
    correctAnswer: { type: String, required: true },
    marks: { type: Number, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Question', QuestionSchema);


