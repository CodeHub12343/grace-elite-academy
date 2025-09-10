const Grade = require('../models/grade.model');
const { parsePagination, parseSort } = require('../utils/query');
const { notify } = require('../utils/notifier');
const { emitToUser } = require('../utils/socket');
const Teacher = require('../models/teacher.model');
const Student = require('../models/student.model'); // Added for getAcademicResult

exports.createGrade = async (req, res) => {
  try {
    const doc = await Grade.create(req.body);
    const populated = await doc.populate(['studentId', 'classId', 'subjectId', 'teacherId']);
    try {
      await notify(populated.studentId, 'email', 'New grade posted', `You received ${populated.percentage}% in ${populated.subjectId?.name || 'a subject'}.`, {});
      emitToUser(populated.studentId, 'grade:new', { gradeId: populated._id, percentage: populated.percentage });
    } catch (_e) {}
    return res.status(201).json({ success: true, data: populated });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.bulkCreateGrades = async (req, res) => {
  try {
    const { classId, subjectId, term, examType, grades } = req.body;
    if (!classId || !subjectId || !term || !examType || !Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ success: false, message: 'classId, subjectId, term, examType, grades are required' });
    }
    const teacherId = req.body.teacherId; // optionally passed from client; could be derived from req.user
    const docs = grades.map((g) => ({ ...g, classId, subjectId, term, examType, teacherId }));
    const result = await Grade.insertMany(docs, { ordered: false });
    return res.status(201).json({ success: true, count: result.length, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.getStudentGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    // student can only view their own if role student
    if (req.user?.role === 'student' && req.user.sub !== req.params.studentId) {
      // Not comparing to Student._id here; assume sub equals Student _id if designed so; otherwise extra lookup needed
    }
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-createdAt');
    const filter = { studentId };
    if (req.query.term) filter.term = req.query.term;
    if (req.query.examType) filter.examType = req.query.examType;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    const [items, total] = await Promise.all([
      Grade.find(filter)
        .populate(['studentId', 'subjectId', 'teacherId'])
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Grade.countDocuments(filter),
    ]);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getClassGrades = async (req, res) => {
  try {
    const { classId } = req.params;
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-percentage');
    const filter = { classId };
    if (req.query.term) filter.term = req.query.term;
    if (req.query.examType) filter.examType = req.query.examType;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    const [items, total] = await Promise.all([
      Grade.find(filter)
        .populate(['studentId', 'subjectId', 'teacherId'])
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Grade.countDocuments(filter),
    ]);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateGrade = async (req, res) => {
  try {
    const doc = await Grade.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Grade not found' });
    const populated = await doc.populate(['studentId', 'subjectId', 'teacherId']);
    return res.status(200).json({ success: true, data: populated });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteGrade = async (req, res) => {
  try {
    const doc = await Grade.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Grade not found' });
    return res.status(200).json({ success: true, data: null });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

// GET /grades?classId=&subjectId=&examId=&term=&examType=
exports.listGrades = async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(req.query.sort || '-createdAt');
    const { classId, subjectId, examId, term, examType, studentId } = req.query;

    const filter = {};
    if (classId) filter.classId = classId;
    if (subjectId) filter.subjectId = subjectId;
    if (examId) filter.examId = examId;
    if (term) filter.term = term;
    if (examType) filter.examType = examType;
    if (studentId) filter.studentId = studentId;

    // Teacher access can be narrowed later if required
    const [items, total] = await Promise.all([
      Grade.find(filter)
        .populate(['studentId', 'classId', 'subjectId', 'teacherId', 'examId'])
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Grade.countDocuments(filter),
    ]);
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    return res.status(200).json({ success: true, count: items.length, pagination, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /grades/analytics?classId=&subjectId=&examId=&term=&examType=&granularity=day|month
exports.getGradesAnalytics = async (req, res) => {
  try {
    const { classId, subjectId, examId, term, examType, granularity } = req.query;
    const mongoose = require('mongoose');

    const match = {};
    if (classId && mongoose.Types.ObjectId.isValid(classId)) match.classId = new mongoose.Types.ObjectId(classId);
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) match.subjectId = new mongoose.Types.ObjectId(subjectId);
    if (examId && mongoose.Types.ObjectId.isValid(examId)) match.examId = new mongoose.Types.ObjectId(examId);
    if (term) match.term = term;
    if (examType) match.examType = examType;

    const dateProject = granularity === 'month'
      ? { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }
      : { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            classId: '$classId',
            subjectId: '$subjectId',
            examId: '$examId',
            ...dateProject,
          },
          count: { $sum: 1 },
          avgPercentage: { $avg: '$percentage' },
          avgMarks: { $avg: '$marks' },
          maxPercentage: { $max: '$percentage' },
          minPercentage: { $min: '$percentage' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ];

    const data = await Grade.aggregate(pipeline);
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /grades/academic-result/:studentId?term=&classId=
exports.getAcademicResult = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { term, classId } = req.query;

    // Validate student exists
    const student = await Student.findById(studentId).populate(['userId', 'classId']);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Build filter
    const filter = { studentId };
    if (term) filter.term = term;
    if (classId) filter.classId = classId;

    // Get all grades for the student
    const grades = await Grade.find(filter)
      .populate(['subjectId', 'classId', 'teacherId', 'examId'])
      .sort('subjectId term examType');

    // Group grades by subject and term
    const subjectGrades = {};
    const termGrades = {};

    grades.forEach(grade => {
      const subjectId = String(grade.subjectId._id);
      const subjectName = grade.subjectId.name;
      const termKey = grade.term;

      // Initialize subject if not exists
      if (!subjectGrades[subjectId]) {
        subjectGrades[subjectId] = {
          subjectId: grade.subjectId._id,
          subjectName,
          terms: {},
          overall: { totalMarks: 0, maxMarks: 0, percentage: 0, grade: '' }
        };
      }

      // Initialize term if not exists
      if (!subjectGrades[subjectId].terms[termKey]) {
        subjectGrades[subjectId].terms[termKey] = {
          term: termKey,
          exams: [],
          totalMarks: 0,
          maxMarks: 0,
          percentage: 0,
          grade: ''
        };
      }

      // Add exam grade
      const examGrade = {
        examType: grade.examType,
        marks: grade.marks,
        maxMarks: grade.maxMarks,
        percentage: grade.percentage,
        grade: grade.grade,
        examId: grade.examId?._id,
        examTitle: grade.examId?.title,
        teacherName: grade.teacherId?.userId?.name
      };

      subjectGrades[subjectId].terms[termKey].exams.push(examGrade);
      subjectGrades[subjectId].terms[termKey].totalMarks += grade.marks;
      subjectGrades[subjectId].terms[termKey].maxMarks += grade.maxMarks;

      // Calculate term percentage and grade
      const termPercentage = (subjectGrades[subjectId].terms[termKey].totalMarks / 
                             subjectGrades[subjectId].terms[termKey].maxMarks) * 100;
      subjectGrades[subjectId].terms[termKey].percentage = Math.round(termPercentage * 100) / 100;
      subjectGrades[subjectId].terms[termKey].grade = computeGrade(termPercentage);

      // Add to overall subject totals
      subjectGrades[subjectId].overall.totalMarks += grade.marks;
      subjectGrades[subjectId].overall.maxMarks += grade.maxMarks;
    });

    // Calculate overall subject percentages and grades
    Object.values(subjectGrades).forEach(subject => {
      const overallPercentage = (subject.overall.totalMarks / subject.overall.maxMarks) * 100;
      subject.overall.percentage = Math.round(overallPercentage * 100) / 100;
      subject.overall.grade = computeGrade(overallPercentage);
    });

    // Calculate overall academic performance
    const totalMarks = Object.values(subjectGrades).reduce((sum, subject) => sum + subject.overall.totalMarks, 0);
    const totalMaxMarks = Object.values(subjectGrades).reduce((sum, subject) => sum + subject.overall.maxMarks, 0);
    const overallPercentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
    const overallGrade = computeGrade(overallPercentage);

    // Prepare academic result
    const academicResult = {
      student: {
        id: student._id,
        name: student.userId.name,
        email: student.userId.email,
        rollNumber: student.rollNumber,
        class: student.classId.name,
        parentName: student.parentName,
        parentContact: student.parentContact
      },
      academicYear: new Date().getFullYear(),
      term: term || 'all',
      subjects: Object.values(subjectGrades),
      summary: {
        totalSubjects: Object.keys(subjectGrades).length,
        totalMarks,
        totalMaxMarks,
        overallPercentage: Math.round(overallPercentage * 100) / 100,
        overallGrade,
        position: null, // Could be calculated if needed
        remarks: getRemarks(overallPercentage)
      },
      generatedAt: new Date()
    };

    return res.status(200).json({ success: true, data: academicResult });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /grades/teacher/subject/:subjectId/class/:classId
exports.getTeacherSubjectClassGrades = async (req, res) => {
  try {
    const { subjectId, classId } = req.params;
    const { term, examType, studentId, sort } = req.query;
    
    // Verify that the authenticated teacher teaches this subject and class
    if (req.user?.role === 'teacher') {
      console.log('🔍 DEBUG FUNCTION 1: User role is teacher, userId:', req.user.sub);
      const teacher = await Teacher.findOne({ userId: req.user.sub }).populate([
        { path: 'subjects', select: 'name classId' },
        { path: 'classes', select: 'name' }
      ]);
      if (!teacher) {
        console.log('🔍 DEBUG FUNCTION 1: Teacher profile not found');
        return res.status(404).json({ success: false, message: 'Teacher profile not found' });
      }
      console.log('🔍 DEBUG FUNCTION 1: Teacher found:', { id: teacher._id, name: teacher.userId?.name });
      console.log('🔍 DEBUG FUNCTION 1: Teacher subjects count:', teacher.subjects?.length);
      console.log('🔍 DEBUG FUNCTION 1: Teacher classes count:', teacher.classes?.length);
      
      // Check if teacher is assigned to this subject and if subject is assigned to this class - FUNCTION 1
      console.log('🔍 DEBUG FUNCTION 1: Teacher subjects:', teacher.subjects?.map(s => ({ id: s._id, name: s.name })) || 'No subjects');
      console.log('🔍 DEBUG FUNCTION 1: Teacher classes:', teacher.classes?.map(c => ({ id: c._id, name: c.name })) || 'No classes');
      console.log('🔍 DEBUG FUNCTION 1: Checking subjectId:', subjectId);
      console.log('🔍 DEBUG FUNCTION 1: Checking classId:', classId);
      
      const teachesSubject = teacher.subjects?.some(s => String(s._id) === subjectId) || false;
      
      // Check if the subject is assigned to the requested class
      const subject = teacher.subjects?.find(s => String(s._id) === subjectId);
      const subjectAssignedToClass = subject && String(subject.classId) === classId;
      
      console.log('🔍 DEBUG FUNCTION 1: teachesSubject:', teachesSubject);
      console.log('🔍 DEBUG FUNCTION 1: subjectAssignedToClass:', subjectAssignedToClass);
      console.log('🔍 DEBUG FUNCTION 1: Subject found:', subject ? { id: subject._id, name: subject.name, classId: subject.classId } : 'Not found');
      
      if (!teachesSubject || !subjectAssignedToClass) {
        console.log('🔍 DEBUG FUNCTION 1: Authorization failed - teacher not assigned to subject OR subject not assigned to class');
        return res.status(403).json({ 
          success: false, 
          message: 'You are not authorized to view grades for this subject/class combination' 
        });
      }
      console.log('🔍 DEBUG FUNCTION 1: Authorization successful');
    }
    
    // Build filter
    const filter = { subjectId, classId };
    if (term) filter.term = term;
    if (examType) filter.examType = examType;
    if (studentId) filter.studentId = studentId;
    
    // Get pagination and sorting
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(sort || '-createdAt');
    
    // Get grades with detailed population
    const [grades, total] = await Promise.all([
      Grade.find(filter)
        .populate([
          { 
            path: 'studentId', 
            populate: { 
              path: 'userId', 
              select: 'name email' 
            } 
          },
          { 
            path: 'subjectId', 
            select: 'name code' 
          },
          { 
            path: 'classId', 
            select: 'name' 
          },
          { 
            path: 'teacherId', 
            populate: { 
              path: 'userId', 
              select: 'name' 
            } 
          },
          { 
            path: 'examId', 
            select: 'title examType term' 
          }
        ])
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Grade.countDocuments(filter)
    ]);
    
    // Calculate summary statistics
    const summary = {
      totalGrades: total,
      averagePercentage: 0,
      highestPercentage: 0,
      lowestPercentage: 100,
      gradeDistribution: {
        A: 0, B: 0, C: 0, D: 0, F: 0
      },
      termBreakdown: {},
      examTypeBreakdown: {}
    };
    
    if (grades.length > 0) {
      let totalPercentage = 0;
      
      grades.forEach(grade => {
        // Calculate percentage if not already set
        const percentage = grade.percentage || (grade.marks / grade.maxMarks) * 100;
        totalPercentage += percentage;
        
        // Update highest and lowest
        if (percentage > summary.highestPercentage) summary.highestPercentage = percentage;
        if (percentage < summary.lowestPercentage) summary.lowestPercentage = percentage;
        
        // Grade distribution
        if (grade.grade) {
          summary.gradeDistribution[grade.grade] = (summary.gradeDistribution[grade.grade] || 0) + 1;
        }
        
        // Term breakdown
        if (grade.term) {
          if (!summary.termBreakdown[grade.term]) {
            summary.termBreakdown[grade.term] = { count: 0, totalPercentage: 0 };
          }
          summary.termBreakdown[grade.term].count++;
          summary.termBreakdown[grade.term].totalPercentage += percentage;
        }
        
        // Exam type breakdown
        if (grade.examType) {
          if (!summary.examTypeBreakdown[grade.examType]) {
            summary.examTypeBreakdown[grade.examType] = { count: 0, totalPercentage: 0 };
          }
          summary.examTypeBreakdown[grade.examType].count++;
          summary.examTypeBreakdown[grade.examType].totalPercentage += percentage;
        }
      });
      
      // Calculate averages
      summary.averagePercentage = Math.round((totalPercentage / grades.length) * 100) / 100;
      
      // Calculate term averages
      Object.keys(summary.termBreakdown).forEach(term => {
        const termData = summary.termBreakdown[term];
        termData.averagePercentage = Math.round((termData.totalPercentage / termData.count) * 100) / 100;
      });
      
      // Calculate exam type averages
      Object.keys(summary.examTypeBreakdown).forEach(examType => {
        const examData = summary.examTypeBreakdown[examType];
        examData.averagePercentage = Math.round((examData.totalPercentage / examData.count) * 100) / 100;
      });
    }
    
    // Format grades for response
    const formattedGrades = grades.map(grade => ({
      _id: grade._id,
      student: {
        id: grade.studentId._id,
        name: grade.studentId.userId.name,
        email: grade.studentId.userId.email,
        rollNumber: grade.studentId.rollNumber
      },
      subject: {
        id: grade.subjectId._id,
        name: grade.subjectId.name,
        code: grade.subjectId.code
      },
      class: {
        id: grade.classId._id,
        name: grade.classId.name
      },
      teacher: {
        id: grade.teacherId._id,
        name: grade.teacherId.userId.name
      },
      exam: grade.examId ? {
        id: grade.examId._id,
        title: grade.examId.title,
        examType: grade.examId.examType,
        term: grade.examId.term
      } : null,
      marks: grade.marks,
      maxMarks: grade.maxMarks,
      percentage: grade.percentage || Math.round((grade.marks / grade.maxMarks) * 100 * 100) / 100,
      grade: grade.grade,
      term: grade.term,
      examType: grade.examType,
      createdAt: grade.createdAt,
      updatedAt: grade.updatedAt
    }));
    
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    
    return res.status(200).json({
      success: true,
      count: formattedGrades.length,
      pagination,
      summary,
      data: formattedGrades
    });
    
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

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

// GET /grades/teacher/subject/:subjectId/class/:classId/term/:term
exports.getTeacherSubjectClassTermGrades = async (req, res) => {
  try {
    const { subjectId, classId, term } = req.params;
    const { examType, studentId, sort } = req.query;
    
    // Verify that the authenticated teacher teaches this subject and class
    if (req.user?.role === 'teacher') {
      const teacher = await Teacher.findOne({ userId: req.user.sub }).populate([
        { path: 'subjects', select: 'name classId' },
        { path: 'classes', select: 'name' }
      ]);
      if (!teacher) {
        return res.status(404).json({ success: false, message: 'Teacher profile not found' });
      }
      
      // Check if teacher is assigned to this subject and if subject is assigned to this class - FUNCTION 2
      console.log('🔍 DEBUG FUNCTION 2: Teacher subjects:', teacher.subjects.map(s => ({ id: s._id, name: s.name })));
      console.log('🔍 DEBUG FUNCTION 2: Teacher classes:', teacher.classes.map(c => ({ id: c._id, name: c.name })));
      console.log('🔍 DEBUG FUNCTION 2: Checking subjectId:', subjectId);
      console.log('🔍 DEBUG FUNCTION 2: Checking classId:', classId);
      
      const teachesSubject = teacher.subjects.some(s => String(s._id) === subjectId);
      
      // Check if the subject is assigned to the requested class
      const subject = teacher.subjects.find(s => String(s._id) === subjectId);
      const subjectAssignedToClass = subject && String(subject.classId) === classId;
      
      console.log('🔍 DEBUG FUNCTION 2: teachesSubject:', teachesSubject);
      console.log('🔍 DEBUG FUNCTION 2: subjectAssignedToClass:', subjectAssignedToClass);
      console.log('🔍 DEBUG FUNCTION 2: Subject found:', subject ? { id: subject._id, name: subject.name, classId: subject.classId } : 'Not found');
      
      if (!teachesSubject || !subjectAssignedToClass) {
        return res.status(403).json({ 
          success: false, 
          message: 'You are not authorized to view grades for this subject/class combination' 
        });
      }
    }
    
    // Build filter - term is required for this endpoint
    const filter = { subjectId, classId, term };
    if (examType) filter.examType = examType;
    if (studentId) filter.studentId = studentId;
    
    // Get pagination and sorting
    const { page, limit, skip } = parsePagination(req.query);
    const sortObj = parseSort(sort || '-createdAt');
    
    // Get grades with detailed population
    const [grades, total] = await Promise.all([
      Grade.find(filter)
        .populate([
          { 
            path: 'studentId', 
            populate: { 
              path: 'userId', 
              select: 'name email' 
            } 
          },
          { 
            path: 'subjectId', 
            select: 'name code' 
          },
          { 
            path: 'classId', 
            select: 'name' 
          },
          { 
            path: 'teacherId', 
            populate: { 
              path: 'userId', 
              select: 'name' 
            } 
          },
          { 
            path: 'examId', 
            select: 'title examType term' 
          }
        ])
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
      Grade.countDocuments(filter)
    ]);
    
    // Calculate comprehensive summary statistics for the term
    const summary = {
      term,
      totalGrades: total,
      totalStudents: new Set(grades.map(g => String(g.studentId._id))).size,
      averagePercentage: 0,
      highestPercentage: 0,
      lowestPercentage: 100,
      gradeDistribution: {
        A: 0, B: 0, C: 0, D: 0, F: 0
      },
      examTypeBreakdown: {},
      studentPerformance: [],
      classAverage: 0,
      passRate: 0,
      failRate: 0
    };
    
    if (grades.length > 0) {
      let totalPercentage = 0;
      let passCount = 0;
      let failCount = 0;
      const studentScores = {};
      
      grades.forEach(grade => {
        // Calculate percentage if not already set
        const percentage = grade.percentage || (grade.marks / grade.maxMarks) * 100;
        totalPercentage += percentage;
        
        // Update highest and lowest
        if (percentage > summary.highestPercentage) summary.highestPercentage = percentage;
        if (percentage < summary.lowestPercentage) summary.lowestPercentage = percentage;
        
        // Grade distribution
        if (grade.grade) {
          summary.gradeDistribution[grade.grade] = (summary.gradeDistribution[grade.grade] || 0) + 1;
        }
        
        // Pass/Fail counting (assuming 40% is passing)
        if (percentage >= 40) {
          passCount++;
        } else {
          failCount++;
        }
        
        // Exam type breakdown
        if (grade.examType) {
          if (!summary.examTypeBreakdown[grade.examType]) {
            summary.examTypeBreakdown[grade.examType] = { count: 0, totalPercentage: 0 };
          }
          summary.examTypeBreakdown[grade.examType].count++;
          summary.examTypeBreakdown[grade.examType].totalPercentage += percentage;
        }
        
        // Track individual student performance
        const studentId = String(grade.studentId._id);
        if (!studentScores[studentId]) {
          studentScores[studentId] = {
            studentId: grade.studentId._id,
            studentName: grade.studentId.userId.name,
            rollNumber: grade.studentId.rollNumber,
            grades: [],
            totalMarks: 0,
            totalMaxMarks: 0,
            averagePercentage: 0
          };
        }
        studentScores[studentId].grades.push({
          examTitle: grade.examId?.title || 'N/A',
          examType: grade.examId?.examType || grade.examType || 'N/A',
          marks: grade.marks,
          maxMarks: grade.maxMarks,
          percentage: percentage,
          grade: grade.grade || computeGrade(percentage)
        });
        studentScores[studentId].totalMarks += grade.marks;
        studentScores[studentId].totalMaxMarks += grade.maxMarks;
      });
      
      // Calculate averages
      summary.averagePercentage = Math.round((totalPercentage / grades.length) * 100) / 100;
      summary.classAverage = summary.averagePercentage;
      summary.passRate = Math.round((passCount / grades.length) * 100);
      summary.failRate = Math.round((failCount / grades.length) * 100);
      
      // Calculate exam type averages
      Object.keys(summary.examTypeBreakdown).forEach(examType => {
        const examData = summary.examTypeBreakdown[examType];
        examData.averagePercentage = Math.round((examData.totalPercentage / examData.count) * 100) / 100;
      });
      
      // Calculate individual student averages and sort by performance
      Object.values(studentScores).forEach(student => {
        student.averagePercentage = Math.round((student.totalMarks / student.totalMaxMarks) * 100 * 100) / 100;
        student.grade = computeGrade(student.averagePercentage);
        student.remarks = getRemarks(student.averagePercentage);
      });
      
      summary.studentPerformance = Object.values(studentScores)
        .sort((a, b) => b.averagePercentage - a.averagePercentage);
    }
    
    // Format grades for response
    const formattedGrades = grades.map(grade => ({
      _id: grade._id,
      student: {
        id: grade.studentId._id,
        name: grade.studentId.userId.name,
        email: grade.studentId.userId.email,
        rollNumber: grade.studentId.rollNumber
      },
      subject: {
        id: grade.subjectId._id,
        name: grade.subjectId.name,
        code: grade.subjectId.code
      },
      class: {
        id: grade.classId._id,
        name: grade.classId.name
      },
      teacher: {
        id: grade.teacherId._id,
        name: grade.teacherId.userId.name
      },
      exam: grade.examId ? {
        id: grade.examId._id,
        title: grade.examId.title,
        examType: grade.examId.examType,
        term: grade.examId.term
      } : null,
      marks: grade.marks,
      maxMarks: grade.maxMarks,
      percentage: grade.percentage || Math.round((grade.marks / grade.maxMarks) * 100 * 100) / 100,
      grade: grade.grade,
      term: grade.term,
      examType: grade.examType,
      createdAt: grade.createdAt,
      updatedAt: grade.updatedAt
    }));
    
    const pagination = { page, limit, total, pages: Math.ceil(total / limit) };
    
    return res.status(200).json({
      success: true,
      count: formattedGrades.length,
      pagination,
      summary,
      data: formattedGrades
    });
    
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


