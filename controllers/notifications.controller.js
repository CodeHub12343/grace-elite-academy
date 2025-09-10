const Notification = require('../models/notification.model');
const User = require('../models/user.model');
const { sendMail } = require('../utils/mailer');
const { sendSms } = require('../utils/sms');
const { parsePagination } = require('../utils/query');

async function deliver(notification) {
  try {
    if (notification.type === 'email') {
      const user = await User.findById(notification.userId);
      if (user?.email) await sendMail({ to: user.email, subject: notification.title, html: `<p>${notification.message}</p>` });
    } else if (notification.type === 'sms') {
      // expects phone in metadata.phone
      if (notification.metadata?.phone) await sendSms(notification.metadata.phone, notification.message);
    } else if (notification.type === 'in-app') {
      // Socket.IO emission handled in socket util (optional future)
    }
    await Notification.updateOne({ _id: notification._id }, { $set: { status: 'sent' } });
  } catch (_err) {
    await Notification.updateOne({ _id: notification._id }, { $set: { status: 'failed' } });
  }
}

exports.sendOne = async (req, res) => {
  try {
    const { userId, type, title, message, metadata } = req.body;
    if (!userId || !type || !title || !message) return res.status(400).json({ success: false, message: 'Missing fields' });
    const notif = await Notification.create({ userId, type, title, message, metadata, status: 'pending' });
    await deliver(notif);
    return res.status(200).json({ success: true, data: notif });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.bulk = async (req, res) => {
  try {
    const { userIds = [], type, title, message, metadata } = req.body;
    if (!Array.isArray(userIds) || !userIds.length) return res.status(400).json({ success: false, message: 'userIds required' });
    const created = await Notification.insertMany(userIds.map((uid) => ({ userId: uid, type, title, message, metadata, status: 'pending' })));
    // naive immediate delivery; in production, queue
    await Promise.all(created.map(deliver));
    return res.status(200).json({ success: true, count: created.length });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.listUser = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [items, total] = await Promise.all([
      Notification.find({ userId: req.params.id }).sort('-createdAt').skip(skip).limit(limit),
      Notification.countDocuments({ userId: req.params.id }),
    ]);
    return res.status(200).json({ success: true, count: items.length, pagination: { page, limit, total, pages: Math.ceil(total / limit) }, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const doc = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.sub }, { $set: { readAt: new Date() } }, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};




