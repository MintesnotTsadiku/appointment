// Credentials arrive only on stdin and are never included in the result.
import { readFileSync } from 'node:fs';
import { io } from '../frontend/node_modules/socket.io-client/build/esm/index.js';
const { base, site, cookie } = JSON.parse(readFileSync(0, 'utf8'));
const socket = io(`${base}/${site}`, {
  transports: ['websocket'],
  reconnection: false,
  timeout: 8000,
  extraHeaders: { Cookie: cookie, Origin: base },
});
const timeout = setTimeout(() => { socket.close(); process.exit(1); }, 10000);
socket.on('connect', () => {
  console.log(JSON.stringify({ connected: true, transport: socket.io.engine.transport.name, namespace: socket.nsp }));
  clearTimeout(timeout);
  socket.close();
});
socket.on('connect_error', (error) => { console.error(error.message); clearTimeout(timeout); socket.close(); process.exit(1); });
