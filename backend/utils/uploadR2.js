const {
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const r2 = require("../config/r2");

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/* =========================
   UPLOAD
========================= */
async function uploadToR2(buffer, filename, mimetype) {
  const key = `midia/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}-${filename}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );

  return `${PUBLIC_URL}/${key}`;
}

/* =========================
   DELETE (À PROVA DE BUG)
========================= */
async function deleteFromR2(url) {
  try {
    if (!url) return;

    const key = new URL(url).pathname.replace(/^\/+/, "");

    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
  } catch (err) {
    console.error("Erro ao excluir do R2:", err);
  }
}

module.exports = {
  uploadToR2,
  deleteFromR2,
};