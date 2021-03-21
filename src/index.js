/* eslint-disable no-console */
const logger = require('./logger');
const app = require('./app');
// Listen to the App Engine-specified port, or 8080 otherwise
const port = process.env.PORT ? process.env.PORT : app.get('port') || 8080;
const server = app.listen(port);

process.on('unhandledRejection', (reason, p) =>
  logger.error('Unhandled Rejection at: Promise ', p, reason)
);

server.on('listening', () =>
  logger.info(`Feathers application started on http://${app.get('host')}:${port}`)
);
