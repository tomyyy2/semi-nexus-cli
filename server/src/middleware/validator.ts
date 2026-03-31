import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { body, param, query } from 'express-validator';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) break;
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({
        field: (e as { path?: string; param?: string }).path || (e as { param?: string }).param || 'unknown',
        message: e.msg
      }))
    });
  };
};

export const loginValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 2, max: 50 }).withMessage('Username must be 2-50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscore and hyphen'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 1, max: 128 }).withMessage('Password must be 1-128 characters'),
  
  body('authType')
    .optional()
    .isIn(['local', 'ldap', 'ad']).withMessage('Auth type must be local, ldap, or ad'),
  
  validate
];

export const createUserValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 2, max: 50 }).withMessage('Username must be 2-50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscore and hyphen'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/).withMessage('Password must contain at least one special character'),
  
  body('role')
    .optional()
    .isIn(['admin', 'user']).withMessage('Role must be admin or user'),
  
  body('authType')
    .optional()
    .isIn(['local', 'ldap', 'ad']).withMessage('Auth type must be local, ldap, or ad'),
  
  validate
];

export const createCapabilityValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters')
    .matches(/^[a-z0-9-]+$/).withMessage('Name can only contain lowercase letters, numbers and hyphens'),
  
  body('displayName')
    .trim()
    .notEmpty().withMessage('Display name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Display name must be 2-100 characters'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 20, max: 1000 }).withMessage('Description must be 20-1000 characters'),
  
  body('type')
    .notEmpty().withMessage('Type is required')
    .isIn(['skill', 'mcp', 'agent']).withMessage('Type must be skill, mcp, or agent'),
  
  body('version')
    .trim()
    .notEmpty().withMessage('Version is required')
    .matches(/^v?\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/).withMessage('Version must be semver format (e.g., v1.0.0 or 1.0.0)'),
  
  body('tags')
    .isArray({ min: 1, max: 10 }).withMessage('Tags must be an array of 1-10 items'),
  
  body('category.primary')
    .trim()
    .notEmpty().withMessage('Primary category is required'),
  
  body('category.secondary')
    .trim()
    .notEmpty().withMessage('Secondary category is required'),
  
  body('author.name')
    .trim()
    .notEmpty().withMessage('Author name is required'),
  
  body('repository')
    .optional()
    .trim()
    .isURL().withMessage('Repository must be a valid URL'),
  
  validate
];

export const subscribeValidation = [
  param('id')
    .trim()
    .notEmpty().withMessage('Capability ID is required')
    .matches(/^cap_[a-f0-9]{12}$/).withMessage('Invalid capability ID format'),
  
  body('version')
    .optional()
    .trim()
    .matches(/^v?\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/).withMessage('Version must be semver format'),
  
  validate
];

export const rateCapabilityValidation = [
  param('id')
    .trim()
    .notEmpty().withMessage('Capability ID is required'),
  
  body('rating')
    .notEmpty().withMessage('Rating is required')
    .isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  
  validate
];

export const createApiKeyValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  
  body('expiresIn')
    .optional()
    .isInt({ min: 3600, max: 31536000 }).withMessage('Expires in must be between 1 hour and 1 year (seconds)'),
  
  validate
];

export const auditQueryValidation = [
  query('userId')
    .optional()
    .trim()
    .matches(/^user_[a-f0-9]{12}$/).withMessage('Invalid user ID format'),
  
  query('action')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Action must be max 50 characters'),
  
  query('resource')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Resource must be max 50 characters'),
  
  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be ISO 8601 format'),
  
  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be ISO 8601 format'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 }).withMessage('Limit must be 1-1000'),
  
  query('offset')
    .optional()
    .isInt({ min: 0 }).withMessage('Offset must be >= 0'),
  
  validate
];

export const searchQueryValidation = [
  query('query')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Query must be max 100 characters'),
  
  query('type')
    .optional()
    .isIn(['skill', 'mcp', 'agent']).withMessage('Type must be skill, mcp, or agent'),
  
  query('tag')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Tag must be max 50 characters'),
  
  query('status')
    .optional()
    .isIn(['draft', 'scanning', 'pending', 'approved', 'rejected']).withMessage('Invalid status'),
  
  validate
];

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/<[^>]*>/g, '').trim();
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const key of Object.keys(obj)) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

export const sqlInjectionCheck = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b)/gi,
    /(--|\#|\/\*|\*\/)/g,
    /(\bOR\b|\bAND\b)\s*['"]?\d+['"]?\s*=\s*['"]?\d+/gi,
    /(\bUNION\b.*\bSELECT\b)/gi,
    /(\bEXEC\b|\bEXECUTE\b)/gi
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          return true;
        }
      }
    }
    if (Array.isArray(value)) {
      return value.some(checkValue);
    }
    if (value && typeof value === 'object') {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  if (checkValue(req.body) || checkValue(req.query) || checkValue(req.params)) {
    res.status(400).json({ error: 'Invalid input detected' });
    return;
  }

  next();
};
