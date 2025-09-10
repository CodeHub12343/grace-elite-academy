const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

const s3 = new S3Client({ region });

async function getPresignedPutUrl(key, contentType = 'application/octet-stream', expiresIn = 900) {
  if (!bucket || !region) {
    throw new Error('Missing AWS_REGION or AWS_S3_BUCKET env vars');
  }
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const url = await getSignedUrl(s3, command, { expiresIn });
  return url;
}

module.exports = { getPresignedPutUrl };
async function getPresignedGetUrl(key, expiresIn = 300) {
  if (!bucket || !region) {
    throw new Error('Missing AWS_REGION or AWS_S3_BUCKET env vars');
  }
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(s3, command, { expiresIn });
}

async function deleteObject(key) {
  const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
  await s3.send(command);
}

module.exports.getPresignedGetUrl = getPresignedGetUrl;
module.exports.deleteObject = deleteObject;


