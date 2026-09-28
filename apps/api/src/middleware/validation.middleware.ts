import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";
import { asyncHandler } from "../utils/asyncHandler";

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Validates `req.body` / `req.query` / `req.params` against the given Zod
 * schemas, replacing each with its parsed (and therefore type-coerced,
 * trimmed, defaulted) value. Throws a ZodError on failure, which the
 * centralized error middleware turns into a 422 with field-level detail.
 */
export function validate(schemas: ValidationSchemas) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.body) {
      req.body = await schemas.body.parseAsync(req.body);
    }
    if (schemas.query) {
      const parsedQuery = await schemas.query.parseAsync(req.query);
      Object.assign(req.query, parsedQuery);
    }
    if (schemas.params) {
      const parsedParams = await schemas.params.parseAsync(req.params);
      Object.assign(req.params, parsedParams);
    }
    next();
  });
}
