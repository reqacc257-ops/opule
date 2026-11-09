import { createRuntime } from './runtime.js';

const { app, pool, origin, production } = await createRuntime();
const server = app.listen(Number(process.env.PORT || 3000), production ? '0.0.0.0' : '127.0.0.1', () => console.log(`Opule ready at ${origin}`));
async function close() { server.close(async () => { await pool.end(); process.exit(0); }); }
process.on('SIGINT', close);
process.on('SIGTERM', close);
