import app, { ensureReady } from '../server/src/index';

export default async function handler(req: any, res: any) {
  await ensureReady();
  return app(req, res);
}

