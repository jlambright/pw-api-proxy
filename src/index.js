/* eslint-disable no-console */
const logger = require('./logger');
// Imports the Google Cloud client library for Winston
const {LoggingWinston} = require('@google-cloud/logging-winston');
const loggingWinston = new LoggingWinston()

const app = require('./app');
// Listen to the App Engine-specified port, or 8080 otherwise
const host = app.get('host')
const port = app.get('port') || 8080;

if (process.env.GAE_APPLICATION) {
  // Add Stackdriver Logging
  logger.add(loggingWinston);
}

logger.info(`WF_SITE_ID Value: ${process.env.WF_SITE_ID}`)

const server = app.listen(port);

process.on('unhandledRejection', (reason, p) =>
  logger.error('Unhandled Rejection at: Promise ', p, reason)
);

server.on('listening', () =>
  logger.info(`Feathers application started on http://${host}:${port}`)
);
