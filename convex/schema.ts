import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  savedElements: defineTable({
    symbol: v.string(),
    name: v.string(),
    color: v.string(),
    atomicNumber: v.number(),
    description: v.string(),
    createdAt: v.number(), // timestamp
  })
    .index("by_symbol", ["symbol"])
    .index("by_created_at", ["createdAt"]),
});

