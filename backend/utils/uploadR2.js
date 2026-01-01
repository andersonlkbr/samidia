const {
  S3Client,
  PutObjectCommand
} = require('@aws-sdk/client-s3');

const crypto = require('crypto');
const path = require('path');

/* ==========================
   CONFIGURAÇÃO R2
========================== */
const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
  }
});

/* ==========================
   UPLOAD
========================== */
module.exports = async function uploadR2(file) {
  if (!file || !file.buffer) {
    throw new Error('Arquivo inválido');
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const nome = `${Date.now()}-${crypto.randomUUID()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: nome,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read'
  });

  await client.send(command);

  // URL pública FINAL
  return `${process.env.R2_PUBLIC_URL}/${nome}`;
};
