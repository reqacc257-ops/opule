import { createRuntime } from './runtime.js';

const { app, pool, origin, production } = await createRuntime();
const host = production ? '0.0.0.0' : '127.0.0.1';
const port = Number(process.env.PORT || 3000);
const server = app.listen(port, host, () => console.log(`Opule ready at ${origin} (listening on ${host}:${port})`));
async function close() { server.close(async () => { await pool.end(); process.exit(0); }); }
process.on('SIGINT', close);
process.on('SIGTERM', close);
