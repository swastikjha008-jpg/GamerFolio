import { describe, it, expect } from "vitest";
import { AppError } from "../AppError";

describe("AppError", () => {
  it("defaults to a 400 status", () => {
    const err = new AppError("Something went wrong");
    expect(err.status).toBe(400);
    expect(err.message).toBe("Something went wrong");
  });

  it("carries field-level errors when provided", () => {
    const err = AppError.badRequest("Invalid input", { rating: ["must be between 1 and 5"] });
    expect(err.status).toBe(400);
    expect(err.errors).toEqual({ rating: ["must be between 1 and 5"] });
  });

  it("exposes named factories with the correct status codes", () => {
    expect(AppError.notFound().status).toBe(404);
    expect(AppError.unauthorized().status).toBe(401);
    expect(AppError.forbidden().status).toBe(403);
    expect(AppError.conflict().status).toBe(409);
  });

  it("is a real Error instance (works with instanceof and try/catch)", () => {
    expect(() => {
      throw AppError.notFound("Game not found");
    }).toThrow("Game not found");
  });
});
