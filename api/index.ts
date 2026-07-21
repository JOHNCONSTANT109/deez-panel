/**
 * Vercel serverless entry point.
 *
 * @vercel/node bundles this file (+ all workspace imports) into a single
 * Lambda. The built frontend (artifacts/bot-panel/dist) is included via
 * vercel.json `includeFiles` and served as static files for non-API routes.
 *
 * Required env vars (set in Vercel project settings):
 *   MONGODB_URI     – MongoDB connection string
 *   SESSION_SECRET  – session signing secret
 */
import path from 'path';
import express from 'express';
import app from '../artifacts/api-server/src/app';

// In the Vercel Lambda the working directory is /var/task.
// includeFiles places files at their original repo-relative paths there.
const distDir = path.join(process.cwd(), 'artifacts', 'bot-panel', 'dist');

// Serve compiled frontend assets (JS, CSS, images, etc.)
app.use(express.static(distDir));

// SPA fallback — serve index.html for any unmatched route so client-side
// routing (wouter) works on direct navigation and refresh.
app.use((_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

export default app;
