'use strict';

const archiver = require('archiver');
const { PassThrough } = require('node:stream');

const createZipBuilder = () => {
  const archive = archiver('zip', { zlib: { level: 9 } });
  const buffers = [];
  const passthrough = new PassThrough();
  passthrough.on('data', (chunk) => buffers.push(chunk));
  archive.pipe(passthrough);

  return {
    addBuffer: (name, buffer) => { archive.append(buffer, { name }); },
    addJson: (name, data) => { archive.append(JSON.stringify(data, null, 2), { name }); },
    finalize: async () => {
      await archive.finalize();
      // Wait for stream to finish
      await new Promise((resolve, reject) => {
        passthrough.on('end', resolve);
        passthrough.on('error', reject);
      });
      return Buffer.concat(buffers);
    },
  };
};

module.exports = createZipBuilder;
