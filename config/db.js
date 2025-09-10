const mongoose = require('mongoose');
const { mongoUri } = require('./env');

async function connectToMongo() {
  if (!mongoUri) {
    throw new Error('MONGO_URI is not set');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(mongoUri, {
    // Recommended options kept minimal for Mongoose 8+
    autoIndex: true,
    serverSelectionTimeoutMS: 10000,
  });
}

module.exports = { connectToMongo };



