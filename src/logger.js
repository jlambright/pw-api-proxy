const {createLogger, format, transports} = require('winston');
// Imports the Google Cloud client library for Winston
const {LoggingWinston} = require('@google-cloud/logging-winston');
const loggingWinston = new LoggingWinston()

// Configure the Winston logger. For the complete documentation see https://github.com/winstonjs/winston
const logger = createLogger({
  // To see more detailed errors, change this to 'debug'
  level: 'info',
  format: format.json(),
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
    // Add Stackdriver Logging
    loggingWinston
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: format.simple(),
  }));
}

logger.info(`WF_SITE_ID Value: ${process.env.WF_SITE_ID}`)

module.exports = logger;
