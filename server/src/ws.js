'use strict';

const websocket = require('@fastify/websocket');

const init = (server) => {
  server.register(websocket);
  server.register(async (instance) => {
    instance.get(
      '/ws',
      { websocket: true },
      (socket) => {
        socket.on('message', async (message) => {
          try {
            JSON.parse(message);
            // Route lookup will be added in Sprint 4
            socket.send(
              JSON.stringify({ error: 'Not implemented' }),
            );
          } catch (err) {
            server.log.error(err, 'WebSocket error');
            socket.send(
              JSON.stringify({ error: 'Server error' }),
            );
          }
        });
      },
    );
  });
};

module.exports = { init };
