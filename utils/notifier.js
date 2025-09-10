const Notification = require('../models/notification.model');
const { enqueueNotification } = require('./queue');

async function notify(userId, type, title, message, metadata) {
  const notif = await Notification.create({ userId, type, title, message, metadata, status: 'pending' });
  await enqueueNotification(notif._id);
  return notif;
}

module.exports = { notify };


