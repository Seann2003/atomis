# Convex Setup Guide

This project uses [Convex](https://convex.dev) for backend database functionality to store saved elements.

## Initial Setup

1. **Install Convex CLI** (if not already installed):
   ```bash
   npm install -g convex
   ```

2. **Login to Convex**:
   ```bash
   npx convex login
   ```

3. **Initialize Convex in your project**:
   ```bash
   npx convex dev
   ```
   
   This will:
   - Create a new Convex project (or connect to an existing one)
   - Generate a `.env.local` file with your `VITE_CONVEX_URL`
   - Start the Convex development server
   - Watch for changes in the `convex/` directory

4. **The `.env.local` file** will be automatically created with your Convex URL. Make sure it's in your `.gitignore` (it already is).

## Project Structure

- `convex/schema.ts` - Defines the database schema
- `convex/elements.ts` - Contains queries and mutations for saved elements
- `convex/_generated/` - Auto-generated files (don't edit manually)

## Available Functions

### Queries (Read Data)
- `getAllSavedElements` - Get all saved elements, ordered by creation date
- `getElementBySymbol` - Get a specific element by its symbol

### Mutations (Write Data)
- `saveElement` - Save a new element (prevents duplicates)
- `deleteElement` - Delete a saved element by ID
- `clearAllElements` - Clear all saved elements

## Usage in React Components

The app automatically uses Convex hooks in `App.tsx`:
- `useQuery(api.elements.getAllSavedElements)` - Fetches saved elements
- `useMutation(api.elements.saveElement)` - Saves new elements

## Development

Run both the Vite dev server and Convex dev server:

```bash
# Terminal 1: Vite dev server
npm run dev

# Terminal 2: Convex dev server (watches for changes)
npx convex dev
```

## Production Deployment

1. Deploy your Convex backend:
   ```bash
   npx convex deploy
   ```

2. Update your production environment variables with the Convex URL from your dashboard.

## Dashboard

View your data and manage your Convex project at:
https://dashboard.convex.dev

