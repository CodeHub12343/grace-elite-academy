const Assignment = require('../models/assignment.model');
const AssignmentSubmission = require('../models/assignmentSubmission.model');
const { getPresignedPutUrl } = require('../utils/s3');
const { parsePagination, parseSort } = require('../utils/query');

exports.createAssignment = async (req, res) => {
  try {
    const doc = await Assignment.create(req.body);
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-createdAt');
    const filter = {};
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    const [items, total] = await Promise.all([
      Assignment.find(filter).sort(sortObj).skip(skip).limit(limit),
      Assignment.countDocuments(filter),
    ]);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPresignUrl = async (req, res) => {
  try {
    const { assignmentId, fileName, contentType } = req.body;
    if (!assignmentId || !fileName) return res.status(400).json({ success: false, message: 'assignmentId and fileName required' });
    const key = `assignments/${assignmentId}/${req.user.sub}/${Date.now()}_${fileName}`;
    const url = await getPresignedPutUrl(key, contentType || 'application/octet-stream');
    return res.status(200).json({ success: true, data: { key, url } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.submitAssignment = async (req, res) => {
  try {
    const { assignmentId, fileKey, fileUrl } = req.body;
    if (!assignmentId || !fileKey) return res.status(400).json({ success: false, message: 'assignmentId and fileKey required' });
    const doc = await AssignmentSubmission.findOneAndUpdate(
      { assignmentId, studentId: req.body.studentId || req.user.sub },
      { $set: { fileKey, fileUrl, submittedAt: new Date() } },
      { upsert: true, new: true }
    );
    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.gradeSubmission = async (req, res) => {
  try {
    const { marks, feedback } = req.body;
    const sub = await AssignmentSubmission.findByIdAndUpdate(req.params.id, { marks, feedback }, { new: true });
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found' });
    return res.status(200).json({ success: true, data: sub });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.getSubmissionsForAssignment = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [items, total] = await Promise.all([
      AssignmentSubmission.find({ assignmentId: req.params.assignmentId })
        .populate('studentId')
        .skip(skip)
        .limit(limit),
      AssignmentSubmission.countDocuments({ assignmentId: req.params.assignmentId }),
    ]);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


