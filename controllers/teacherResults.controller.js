const TeacherGrade = require('../models/teacherGrade.model');
const Teacher = require('../models/teacher.model');
const Student = require('../models/student.model');
const Class = require('../models/class.model');
const Subject = require('../models/subject.model');
const Exam = require('../models/exam.model');
const Grade = require('../models/grade.model');
const Submission = require('../models/submission.model');
const Question = require('../models/question.model');
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

// GET /teacher-results/classes - Get classes that teacher teaches
exports.getTeacherClasses = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access their classes'
      });
    }

    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    const classes = await Class.find({ _id: { $in: teacher.classes || [] } })
      .select('name description')
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      data: classes
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /teacher-results/subjects - Get subjects that teacher teaches for a specific class
exports.getTeacherSubjects = async (req, res) => {
  try {
    const { classId } = req.query;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access their subjects'
      });
    }

    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    let subjects = await Subject.find({ _id: { $in: teacher.subjects || [] } })
      .select('name code description classId');

    // If classId is provided, filter subjects that belong to that class
    if (classId) {
      subjects = subjects.filter(subject => {
        const subjectClassId = subject.classId._id || subject.classId;
        return String(subjectClassId) === String(classId);
      });
    }

    return res.status(200).json({
      success: true,
      data: subjects
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /teacher-results/terms - Get available terms and academic years
exports.getAvailableTerms = async (req, res) => {
  try {
    const { classId, subjectId } = req.query;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access term information'
      });
    }

    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Build filter for teacher grades
    const filter = { teacherId: teacher._id };
    if (classId) filter.classId = classId;
    if (subjectId) filter.subjectId = subjectId;

    // Get unique combinations of term and academic year from both TeacherGrade and Grade collections
    const [teacherGradeTerms, regularGradeTerms] = await Promise.all([
      TeacherGrade.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              term: '$term',
              academicYear: '$academicYear'
            },
            count: { $sum: 1 }
          }
        }
      ]),
      Grade.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              term: '$term',
              academicYear: '$academicYear'
            },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Combine and deduplicate terms
    const allTerms = [...teacherGradeTerms, ...regularGradeTerms];
    const termsMap = new Map();
    
    allTerms.forEach(item => {
      const key = `${item._id.term}-${item._id.academicYear}`;
      if (termsMap.has(key)) {
        termsMap.get(key).count += item.count;
      } else {
        termsMap.set(key, item);
      }
    });
    
    const termsData = Array.from(termsMap.values()).sort((a, b) => {
      if (a._id.academicYear !== b._id.academicYear) {
        return b._id.academicYear.localeCompare(a._id.academicYear);
      }
      return a._id.term.localeCompare(b._id.term);
    });

    const terms = termsData.map(item => ({
      term: item._id.term,
      academicYear: item._id.academicYear,
      count: item.count
    }));

    return res.status(200).json({
      success: true,
      data: terms
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /teacher-results/exam-types - Get available exam types for filtering
exports.getAvailableExamTypes = async (req, res) => {
  try {
    const { classId, subjectId, term, academicYear } = req.query;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access exam type information'
      });
    }

    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Build filter
    const filter = { teacherId: teacher._id };
    if (classId) filter.classId = classId;
    if (subjectId) filter.subjectId = subjectId;
    if (term) filter.term = term;
    if (academicYear) filter.academicYear = academicYear;

    // Get exam types from teacher grades
    const teacherExamTypes = await TeacherGrade.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$examType',
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get exam types from regular grades
    const regularExamTypes = await Grade.aggregate([
      { $match: { ...filter, teacherId: { $exists: false } } },
      {
        $group: {
          _id: '$examType',
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Combine and deduplicate
    const examTypeMap = new Map();
    
    teacherExamTypes.forEach(item => {
      examTypeMap.set(item._id, (examTypeMap.get(item._id) || 0) + item.count);
    });
    
    regularExamTypes.forEach(item => {
      examTypeMap.set(item._id, (examTypeMap.get(item._id) || 0) + item.count);
    });

    const examTypes = Array.from(examTypeMap.entries()).map(([examType, count]) => ({
      examType,
      count
    }));

    return res.status(200).json({
      success: true,
      data: examTypes
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /teacher-results/exam-titles - Get available exam titles for filtering
exports.getAvailableExamTitles = async (req, res) => {
  try {
    const { classId, subjectId, term, academicYear, examType } = req.query;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access exam title information'
      });
    }

    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Build filter
    const filter = { teacherId: teacher._id };
    if (classId) filter.classId = classId;
    if (subjectId) filter.subjectId = subjectId;
    if (term) filter.term = term;
    if (academicYear) filter.academicYear = academicYear;
    if (examType) filter.examType = examType;

    // Get exam titles from teacher grades
    const teacherExamTitles = await TeacherGrade.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$examTitle',
          count: { $sum: 1 },
          examType: { $first: '$examType' },
          examDate: { $first: '$examDate' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Get exam titles from regular grades
    const regularExamTitles = await Grade.aggregate([
      { $match: { ...filter, teacherId: { $exists: false } } },
      {
        $group: {
          _id: '$examTitle',
          count: { $sum: 1 },
          examType: { $first: '$examType' },
          examDate: { $first: '$examDate' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Combine and deduplicate
    const examTitleMap = new Map();
    
    teacherExamTitles.forEach(item => {
      const key = item._id || 'Untitled Exam';
      if (!examTitleMap.has(key)) {
        examTitleMap.set(key, {
          examTitle: item._id || 'Untitled Exam',
          examType: item.examType,
          examDate: item.examDate,
          count: 0
        });
      }
      examTitleMap.get(key).count += item.count;
    });
    
    regularExamTitles.forEach(item => {
      const key = item._id || 'Untitled Exam';
      if (!examTitleMap.has(key)) {
        examTitleMap.set(key, {
          examTitle: item._id || 'Untitled Exam',
          examType: item.examType,
          examDate: item.examDate,
          count: 0
        });
      }
      examTitleMap.get(key).count += item.count;
    });

    const examTitles = Array.from(examTitleMap.values()).sort((a, b) => 
      a.examTitle.localeCompare(b.examTitle)
    );

    return res.status(200).json({
      success: true,
      data: examTitles
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /teacher-results/students - Get students in a specific class
exports.getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access student information'
      });
    }

    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Check if teacher teaches this class
    const teachesClass = teacher.classes && teacher.classes.includes(classId);
    if (!teachesClass) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view students in this class'
      });
    }

    const students = await Student.find({ classId })
      .populate('userId', 'name email')
      .select('rollNumber admissionNumber userId')
      .sort({ rollNumber: 1 });

    return res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /teacher-results/results - Get comprehensive results for class/subject/term/year
exports.getTeacherResults = async (req, res) => {
  try {
    const { classId, subjectId, term, academicYear, examType, examTitle } = req.query;
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || 'rollNumber');

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access results'
      });
    }

    // Validate required parameters
    if (!classId || !subjectId || !term || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'classId, subjectId, term, and academicYear are required'
      });
    }

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
        message: 'You are not authorized to view results for this subject/class combination'
      });
    }

    // Get class and subject information
    const [classInfo, subjectInfo] = await Promise.all([
      Class.findById(classId).select('name description'),
      Subject.findById(subjectId).select('name code description')
    ]);

    // Get all students in the class
    const students = await Student.find({ classId })
      .populate('userId', 'name email')
      .select('rollNumber admissionNumber userId')
      .sort({ rollNumber: 1 });

    // Build grade filters
    const teacherGradeFilter = {
      teacherId: teacher._id,
      classId,
      subjectId,
      term,
      academicYear
    };
    
    const regularGradeFilter = {
      classId,
      subjectId,
      term
    };

    // For regular grades, filter by academic year using createdAt date
    if (academicYear) {
      const yearParts = academicYear.split('-');
      if (yearParts.length === 2) {
        const startYear = parseInt(yearParts[0]);
        const endYear = parseInt(yearParts[1]);
        
        // Academic year typically runs from September to August
        // e.g., 2023-2024 means Sept 2023 to Aug 2024
        const startDate = new Date(startYear, 8, 1); // September 1st
        const endDate = new Date(endYear, 7, 31, 23, 59, 59); // August 31st
        
        regularGradeFilter.createdAt = {
          $gte: startDate,
          $lte: endDate
        };
      }
    }

    // Add exam type filter if specified
    if (examType) {
      teacherGradeFilter.examType = examType;
      regularGradeFilter.examType = examType;
    }

    // Add exam title filter if specified
    if (examTitle) {
      teacherGradeFilter.examTitle = examTitle;
      regularGradeFilter.examTitle = examTitle;
    }

    // Get teacher grades for the specific criteria
    const teacherGrades = await TeacherGrade.find(teacherGradeFilter)
      .populate({
        path: 'studentId',
        select: 'rollNumber userId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      });

    // Get regular grades (from exams) for the same criteria
    const regularGrades = await Grade.find(regularGradeFilter)
      .populate({
        path: 'studentId',
        select: 'rollNumber userId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      });

    // Create a map of student results
    const studentResultsMap = new Map();

    // Process teacher grades
    teacherGrades.forEach(grade => {
      const studentId = String(grade.studentId._id);
      if (!studentResultsMap.has(studentId)) {
        studentResultsMap.set(studentId, {
          studentId: grade.studentId._id,
          student: grade.studentId,
          teacherGrade: grade,
          regularGrade: null,
          hasResult: true
        });
      } else {
        studentResultsMap.get(studentId).teacherGrade = grade;
      }
    });

    // Process regular grades
    regularGrades.forEach(grade => {
      const studentId = String(grade.studentId._id);
      if (!studentResultsMap.has(studentId)) {
        studentResultsMap.set(studentId, {
          studentId: grade.studentId._id,
          student: grade.studentId,
          teacherGrade: null,
          regularGrade: grade,
          hasResult: true
        });
      } else {
        studentResultsMap.get(studentId).regularGrade = grade;
      }
    });

    // Add students without results
    students.forEach(student => {
      const studentId = String(student._id);
      if (!studentResultsMap.has(studentId)) {
        studentResultsMap.set(studentId, {
          studentId: student._id,
          student: student,
          teacherGrade: null,
          regularGrade: null,
          hasResult: false
        });
      }
    });

    // Convert map to array and apply pagination
    let results = Array.from(studentResultsMap.values());

    // Apply sorting
    if (sortObj.rollNumber) {
      results.sort((a, b) => {
        const aRoll = a.student.rollNumber || '';
        const bRoll = b.student.rollNumber || '';
        return sortObj.rollNumber === 1 ? aRoll.localeCompare(bRoll) : bRoll.localeCompare(aRoll);
      });
    }

    const total = results.length;
    const paginatedResults = results.slice(skip, skip + limit);

    // Calculate summary statistics
    const summary = {
      totalStudents: students.length,
      studentsWithResults: results.filter(r => r.hasResult).length,
      studentsWithoutResults: results.filter(r => !r.hasResult).length,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 }
    };

    // Calculate statistics from available results
    const scores = results
      .filter(r => r.hasResult)
      .map(r => {
        const grade = r.teacherGrade || r.regularGrade;
        return grade ? grade.percentage || grade.marks : null;
      })
      .filter(score => score !== null);

    if (scores.length > 0) {
      summary.averageScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
      summary.highestScore = Math.max(...scores);
      summary.lowestScore = Math.min(...scores);

      // Grade distribution
      results.filter(r => r.hasResult).forEach(r => {
        const grade = r.teacherGrade || r.regularGrade;
        if (grade && grade.grade) {
          summary.gradeDistribution[grade.grade] = (summary.gradeDistribution[grade.grade] || 0) + 1;
        }
      });
    }

    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };

    return res.status(200).json({
      success: true,
      data: {
        class: classInfo,
        subject: subjectInfo,
        term,
        academicYear,
        summary,
        pagination,
        results: paginatedResults
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /teacher-results/export - Export results as CSV
exports.exportTeacherResults = async (req, res) => {
  try {
    const { classId, subjectId, term, academicYear, examType, examTitle, format = 'csv' } = req.query;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can export results'
      });
    }

    // Validate required parameters
    if (!classId || !subjectId || !term || !academicYear) {
      return res.status(400).json({
        success: false,
        message: 'classId, subjectId, term, and academicYear are required'
      });
    }

    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Validate teacher access
    const hasAccess = await validateTeacherAccess(teacher._id, subjectId, classId);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to export results for this subject/class combination'
      });
    }

    // Get class and subject information
    const [classInfo, subjectInfo] = await Promise.all([
      Class.findById(classId).select('name description'),
      Subject.findById(subjectId).select('name code description')
    ]);

    // Get all students in the class
    const students = await Student.find({ classId })
      .populate('userId', 'name email')
      .select('rollNumber admissionNumber userId')
      .sort({ rollNumber: 1 });

    // Build grade filters
    const teacherGradeFilter = {
      teacherId: teacher._id,
      classId,
      subjectId,
      term,
      academicYear
    };
    
    const regularGradeFilter = {
      classId,
      subjectId,
      term
    };

    // For regular grades, filter by academic year using createdAt date
    if (academicYear) {
      const yearParts = academicYear.split('-');
      if (yearParts.length === 2) {
        const startYear = parseInt(yearParts[0]);
        const endYear = parseInt(yearParts[1]);
        
        // Academic year typically runs from September to August
        // e.g., 2023-2024 means Sept 2023 to Aug 2024
        const startDate = new Date(startYear, 8, 1); // September 1st
        const endDate = new Date(endYear, 7, 31, 23, 59, 59); // August 31st
        
        regularGradeFilter.createdAt = {
          $gte: startDate,
          $lte: endDate
        };
      }
    }

    // Add exam type filter if specified
    if (examType) {
      teacherGradeFilter.examType = examType;
      regularGradeFilter.examType = examType;
    }

    // Add exam title filter if specified
    if (examTitle) {
      teacherGradeFilter.examTitle = examTitle;
      regularGradeFilter.examTitle = examTitle;
    }

    // Get teacher grades
    const teacherGrades = await TeacherGrade.find(teacherGradeFilter)
      .populate({
        path: 'studentId',
        select: 'rollNumber userId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      });

    // Get regular grades
    const regularGrades = await Grade.find(regularGradeFilter)
      .populate({
        path: 'studentId',
        select: 'rollNumber userId',
        populate: {
          path: 'userId',
          select: 'name email'
        }
      });

    // Create results map
    const studentResultsMap = new Map();

    // Process teacher grades
    teacherGrades.forEach(grade => {
      const studentId = String(grade.studentId._id);
      studentResultsMap.set(studentId, {
        studentId: grade.studentId._id,
        student: grade.studentId,
        teacherGrade: grade,
        regularGrade: null
      });
    });

    // Process regular grades
    regularGrades.forEach(grade => {
      const studentId = String(grade.studentId._id);
      if (!studentResultsMap.has(studentId)) {
        studentResultsMap.set(studentId, {
          studentId: grade.studentId._id,
          student: grade.studentId,
          teacherGrade: null,
          regularGrade: grade
        });
      } else {
        studentResultsMap.get(studentId).regularGrade = grade;
      }
    });

    // Add students without results
    students.forEach(student => {
      const studentId = String(student._id);
      if (!studentResultsMap.has(studentId)) {
        studentResultsMap.set(studentId, {
          studentId: student._id,
          student: student,
          teacherGrade: null,
          regularGrade: null
        });
      }
    });

    const results = Array.from(studentResultsMap.values());

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Roll Number',
        'Student Name',
        'Email',
        'Admission Number',
        'Marks',
        'Max Marks',
        'Percentage',
        'Grade',
        'Remarks',
        'Exam Type',
        'Exam Title',
        'Exam Date',
        'Result Source'
      ];

      const csvRows = results.map(result => {
        const grade = result.teacherGrade || result.regularGrade;
        const source = result.teacherGrade ? 'Teacher Grade' : (result.regularGrade ? 'Exam Grade' : 'No Result');
        
        return [
          result.student.rollNumber || 'N/A',
          result.student.userId?.name || 'N/A',
          result.student.userId?.email || 'N/A',
          result.student.admissionNumber || 'N/A',
          grade?.marks || 'N/A',
          grade?.maxMarks || 'N/A',
          grade?.percentage || 'N/A',
          grade?.grade || 'N/A',
          grade?.remarks || 'N/A',
          grade?.examType || 'N/A',
          grade?.examTitle || 'N/A',
          grade?.examDate ? new Date(grade.examDate).toISOString().split('T')[0] : 'N/A',
          source
        ];
      });

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${classInfo.name}-${subjectInfo.name}-${term}-${academicYear}-results.csv`);
      return res.send(csvContent);
    } else {
      // Return JSON
      return res.status(200).json({
        success: true,
        data: {
          class: classInfo,
          subject: subjectInfo,
          term,
          academicYear,
          count: results.length,
          results
        }
      });
    }

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// GET /teacher-results/summary - Get summary statistics for teacher's results
exports.getTeacherResultsSummary = async (req, res) => {
  try {
    const { classId, subjectId, term, academicYear, examType, examTitle } = req.query;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can access results summary'
      });
    }

    const teacher = await Teacher.findOne({ userId: req.user.sub });
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher profile not found'
      });
    }

    // Build filter
    const filter = { teacherId: teacher._id };
    if (classId) filter.classId = classId;
    if (subjectId) filter.subjectId = subjectId;
    if (term) filter.term = term;
    if (academicYear) filter.academicYear = academicYear;
    if (examType) filter.examType = examType;
    if (examTitle) filter.examTitle = examTitle;

    // Get comprehensive summary
    const summary = await TeacherGrade.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalGrades: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' },
          highestPercentage: { $max: '$percentage' },
          lowestPercentage: { $min: '$percentage' },
          gradeDistribution: {
            $push: '$grade'
          },
          totalMarks: { $sum: '$marks' },
          totalMaxMarks: { $sum: '$maxMarks' }
        }
      }
    ]);

    // Get grade distribution
    const gradeDistribution = await TeacherGrade.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$grade',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get class-wise summary
    const classSummary = await TeacherGrade.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'class'
        }
      },
      {
        $unwind: '$class'
      },
      {
        $group: {
          _id: '$class.name',
          count: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' }
        }
      }
    ]);

    // Get subject-wise summary
    const subjectSummary = await TeacherGrade.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'subjects',
          localField: 'subjectId',
          foreignField: '_id',
          as: 'subject'
        }
      },
      {
        $unwind: '$subject'
      },
      {
        $group: {
          _id: '$subject.name',
          count: { $sum: 1 },
          averagePercentage: { $avg: '$percentage' }
        }
      }
    ]);

    const result = summary[0] || {
      totalGrades: 0,
      averagePercentage: 0,
      highestPercentage: 0,
      lowestPercentage: 0,
      totalMarks: 0,
      totalMaxMarks: 0
    };

    // Calculate grade distribution percentages
    const gradeDist = {};
    gradeDistribution.forEach(item => {
      gradeDist[item._id] = {
        count: item.count,
        percentage: result.totalGrades > 0 ? ((item.count / result.totalGrades) * 100).toFixed(2) : 0
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalGrades: result.totalGrades,
          averagePercentage: Math.round(result.averagePercentage * 100) / 100,
          highestPercentage: result.highestPercentage,
          lowestPercentage: result.lowestPercentage,
          totalMarks: result.totalMarks,
          totalMaxMarks: result.totalMaxMarks
        },
        gradeDistribution: gradeDist,
        classSummary,
        subjectSummary
      }
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
