/**
 * Vercel serverless entry point.
 *
 * @vercel/node uses esbuild to bundle this file and all of its transitive
 * imports (including pnpm workspace packages) into a single serverless
 * function.  No separate build step is needed for the API.
 *
 * Required environment variables (set in Vercel project settings):
 *   DATABASE_URL  – PostgreSQL connection string
 *   SESSION_SECRET – session signing secret
 *
 * Optional:
 *   BOT_FILES_DIR – where uploaded bot files are stored
 *                   (defaults to /tmp/bot-files on Vercel)
 */
import app from '../artifacts/api-server/src/app';

export default app;
