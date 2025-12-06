import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query to get all saved elements, ordered by creation date (newest first)
export const getAllSavedElements = query({
  args: {},
  handler: async (ctx) => {
    const elements = await ctx.db
      .query("savedElements")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
    
    return elements;
  },
});

// Query to get a specific element by symbol
export const getElementBySymbol = query({
  args: { symbol: v.string() },
  handler: async (ctx, args) => {
    const element = await ctx.db
      .query("savedElements")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();
    
    return element;
  },
});

// Mutation to save a new element (prevents duplicates)
export const saveElement = mutation({
  args: {
    symbol: v.string(),
    name: v.string(),
    color: v.string(),
    atomicNumber: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if element already exists
    const existing = await ctx.db
      .query("savedElements")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol))
      .first();
    
    if (existing) {
      // Update existing element's timestamp
      await ctx.db.patch(existing._id, {
        createdAt: Date.now(),
      });
      return existing._id;
    }
    
    // Insert new element
    const id = await ctx.db.insert("savedElements", {
      symbol: args.symbol,
      name: args.name,
      color: args.color,
      atomicNumber: args.atomicNumber,
      description: args.description,
      createdAt: Date.now(),
    });
    
    return id;
  },
});

// Mutation to delete a saved element
export const deleteElement = mutation({
  args: { id: v.id("savedElements") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Mutation to clear all saved elements
export const clearAllElements = mutation({
  args: {},
  handler: async (ctx) => {
    const allElements = await ctx.db.query("savedElements").collect();
    await Promise.all(allElements.map((element) => ctx.db.delete(element._id)));
  },
});

