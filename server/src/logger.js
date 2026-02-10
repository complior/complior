'use strict';

const { format } = require('node:util');

class Logger {
  constructor(logger) {
    this.logger = logger;
  }

  log(...args) {
    const msg = format(...args);
    this.logger.info(msg);
  }

  debug(...args) {
    const msg = format(...args);
    this.logger.debug(msg);
  }

  error(...args) {
    const msg = format(...args);
    this.logger.error(msg);
  }

  system(...args) {
    const msg = format(...args);
    this.logger.info(msg);
  }
}

module.exports = { Logger };
