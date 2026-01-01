const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const path = require('path');

if (
  !process.env.R2_ENDPOINT ||
  !process.env.R2_ACCESS_KEY_ID ||
  !process.env.R2_SECRET_ACCESS_KEY ||
  !process.env.R2_BUCKET ||
  !process.env.R2_PUBLIC_URL
) {
  throw new Error('❌ Variáveis do R2 não configuradas corretamente');
}

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim()
  }
});

module.exports = async function uploadR2(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const nome = `${Date.now()}-${crypto.randomUUID()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: nome,
    Body: file.buffer,
    ContentType: file.mimetype
  });

  await client.send(command);

  return `${process.env.R2_PUBLIC_URL}/${nome}`;
};
