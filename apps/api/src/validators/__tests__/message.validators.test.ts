import { describe, it, expect } from "vitest";
import { sendMessageSchema, createConversationSchema } from "../message.validators";

describe("sendMessageSchema", () => {
  it("accepts a normal message", () => {
    const result = sendMessageSchema.parse({ content: "gg, well played!" });
    expect(result.content).toBe("gg, well played!");
  });

  it("rejects an empty message", () => {
    expect(() => sendMessageSchema.parse({ content: "" })).toThrow(/cannot be empty/i);
  });

  it("rejects a message that is only whitespace", () => {
    expect(() => sendMessageSchema.parse({ content: "   " })).toThrow();
  });

  it("rejects a message over 2000 characters", () => {
    expect(() => sendMessageSchema.parse({ content: "a".repeat(2001) })).toThrow();
  });
});

describe("createConversationSchema", () => {
  it("requires a userId", () => {
    expect(() => createConversationSchema.parse({})).toThrow();
  });

  it("accepts a valid userId", () => {
    expect(createConversationSchema.parse({ userId: "user_123" }).userId).toBe("user_123");
  });
});
