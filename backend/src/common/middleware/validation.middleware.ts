import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Validation middleware using Zod schemas
 * @param schema - Zod schema to validate against
 * @param source - Where to get data from (body, query, params)
 */
export const validateRequest = (
  schema: AnyZodObject,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = source === 'body' 
        ? req.body 
        : source === 'query'
        ? parseQueryParams(req.query)
        : req.params;

      const validated = await schema.parseAsync(data);
      
      if (source === 'body') {
        req.body = validated;
      } else if (source === 'query') {
        req.query = validated as any;
      } else {
        req.params = validated as any;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            details: errors,
            timestamp: new Date().toISOString()
          }
        });
        return;
      }
      next(error);
    }
  };
};

/**
 * Parse query parameters to proper types
 */
function parseQueryParams(query: any): any {
  const parsed: any = {};
  
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }
    
    const strValue = String(value);
    
    // Try to parse as number
    if (!isNaN(Number(strValue)) && strValue.trim() !== '') {
      parsed[key] = Number(strValue);
    }
    // Try to parse as boolean
    else if (strValue === 'true' || strValue === 'false') {
      parsed[key] = strValue === 'true';
    }
    // Keep as string
    else {
      parsed[key] = strValue;
    }
  }
  
  return parsed;
}

/**
 * Validate UUID parameter
 */
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(value)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_UUID',
          message: `Invalid ${paramName} format`,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }
    
    next();
  };
};
