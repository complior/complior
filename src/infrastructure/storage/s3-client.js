'use strict';

const {
  S3Client, PutObjectCommand,
  GetObjectCommand, DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('../../config/s3.js');

const createS3Storage = (options = config) => {
  const { endpoint, bucket, accessKey, secretKey, region } = options;

  const client = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true,
  });

  return {
    async upload(key, body, contentType = 'application/pdf') {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      });
      return client.send(command);
    },

    async download(key) {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      const response = await client.send(command);
      return response.Body;
    },

    async getSignedUrl(key, expiresIn = 3600) {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      return getSignedUrl(client, command, { expiresIn });
    },

    async remove(key) {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      return client.send(command);
    },

    generateKey(organizationId, type, filename) {
      const date = new Date().toISOString().slice(0, 10);
      return `${organizationId}/${type}/${date}/${filename}`;
    },
  };
};

module.exports = createS3Storage;
