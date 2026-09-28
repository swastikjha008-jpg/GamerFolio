/**
 * A known, expected application error carrying an HTTP status code.
 * Thrown from services/controllers and caught by the centralized error
 * middleware, which knows to trust its `message` and `status` as safe
 * to return to the client (unlike unexpected/unknown errors).
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly errors?: Record<string, string[]>;

  constructor(message: string, status = 400, errors?: Record<string, string[]>) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.errors = errors;
    Error.captureStackTrace?.(this, AppError);
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(message, 404);
  }

  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError(message, 401);
  }

  static forbidden(message = "Forbidden"): AppError {
    return new AppError(message, 403);
  }

  static conflict(message = "Conflict"): AppError {
    return new AppError(message, 409);
  }

  static badRequest(message = "Bad request", errors?: Record<string, string[]>): AppError {
    return new AppError(message, 400, errors);
  }
}
