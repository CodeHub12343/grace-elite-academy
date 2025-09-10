const Joi = require('joi');

function validate(schema) {
  return (req, res, next) => {
    const toValidate = {
      body: req.body,
      params: req.params,
      query: req.query,
    };
    const { error, value } = schema.validate(toValidate, { abortEarly: false, allowUnknown: true });
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        details: error.details.map((d) => d.message),
      });
    }
    req.body = value.body || req.body;
    req.params = value.params || req.params;
    req.query = value.query || req.query;
    return next();
  };
}

const schemas = {
  register: Joi.object({
    body: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).max(128).required(),
      role: Joi.string().valid('admin', 'teacher', 'student', 'parent').optional(),
    }).required(),
  }),
  login: Joi.object({
    body: Joi.object({
      email: Joi.string().required(),
      password: Joi.string().min(6).max(128).required(),
    }).required(),
  }),
  refresh: Joi.object({
    body: Joi.object({}).optional(),
  }),
  forgotPassword: Joi.object({
    body: Joi.object({ email: Joi.string().email().required() }).required(),
  }),
  resetPassword: Joi.object({
    params: Joi.object({ token: Joi.string().required() }).required(),
    body: Joi.object({ password: Joi.string().min(6).max(128).required() }).required(),
  }),
  // Generic entity schemas
  teacherCreate: Joi.object({
    body: Joi.object({
      userId: Joi.string().required(),
      subjects: Joi.array().items(Joi.string()).optional(),
      classes: Joi.array().items(Joi.string()).optional(),
      phone: Joi.string().optional(),
      qualification: Joi.string().optional(),
      experience: Joi.number().min(0).optional(),
    }).required(),
  }),
  studentCreate: Joi.object({
    body: Joi.object({
      userId: Joi.string().required(),
      classId: Joi.string().required(),
      rollNumber: Joi.string().optional(),
      parentName: Joi.string().optional(),
      parentContact: Joi.string().optional(),
    }).required(),
  }),
  classCreate: Joi.object({
    body: Joi.object({
      name: Joi.string().required(),
      section: Joi.string().optional(),
      teacherIds: Joi.array().items(Joi.string()).optional(),
      subjectIds: Joi.array().items(Joi.string()).optional(),
      studentIds: Joi.array().items(Joi.string()).optional(),
    }).required(),
  }),
  subjectCreate: Joi.object({
    body: Joi.object({
      name: Joi.string().required(),
      code: Joi.string().required(),
      classId: Joi.string().required(),
      teacherIds: Joi.array().items(Joi.string()).optional(),
    }).required(),
  }),
  attendanceMark: Joi.object({
    body: Joi.object({
      classId: Joi.string().required(),
      subjectId: Joi.string().optional(),
      date: Joi.date().optional(),
      records: Joi.array().items(Joi.object({ studentId: Joi.string().required(), status: Joi.string().valid('present','absent','late','excused').required(), remarks: Joi.string().allow('').optional() })).min(1).required(),
    }).required(),
  }),
  assignmentCreate: Joi.object({
    body: Joi.object({
      title: Joi.string().required(),
      description: Joi.string().optional(),
      classId: Joi.string().required(),
      subjectId: Joi.string().required(),
      teacherId: Joi.string().required(),
      dueDate: Joi.date().required(),
      maxMarks: Joi.number().min(0).optional(),
    }).required(),
  }),
  filesUploadUrl: Joi.object({
    body: Joi.object({
      fileName: Joi.string().required(),
      mimeType: Joi.string().required(),
      category: Joi.string().valid('profile','assignment','resource','other').optional(),
      relatedId: Joi.string().optional(),
      isPublic: Joi.boolean().optional(),
    }).required(),
  }),
};

module.exports = { validate, schemas };


