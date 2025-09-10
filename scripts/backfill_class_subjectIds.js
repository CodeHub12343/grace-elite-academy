/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const ClassModel = require('../models/class.model');
const Subject = require('../models/subject.model');

const MONGO_URI = process.env.MONGO_URI;

async function backfill() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const classes = await ClassModel.find({}, { _id: 1, name: 1 });
    console.log(`📚 Classes found: ${classes.length}`);

    let totalLinks = 0;
    for (const cls of classes) {
      const subjects = await Subject.find({ classId: cls._id }, { _id: 1 });
      const subjectIds = subjects.map(s => s._id);
      if (subjectIds.length === 0) continue;

      const res = await ClassModel.updateOne(
        { _id: cls._id },
        { $addToSet: { subjectIds: { $each: subjectIds } } }
      );
      totalLinks += subjectIds.length;
      console.log(`   🔗 ${cls.name}: added ${subjectIds.length} subjects (${res.modifiedCount} modified)`);
    }

    console.log(`\n🎉 Backfill complete. Linked ${totalLinks} subjects across classes.`);
    await mongoose.connection.close();
    console.log('✅ Disconnected');
  } catch (err) {
    console.error('❌ Backfill failed:', err.message);
    process.exit(1);
  }
}

backfill();































