const TeacherGrade = require('../models/teacherGrade.model');
const Teacher = require('../models/teacher.model');
const Student = require('../models/student.model');
const Class = require('../models/class.model');
const Subject = require('../models/subject.model');
const { parsePagination, parseSort } = require('../utils/query');

// Helper function to validate teacher access to subject and class
async function validateTeacherAccess(teacherId, subjectId, classId) {
  const [teacher, subject] = await Promise.all([
    Teacher.findById(teacherId),
    Subject.findById(subjectId).select('_id classId')
  ]);
  if (!teacher || !subject) return false;

  // Teacher must teach the subject, and that subject must belong to the requested class
  const teachesSubject = Array.isArray(teacher.subjects)
    && teacher.subjects.some((id) => String(id) === String(subjectId));
  const subjectAssignedToClass = String(subject.classId) === String(classId);

  return teachesSubject && subjectAssignedToClass;
}

// Helper function to get teacher's assigned subjects and classes
async function getTeacherAssignments(teacherId) {
  const teacher = await Teacher.findById(teacherId)
    .populate('subjects', 'name code')
    .populate('classes', 'name');
  
  if (!teacher) return { subjects: [], classes: [] };
  
  return {
    subjects: teacher.subjects || [],
    classes: teacher.classes || []
  };
}

// POST /teacher-grades/upload - Teacher uploads grades for their subject
exports.uploadGrade = async (req, res) => {
  try {
    const { 
      studentId, 
      classId, 
      subjectId, 
      term, 
      academicYear, 
      marks, 
      maxMarks, 
      remarks,
      examType,
      examTitle,
      examDate,
      isPublished = false 
    } = req.body;

    // Validate required fields
    if (!studentId || !classId || !subjectId || !term || !academicYear || !marks || !maxMarks) {
      return res.status(400).json({
        success: false,
        message: 'studentId, classId, subjectId, term, academicYear, marks, and maxMarks are required'
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

    // Get teacher ID from authenticated user
    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Validate teacher access to this subject and class
    const hasAccess = await validateTeacherAccess(teacher._id, subjectId, classId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to grade this subject/class combination'
      });
    }

    // Check if student exists and is in the specified class
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (String(student.classId) !== String(classId)) {
      return res.status(400).json({
        success: false,
        message: 'Student is not enrolled in the specified class'
      });
    }

    // Calculate percentage and grade
    const percentage = Math.round((marks / maxMarks) * 100 * 100) / 100;
    const grade = percentage >= 85 ? 'A' : percentage >= 70 ? 'B' : percentage >= 55 ? 'C' : percentage >= 40 ? 'D' : 'F';
    const defaultRemarks = TeacherGrade.getRemarks(percentage);

    // Check if grade already exists for this teacher-student-subject-term-year
    const existingGrade = await TeacherGrade.findOne({
      teacherId: teacher._id,
      studentId,
      subjectId,
      term,
      academicYear
    });

    if (existingGrade) {
      // Update existing grade
      existingGrade.marks = marks;
      existingGrade.maxMarks = maxMarks;
      existingGrade.percentage = percentage;
      existingGrade.grade = grade;
      existingGrade.remarks = remarks || defaultRemarks;
      existingGrade.examType = examType || 'final';
      existingGrade.examTitle = examTitle;
      existingGrade.examDate = examDate;
      existingGrade.isPublished = isPublished;
      existingGrade.updatedBy = req.user.sub;

      if (isPublished && !existingGrade.isPublished) {
        existingGrade.publishedAt = new Date();
        existingGrade.status = 'published';
      }

      await existingGrade.save();

      return res.status(200).json({
        success: true,
        message: 'Grade updated successfully',
        data: existingGrade
      });
    }

    // Create new grade
    const teacherGrade = new TeacherGrade({
      teacherId: teacher._id,
      studentId,
      classId,
      subjectId,
      term,
      academicYear,
      marks,
      maxMarks,
      percentage,
      grade,
      remarks: remarks || defaultRemarks,
      examType: examType || 'final',
      examTitle: examTitle,
      examDate: examDate,
      isPublished,
      createdBy: req.user.sub,
      status: isPublished ? 'published' : 'draft'
    });

    if (isPublished) {
      teacherGrade.publishedAt = new Date();
    }

    await teacherGrade.save();

    return res.status(201).json({
      success: true,
      message: 'Grade uploaded successfully',
      data: teacherGrade
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// POST /teacher-grades/bulk-upload - Teacher uploads grades for multiple students
exports.bulkUploadGrades = async (req, res) => {
  try {
    const { 
      classId, 
      subjectId, 
      term, 
      academicYear, 
      grades, 
      examType,
      examTitle,
      examDate,
      isPublished = false 
    } = req.body;

    if (!classId || !subjectId || !term || !academicYear || !grades || !Array.isArray(grades)) {
      return res.status(400).json({
        success: false,
        message: 'classId, subjectId, term, academicYear, and grades array are required'
      });
    }

    const validTerms = ['term1', 'term2', 'final'];
    if (!validTerms.includes(term)) {
      return res.status(400).json({
        success: false,
        message: `term must be one of: ${validTerms.join(', ')}`
      });
    }

    // Get teacher ID from authenticated user
    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Validate teacher access to this subject and class
    const hasAccess = await validateTeacherAccess(teacher._id, subjectId, classId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to grade this subject/class combination'
      });
    }

    const uploadResults = [];
    const errors = [];

    for (const gradeData of grades) {
      try {
        const { studentId, marks, maxMarks, remarks } = gradeData;

        if (!studentId || !marks || !maxMarks) {
          errors.push(`Invalid data for student ${studentId}`);
          continue;
        }

        // Check if student exists and is in the class
        const student = await Student.findById(studentId);
        if (!student || String(student.classId) !== String(classId)) {
          errors.push(`Student ${studentId} not found or not in class ${classId}`);
          continue;
        }

        const percentage = Math.round((marks / maxMarks) * 100 * 100) / 100;
        const grade = percentage >= 85 ? 'A' : percentage >= 70 ? 'B' : percentage >= 55 ? 'C' : percentage >= 40 ? 'D' : 'F';
        const defaultRemarks = TeacherGrade.getRemarks(percentage);

        // Check for existing grade
        const existingGrade = await TeacherGrade.findOne({
          teacherId: teacher._id,
          studentId,
          subjectId,
          term,
          academicYear
        });

        if (existingGrade) {
          // Update existing
          existingGrade.marks = marks;
          existingGrade.maxMarks = maxMarks;
          existingGrade.percentage = percentage;
          existingGrade.grade = grade;
          existingGrade.remarks = remarks || defaultRemarks;
          existingGrade.examType = examType || 'final';
          existingGrade.examTitle = examTitle;
          existingGrade.examDate = examDate;
          existingGrade.isPublished = isPublished;
          existingGrade.updatedBy = req.user.sub;

          if (isPublished && !existingGrade.isPublished) {
            existingGrade.publishedAt = new Date();
            existingGrade.status = 'published';
          }

          await existingGrade.save();
          uploadResults.push({ studentId, action: 'updated', grade: existingGrade });
        } else {
          // Create new
          const teacherGrade = new TeacherGrade({
            teacherId: teacher._id,
            studentId,
            classId,
            subjectId,
            term,
            academicYear,
            marks,
            maxMarks,
            percentage,
            grade,
            remarks: remarks || defaultRemarks,
            examType: examType || 'final',
            examTitle: examTitle,
            examDate: examDate,
            isPublished,
            createdBy: req.user.sub,
            status: isPublished ? 'published' : 'draft'
          });

          if (isPublished) {
            teacherGrade.publishedAt = new Date();
          }

          await teacherGrade.save();
          uploadResults.push({ studentId, action: 'created', grade: teacherGrade });
        }

      } catch (error) {
        errors.push(`Error processing student ${gradeData.studentId}: ${error.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Bulk upload completed. ${uploadResults.length} grades processed.`,
      data: {
        successful: uploadResults,
        errors: errors.length > 0 ? errors : null,
        summary: {
          total: grades.length,
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

// GET /teacher-grades/my-assignments - Teacher gets their assigned subjects and classes
exports.getMyAssignments = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access their assignments'
      });
    }

    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    const assignments = await getTeacherAssignments(teacher._id);

    return res.status(200).json({
      success: true,
      data: assignments
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /teacher-grades/my-grades - Teacher views grades they've uploaded
exports.getMyGrades = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access their grades'
      });
    }

    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    const { classId, subjectId, term, academicYear, studentId, status } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-createdAt');

    const filter = { teacherId: teacher._id };
    if (classId) filter.classId = classId;
    if (subjectId) filter.subjectId = subjectId;
    if (term) filter.term = term;
    if (academicYear) filter.academicYear = academicYear;
    if (studentId) filter.studentId = studentId;
    if (status) filter.status = status;

    const [grades, total] = await Promise.all([
      TeacherGrade.find(filter)
        .populate([
          { path: 'studentId', populate: { path: 'userId', select: 'name email' } },
          { path: 'classId', select: 'name' },
          { path: 'subjectId', select: 'name code' }
        ])
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      TeacherGrade.countDocuments(filter)
    ]);

    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };

    // Summary statistics
    const summaryAgg = await TeacherGrade.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$grade',
          count: { $sum: 1 },
          avgPercentage: { $avg: '$percentage' }
        }
      }
    ]);

    const summary = summaryAgg.reduce((acc, r) => {
      acc[r._id] = { count: r.count, avgPercentage: Math.round(r.avgPercentage * 100) / 100 };
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      count: grades.length,
      pagination,
      summary,
      data: grades
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /teacher-grades/class/:classId/subject/:subjectId - Teacher views grades for specific class/subject
exports.getClassSubjectGrades = async (req, res) => {
  try {
    const { classId, subjectId } = req.params;
    const { term, academicYear, studentId } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-createdAt');

    // Get teacher ID from authenticated user
    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Validate teacher access to this subject and class
    const hasAccess = await validateTeacherAccess(teacher._id, subjectId, classId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view grades for this subject/class combination'
      });
    }

    const filter = { 
      teacherId: teacher._id,
      classId,
      subjectId
    };
    if (term) filter.term = term;
    if (academicYear) filter.academicYear = academicYear;
    if (studentId) filter.studentId = studentId;

    const [grades, total] = await Promise.all([
      TeacherGrade.find(filter)
        .populate([
          { path: 'studentId', populate: { path: 'userId', select: 'name email' } },
          { path: 'classId', select: 'name' },
          { path: 'subjectId', select: 'name code' }
        ])
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      TeacherGrade.countDocuments(filter)
    ]);

    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };

    return res.status(200).json({
      success: true,
      count: grades.length,
      pagination,
      data: grades
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// PATCH /teacher-grades/:id/publish - Teacher publishes a grade
exports.publishGrade = async (req, res) => {
  try {
    const { id } = req.params;

    const grade = await TeacherGrade.findById(id);
    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found'
      });
    }

    // Verify teacher owns this grade
    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher || String(grade.teacherId) !== String(teacher._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only publish your own grades'
      });
    }

    grade.isPublished = true;
    grade.publishedAt = new Date();
    grade.status = 'published';
    grade.updatedBy = req.user.sub;

    await grade.save();

    return res.status(200).json({
      success: true,
      message: 'Grade published successfully',
      data: grade
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// DELETE /teacher-grades/:id - Teacher deletes their grade
exports.deleteGrade = async (req, res) => {
  try {
    const { id } = req.params;

    const grade = await TeacherGrade.findById(id);
    if (!grade) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found'
      });
    }

    // Verify teacher owns this grade
    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher || String(grade.teacherId) !== String(teacher._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own grades'
      });
    }

    await TeacherGrade.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Grade deleted successfully'
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /teacher-grades/student/:studentId - Get comprehensive student grades from all teachers
exports.getStudentComprehensiveGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { term, academicYear } = req.query;

    // Students can only view their own grades
    if (req.user.role === 'student') {
      const student = await Student.findOne({ userId: req.user.sub });
      if (!student || String(student._id) !== String(studentId)) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own grades'
        });
      }
    }

    const filter = { studentId, isPublished: true }; // Only published grades
    if (term) filter.term = term;
    if (academicYear) filter.academicYear = academicYear;

    const grades = await TeacherGrade.find(filter)
      .populate([
        { path: 'teacherId', populate: { path: 'userId', select: 'name' } },
        { path: 'subjectId', select: 'name code' },
        { path: 'classId', select: 'name' }
      ])
      .sort({ term: 1, 'subjectId.name': 1 });

    // Group grades by term
    const groupedGrades = grades.reduce((acc, grade) => {
      const key = `${grade.term}-${grade.academicYear}`;
      if (!acc[key]) {
        acc[key] = {
          term: grade.term,
          academicYear: grade.academicYear,
          subjects: [],
          totalMarks: 0,
          totalMaxMarks: 0,
          averagePercentage: 0
        };
      }
      
      acc[key].subjects.push({
        subjectName: grade.subjectId.name,
        subjectCode: grade.subjectId.code,
        teacherName: grade.teacherId.userId.name,
        marks: grade.marks,
        maxMarks: grade.maxMarks,
        percentage: grade.percentage,
        grade: grade.grade,
        remarks: grade.remarks,
        examType: grade.examType,
        examTitle: grade.examTitle,
        examDate: grade.examDate
      });
      
      acc[key].totalMarks += grade.marks;
      acc[key].totalMaxMarks += grade.maxMarks;
      
      return acc;
    }, {});

    // Calculate average percentage for each term
    Object.values(groupedGrades).forEach(termData => {
      termData.averagePercentage = Math.round((termData.totalMarks / termData.totalMaxMarks) * 100 * 100) / 100;
    });

    return res.status(200).json({
      success: true,
      count: grades.length,
      data: Object.values(groupedGrades)
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};




