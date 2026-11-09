import { createRuntime } from '../server/runtime.js';

let runtime;

export default async function handler(req, res) {
  let app;
  try {
    runtime ||= createRuntime().catch(error => {
      runtime = undefined;
      throw error;
    });
    ({ app } = await runtime);
  } catch (error) {
    console.error('Opule API initialization failed:', error.code || error.message);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 503;
    res.end(JSON.stringify({ error: 'The API could not start. Check the server database and environment configuration.' }));
    return;
  }
  return app(req, res);
}
