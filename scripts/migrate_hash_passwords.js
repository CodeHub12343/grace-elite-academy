/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://emmanuel:Ifeoluwa123@cluster0.ca3wo6k.mongodb.net/';

function looksHashed(pw) {
  return typeof pw === 'string' && pw.startsWith('$2');
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const cursor = User.find({}).cursor();
  let scanned = 0;
  let updated = 0;
  for (let user = await cursor.next(); user != null; user = await cursor.next()) {
    scanned += 1;
    if (!looksHashed(user.password)) {
      const plain = user.password;
      user.password = await bcrypt.hash(String(plain || ''), 10);
      await user.save();
      updated += 1;
      if (updated % 100 === 0) console.log(`   Hashed ${updated} users so far...`);
    }
  }
  console.log(`Done. Scanned ${scanned}, hashed ${updated}.`);
  await mongoose.connection.close();
}

main().catch(err => { console.error('❌ Migration failed:', err); process.exit(1); });






































