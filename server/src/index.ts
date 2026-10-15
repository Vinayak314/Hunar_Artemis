import { createApp } from './app.js';
import { connectDatabase } from './db.js';
import { env } from './env.js';

const db = await connectDatabase();
const app = createApp(db);

const server = app.listen(env.PORT, () => {
  console.log(`Hunar API listening on http://localhost:${env.PORT} (database "${db.db.databaseName}")`);
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, closing connections`);
  server.close();
  await db.client.close();
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
