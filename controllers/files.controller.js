const File = require('../models/file.model');
const { getPresignedPutUrl, getPresignedGetUrl, deleteObject } = require('../utils/s3');
const { parsePagination, parseSort } = require('../utils/query');

exports.getUploadUrl = async (req, res) => {
  try {
    const { fileName, mimeType, category, relatedId, isPublic } = req.body;
    if (!fileName || !mimeType) return res.status(400).json({ success: false, message: 'fileName and mimeType required' });
    const key = `${category || 'other'}/${req.user.sub}/${Date.now()}-${fileName}`;
    const uploadUrl = await getPresignedPutUrl(key, mimeType, 300);
    const doc = await File.create({ fileName, key, mimeType, uploaderId: req.user.sub, role: req.user.role, category: category || 'other', relatedId, isPublic: !!isPublic, status: 'pending' });
    return res.status(200).json({ success: true, data: { uploadUrl, fileKey: key, publicUrl: isPublic ? `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}` : null } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.confirmUpload = async (req, res) => {
  try {
    const { fileKey } = req.params;
    const doc = await File.findOneAndUpdate({ key: fileKey }, { $set: { status: 'uploaded' } }, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'File not found' });
    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.listFiles = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-createdAt');
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.relatedId) filter.relatedId = req.query.relatedId;
    if (req.user.role === 'student') {
      filter.$or = [{ uploaderId: req.user.sub }, { isPublic: true }];
    }
    const [items, total] = await Promise.all([
      File.find(filter).sort(sortObj).skip(skip).limit(limit),
      File.countDocuments(filter),
    ]);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.downloadFile = async (req, res) => {
  try {
    const doc = await File.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'File not found' });
    if (!doc.isPublic && String(doc.uploaderId) !== String(req.user.sub) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    const url = await getPresignedGetUrl(doc.key, 300);
    return res.status(200).json({ success: true, data: { url } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const doc = await File.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'File not found' });
    if (String(doc.uploaderId) !== String(req.user.sub) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    await deleteObject(doc.key);
    doc.status = 'deleted';
    await doc.save();
    return res.status(200).json({ success: true, data: null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};




