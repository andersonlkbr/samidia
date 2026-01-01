const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY,
  R2_SECRET_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
  throw new Error("❌ Variáveis do R2 não configuradas corretamente");
}

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY
  }
});

async function uploadToR2(fileBuffer, fileName, mimeType) {
  const key = `midia/${Date.now()}-${fileName}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType
    })
  );

  return `${R2_PUBLIC_URL}/${key}`;
}

async function deleteFromR2(url) {
  if (!url) return;

  const key = url.split(`${R2_PUBLIC_URL}/`)[1];
  if (!key) return;

  await s3.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key
    })
  );
}

module.exports = {
  uploadToR2,
  deleteFromR2
};
