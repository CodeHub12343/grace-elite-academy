const TermResult = require('../models/termResult.model');
const Student = require('../models/student.model');
const Class = require('../models/class.model');
const Subject = require('../models/subject.model');
const TeacherGrade = require('../models/teacherGrade.model');
const { parsePagination, parseSort } = require('../utils/query');

// Helper function to compute grade
function computeGrade(percentage) {
  if (percentage >= 85) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 55) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

// Helper function to get remarks based on performance
function getRemarks(percentage) {
  if (percentage >= 85) return 'Excellent performance! Keep up the good work.';
  if (percentage >= 70) return 'Good performance. There is room for improvement.';
  if (percentage >= 55) return 'Average performance. More effort is needed.';
  if (percentage >= 40) return 'Below average. Please work harder.';
  return 'Poor performance. Immediate attention required.';
}

// POST /term-results/upload - Admin uploads term results for a student
exports.uploadTermResult = async (req, res) => {
  try {
    const { 
      studentId, 
      classId, 
      term, 
      academicYear, 
      subjects, 
      comments,
      isPublished = false 
    } = req.body;

    // Validate required fields
    if (!studentId || !classId || !term || !academicYear || !subjects || !Array.isArray(subjects)) {
      return res.status(400).json({
        success: false,
        message: 'studentId, classId, term, academicYear, and subjects array are required'
      });
    }

    // Validate term
    const validTerms = ['term1', 'term2', 'final'];
    if (!validTerms.includes(term)) {
      return res.status(400).json({
        success: false,
        message: `term must be one of: ${validTerms.join(', ')}`
      });
    }

    // Check if student exists and is in the specified class
    const student = await Student.findById(studentId).populate('classId');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (String(student.classId._id) !== String(classId)) {
      return res.status(400).json({
        success: false,
        message: 'Student is not enrolled in the specified class'
      });
    }

    // Validate subjects data
    let totalMarks = 0;
    let totalMaxMarks = 0;
    const validatedSubjects = [];

    for (const subject of subjects) {
      if (!subject.subjectId || !subject.marks || !subject.maxMarks) {
        return res.status(400).json({
          success: false,
          message: 'Each subject must have subjectId, marks, and maxMarks'
        });
      }

      // Verify subject exists
      const subjectDoc = await Subject.findById(subject.subjectId);
      if (!subjectDoc) {
        return res.status(404).json({
          success: false,
          message: `Subject with ID ${subject.subjectId} not found`
        });
      }

      const percentage = (subject.marks / subject.maxMarks) * 100;
      const grade = computeGrade(percentage);
      const remarks = getRemarks(percentage);

      validatedSubjects.push({
        subjectId: subject.subjectId,
        subjectName: subjectDoc.name,
        subjectCode: subjectDoc.code,
        marks: subject.marks,
        maxMarks: subject.maxMarks,
        percentage: Math.round(percentage * 100) / 100,
        grade,
        remarks,
        examType: subject.examType || 'final',
        examTitle: subject.examTitle || `${term} Examination`
      });

      totalMarks += subject.marks;
      totalMaxMarks += subject.maxMarks;
    }

    const averagePercentage = Math.round((totalMarks / totalMaxMarks) * 100 * 100) / 100;
    const overallGrade = computeGrade(averagePercentage);
    const overallRemarks = getRemarks(averagePercentage);

    // Check if result already exists for this student, term, class, and academic year
    const existingResult = await TermResult.findOne({
      studentId,
      classId,
      term,
      academicYear
    });

    if (existingResult) {
      // Update existing result
      existingResult.subjects = validatedSubjects;
      existingResult.totalMarks = totalMarks;
      existingResult.totalMaxMarks = totalMaxMarks;
      existingResult.averagePercentage = averagePercentage;
      existingResult.overallGrade = overallGrade;
      existingResult.overallRemarks = overallRemarks;
      existingResult.comments = comments;
      existingResult.isPublished = isPublished;
      existingResult.uploadedBy = req.user.sub;
      existingResult.uploadedAt = new Date();

      if (isPublished && !existingResult.isPublished) {
        existingResult.publishedAt = new Date();
        existingResult.publishedBy = req.user.sub;
        existingResult.status = 'published';
      }

      await existingResult.save();

      return res.status(200).json({
        success: true,
        message: 'Term result updated successfully',
        data: existingResult
      });
    }

    // Create new result
    const termResult = new TermResult({
      studentId,
      classId,
      term,
      academicYear,
      subjects: validatedSubjects,
      totalMarks,
      totalMaxMarks,
      averagePercentage,
      overallGrade,
      overallRemarks,
      comments,
      isPublished,
      uploadedBy: req.user.sub,
      status: isPublished ? 'published' : 'draft'
    });

    if (isPublished) {
      termResult.publishedAt = new Date();
      termResult.publishedBy = req.user.sub;
    }

    await termResult.save();

    return res.status(201).json({
      success: true,
      message: 'Term result uploaded successfully',
      data: termResult
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// POST /term-results/bulk-upload - Admin uploads results for multiple students
exports.bulkUploadTermResults = async (req, res) => {
  try {
    const { 
      classId, 
      term, 
      academicYear, 
      results, 
      comments,
      isPublished = false 
    } = req.body;

    if (!classId || !term || !academicYear || !results || !Array.isArray(results)) {
      return res.status(400).json({
        success: false,
        message: 'classId, term, academicYear, and results array are required'
      });
    }

    const validTerms = ['term1', 'term2', 'final'];
    if (!validTerms.includes(term)) {
      return res.status(400).json({
        success: false,
        message: `term must be one of: ${validTerms.join(', ')}`
      });
    }

    // Verify class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    const uploadResults = [];
    const errors = [];

    for (const result of results) {
      try {
        const { studentId, subjects } = result;

        if (!studentId || !subjects || !Array.isArray(subjects)) {
          errors.push(`Invalid data for student ${studentId}`);
          continue;
        }

        // Check if student exists and is in the class
        const student = await Student.findById(studentId);
        if (!student || String(student.classId) !== String(classId)) {
          errors.push(`Student ${studentId} not found or not in class ${classId}`);
          continue;
        }

        // Process subjects similar to single upload
        let totalMarks = 0;
        let totalMaxMarks = 0;
        const validatedSubjects = [];

        for (const subject of subjects) {
          if (!subject.subjectId || !subject.marks || !subject.maxMarks) {
            errors.push(`Invalid subject data for student ${studentId}`);
            continue;
          }

          const subjectDoc = await Subject.findById(subject.subjectId);
          if (!subjectDoc) {
            errors.push(`Subject ${subject.subjectId} not found for student ${studentId}`);
            continue;
          }

          const percentage = (subject.marks / subject.maxMarks) * 100;
          const grade = computeGrade(percentage);
          const remarks = getRemarks(percentage);

          validatedSubjects.push({
            subjectId: subject.subjectId,
            subjectName: subjectDoc.name,
            subjectCode: subjectDoc.code,
            marks: subject.marks,
            maxMarks: subject.maxMarks,
            percentage: Math.round(percentage * 100) / 100,
            grade,
            remarks,
            examType: subject.examType || 'final',
            examTitle: subject.examTitle || `${term} Examination`
          });

          totalMarks += subject.marks;
          totalMaxMarks += subject.maxMarks;
        }

        if (validatedSubjects.length === 0) {
          errors.push(`No valid subjects for student ${studentId}`);
          continue;
        }

        const averagePercentage = Math.round((totalMarks / totalMaxMarks) * 100 * 100) / 100;
        const overallGrade = computeGrade(averagePercentage);
        const overallRemarks = getRemarks(averagePercentage);

        // Check for existing result
        const existingResult = await TermResult.findOne({
          studentId,
          classId,
          term,
          academicYear
        });

        if (existingResult) {
          // Update existing
          existingResult.subjects = validatedSubjects;
          existingResult.totalMarks = totalMarks;
          existingResult.totalMaxMarks = totalMaxMarks;
          existingResult.averagePercentage = averagePercentage;
          existingResult.overallGrade = overallGrade;
          existingResult.overallRemarks = overallRemarks;
          existingResult.comments = comments;
          existingResult.isPublished = isPublished;
          existingResult.uploadedBy = req.user.sub;
          existingResult.uploadedAt = new Date();

          if (isPublished && !existingResult.isPublished) {
            existingResult.publishedAt = new Date();
            existingResult.publishedBy = req.user.sub;
            existingResult.status = 'published';
          }

          await existingResult.save();
          uploadResults.push({ studentId, action: 'updated', result: existingResult });
        } else {
          // Create new
          const termResult = new TermResult({
            studentId,
            classId,
            term,
            academicYear,
            subjects: validatedSubjects,
            totalMarks,
            totalMaxMarks,
            averagePercentage,
            overallGrade,
            overallRemarks,
            comments,
            isPublished,
            uploadedBy: req.user.sub,
            status: isPublished ? 'published' : 'draft'
          });

          if (isPublished) {
            termResult.publishedAt = new Date();
            termResult.publishedBy = req.user.sub;
          }

          await termResult.save();
          uploadResults.push({ studentId, action: 'created', result: termResult });
        }

      } catch (error) {
        errors.push(`Error processing student ${result.studentId}: ${error.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk upload completed. ${uploadResults.length} results processed.`,
      data: {
        successful: uploadResults,
        errors: errors.length > 0 ? errors : null,
        summary: {
          total: results.length,
          successful: uploadResults.length,
          failed: errors.length
        }
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /term-results/student/:studentId - Student views their term results
exports.getStudentTermResults = async (req, res) => {
  try {
    let { studentId } = req.params;
    const { term, academicYear, isPublished = true } = req.query;

    // Students can only view their own results.
    // Support alias `me` and ensure param matches the logged-in student's Student._id
    if (req.user.role === 'student') {
      const Student = require('../models/student.model');
      // Resolve the logged-in student's document via userId
      const myStudent = await Student.findOne({ userId: req.user.sub }).select('_id');
      if (!myStudent) {
        return res.status(404).json({ success: false, message: 'Student record not found for user' });
      }
      if (studentId === 'me') {
        studentId = String(myStudent._id);
      }
      if (String(myStudent._id) !== String(studentId)) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own results'
        });
      }
    }

    // Build filter
    const filter = { studentId, isPublished: true }; // Only published results
    if (term) filter.term = term;
    if (academicYear) filter.academicYear = academicYear;

    // Get pagination and sorting
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-academicYear,-term');

    const [results, total] = await Promise.all([
      TermResult.find(filter)
        .populate([
          { path: 'classId', select: 'name' },
          { path: 'uploadedBy', select: 'name' },
          { path: 'publishedBy', select: 'name' }
        ])
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      TermResult.countDocuments(filter)
    ]);

    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };

    return res.status(200).json({
      success: true,
      count: results.length,
      pagination,
      data: results
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /term-results/class/:classId - Admin/Teacher views class results for a term
exports.getClassTermResults = async (req, res) => {
  try {
    const { classId } = req.params;
    const { term, academicYear, isPublished } = req.query;

    // Build filter
    const filter = { classId };
    if (term) filter.term = term;
    if (academicYear) filter.academicYear = academicYear;
    if (isPublished !== undefined) filter.isPublished = isPublished === 'true';

    // Get pagination and sorting
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-averagePercentage');

    const [results, total] = await Promise.all([
      TermResult.find(filter)
        .populate([
          { path: 'studentId', populate: { path: 'userId', select: 'name email' } },
          { path: 'classId', select: 'name' },
          { path: 'uploadedBy', select: 'name' },
          { path: 'publishedBy', select: 'name' }
        ])
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      TermResult.countDocuments(filter)
    ]);

    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };

    return res.status(200).json({
      success: true,
      count: results.length,
      pagination,
      data: results
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// PATCH /term-results/:id/publish - Admin publishes a term result
exports.publishTermResult = async (req, res) => {
  try {
    const { id } = req.params;

    const termResult = await TermResult.findById(id);
    if (!termResult) {
      return res.status(404).json({
        success: false,
        message: 'Term result not found'
      });
    }

    termResult.isPublished = true;
    termResult.publishedAt = new Date();
    termResult.publishedBy = req.user.sub;
    termResult.status = 'published';

    await termResult.save();

    return res.status(200).json({
      success: true,
      message: 'Term result published successfully',
      data: termResult
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// DELETE /term-results/:id - Admin deletes a term result
exports.deleteTermResult = async (req, res) => {
  try {
    const { id } = req.params;

    const termResult = await TermResult.findByIdAndDelete(id);
    if (!termResult) {
      return res.status(404).json({
        success: false,
        message: 'Term result not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Term result deleted successfully'
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// POST /term-results/publish - Admin aggregates TeacherGrades into TermResult (upsert)
exports.publishFromTeacherGrades = async (req, res) => {
  try {
    const { studentId, classId, term, academicYear, publish = true } = req.body || {};

    if (!studentId || !classId || !term || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'studentId, classId, term, and academicYear are required'
      });
    }

    const validTerms = ['term1', 'term2', 'final'];
    if (!validTerms.includes(term)) {
      return res.status(400).json({ success: false, message: `term must be one of: ${validTerms.join(', ')}` });
    }

    // Validate student belongs to class
    const student = await Student.findById(studentId).select('_id classId');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (String(student.classId) !== String(classId)) {
      return res.status(400).json({ success: false, message: 'Student is not enrolled in the specified class' });
    }

    // Fetch teacher grades for this student/term/year/class
    const grades = await TeacherGrade.find({ studentId, classId, term, academicYear })
      .populate([{ path: 'subjectId', select: 'name code' }]);

    if (grades.length === 0) {
      return res.status(404).json({ success: false, message: 'No teacher grades found for specified filters' });
    }

    const subjects = grades.map((g) => ({
      subjectId: g.subjectId?._id || g.subjectId,
      subjectName: g.subjectId?.name || 'Unknown',
      subjectCode: g.subjectId?.code || 'NA',
      marks: g.marks,
      maxMarks: g.maxMarks,
      percentage: g.percentage,
      grade: g.grade,
      remarks: g.remarks,
      examType: g.examType,
      examTitle: g.examTitle
    }));

    const totalMarks = subjects.reduce((sum, s) => sum + (s.marks || 0), 0);
    const totalMaxMarks = subjects.reduce((sum, s) => sum + (s.maxMarks || 0), 0);
    const averagePercentage = totalMaxMarks > 0 ? Math.round((totalMarks / totalMaxMarks) * 10000) / 100 : 0;
    const overallGrade = computeGrade(averagePercentage);
    const overallRemarks = getRemarks(averagePercentage);

    const update = {
      subjects,
      totalMarks,
      totalMaxMarks,
      averagePercentage,
      overallGrade,
      overallRemarks,
      uploadedBy: req.user?.sub,
      uploadedAt: new Date(),
      status: publish ? 'published' : 'draft',
      isPublished: !!publish,
      publishedAt: publish ? new Date() : undefined,
      publishedBy: publish ? req.user?.sub : undefined,
    };

    const result = await TermResult.findOneAndUpdate(
      { studentId, classId, term, academicYear },
      { $set: update, $setOnInsert: { studentId, classId, term, academicYear } },
      { upsert: true, new: true }
    ).populate([{ path: 'classId', select: 'name' }]);

    return res.status(200).json({ success: true, message: 'Term result aggregated', data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};









