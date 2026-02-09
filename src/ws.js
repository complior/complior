'use strict';

const websocket = require('@fastify/websocket');

const init = (server) => {
  server.register(websocket);
  server.register(async (instance) => {
    instance.get(
      '/ws',
      { websocket: true },
      (connection) => {
        connection.socket.on('message', async (message) => {
          try {
            const { name, method, args = [] } =
              JSON.parse(message);
            // Route lookup will be added in Sprint 4 (Eva)
            connection.socket.send(
              JSON.stringify({ error: 'Not implemented' }),
            );
          } catch (err) {
            server.log.error(err, 'WebSocket error');
            connection.socket.send(
              JSON.stringify({ error: 'Server error' }),
            );
          }
        });
      },
    );
  });
};

module.exports = { init };
