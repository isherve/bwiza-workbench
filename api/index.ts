import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Express } from "express";

let appPromise: Promise<Express> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = Promise.all([
      import("../server/src/app.js"),
      import("../server/src/store-memory.js"),
    ]).then(([{ createApp }, { memoryStore }]) => createApp(memoryStore));
  }
  return appPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp();
  return app(req, res);
}
