import { describe, it, expect } from "vitest";
import { parsePagination, buildPaginationMeta } from "../pagination";

describe("parsePagination", () => {
  it("defaults to page 1, limit 20 when nothing is provided", () => {
    const result = parsePagination({});
    expect(result).toEqual({ page: 1, limit: 20, skip: 0, take: 20 });
  });

  it("parses valid page and limit values", () => {
    const result = parsePagination({ page: "3", limit: "10" });
    expect(result).toEqual({ page: 3, limit: 10, skip: 20, take: 10 });
  });

  it("falls back to defaults for invalid/non-numeric input", () => {
    const result = parsePagination({ page: "abc", limit: "-5" });
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("never returns a limit above the hard cap, even if requested", () => {
    const result = parsePagination({ limit: "500" });
    expect(result.limit).toBe(50);
  });

  it("never returns a page below 1", () => {
    const result = parsePagination({ page: "0" });
    expect(result.page).toBe(1);
  });
});

describe("buildPaginationMeta", () => {
  it("computes total pages and next/prev flags correctly", () => {
    const meta = buildPaginationMeta(1, 20, 45);
    expect(meta).toEqual({
      page: 1,
      limit: 20,
      total: 45,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: false,
    });
  });

  it("reports no next page on the last page", () => {
    const meta = buildPaginationMeta(3, 20, 45);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPrevPage).toBe(true);
  });

  it("treats zero results as a single (empty) page", () => {
    const meta = buildPaginationMeta(1, 20, 0);
    expect(meta.totalPages).toBe(1);
  });
});
