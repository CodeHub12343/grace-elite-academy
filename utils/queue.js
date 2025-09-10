const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');
const { sendMail } = require('./mailer');
const { sendSms } = require('./sms');
const Notification = require('../models/notification.model');
const User = require('../models/user.model');

let queueEnabled = true;
let notificationsQueue;
let connection;

try {
  if (!process.env.REDIS_URL) {
    queueEnabled = false;
    throw new Error('REDIS_URL not set; skipping queue init');
  }
  connection = new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
  notificationsQueue = new Queue('notifications', { connection });

  new Worker('notifications', async (job) => {
    const { notifId } = job.data;
    const notif = await Notification.findById(notifId);
    if (!notif) return;
    try {
      if (notif.type === 'email') {
        const user = await User.findById(notif.userId);
        if (user?.email) await sendMail({ to: user.email, subject: notif.title, html: `<p>${notif.message}</p>` });
      } else if (notif.type === 'sms') {
        if (notif.metadata?.phone) await sendSms(notif.metadata.phone, notif.message);
      }
      await Notification.updateOne({ _id: notif._id }, { $set: { status: 'sent' } });
    } catch (e) {
      await Notification.updateOne({ _id: notif._id }, { $set: { status: 'failed' } });
      throw e;
    }
  }, { connection, concurrency: 5 });
} catch (_e) {
  queueEnabled = false;
}

async function enqueueNotification(notifId) {
  if (!queueEnabled || !notificationsQueue) return;
  await notificationsQueue.add('send', { notifId }, { attempts: 5, backoff: { type: 'exponential', delay: 1000 } });
}

module.exports = { enqueueNotification, queueEnabled };


