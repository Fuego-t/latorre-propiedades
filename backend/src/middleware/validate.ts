import { NextFunction, Request, Response } from 'express';
import { AnyZodObject, ZodEffects } from 'zod';

type Schema = AnyZodObject | ZodEffects<AnyZodObject>;

/** Valida y sanitiza req.body contra un schema de Zod, reemplazando el body por la versión parseada. */
export function validateBody(schema: Schema) {
  return (req: Request, res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}
