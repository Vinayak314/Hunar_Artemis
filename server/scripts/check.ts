/**
 * Connectivity check: `npm run check`.
 * Verifies MongoDB Atlas is reachable and the Gemini key can generate content.
 * Prints names and statuses only, never secret values.
 */
import { MongoClient } from 'mongodb';
import { GoogleGenAI } from '@google/genai';
import { env } from '../src/env.js';

async function checkMongo(): Promise<boolean> {
  const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    const db = env.MONGODB_DB ? client.db(env.MONGODB_DB) : client.db();
    await db.command({ ping: 1 });
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const names = collections.map((c) => c.name).join(', ') || '(none yet)';
    console.log(`[ok]   MongoDB reachable, database "${db.databaseName}", collections: ${names}`);
    return true;
  } catch (err) {
    console.error(`[fail] MongoDB: ${(err as Error).message}`);
    return false;
  } finally {
    await client.close();
  }
}

async function checkGemini(): Promise<boolean> {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  try {
    const pager = await ai.models.list();
    const usable: string[] = [];
    for await (const m of pager) {
      if (m.supportedActions?.includes('generateContent') && m.name) {
        usable.push(m.name.replace(/^models\//, ''));
      }
    }
    const flash = usable.filter((n) => n.includes('flash')).slice(0, 15);
    console.log(`       Gemini flash models available: ${flash.join(', ') || '(none)'}`);

    const res = await ai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: 'Reply with the single word: ok',
    });
    console.log(`[ok]   Gemini "${env.GEMINI_MODEL}" responded: ${JSON.stringify(res.text?.trim())}`);
    return true;
  } catch (err) {
    console.error(`[fail] Gemini (${env.GEMINI_MODEL}): ${(err as Error).message}`);
    return false;
  }
}

const results = await Promise.all([checkMongo(), checkGemini()]);
process.exit(results.every(Boolean) ? 0 : 1);
