const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

// 1. Configuração direta (Resolve o erro "r2.send is not a function")
const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    // Tenta os dois nomes comuns de variável para garantir que funcione
    accessKeyId: process.env.R2_ACCESS_KEY || process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_KEY || process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

/* =========================
   UPLOAD
========================= */
async function uploadToR2(buffer, filename, mimetype) {
  const key = `midia/${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`;

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    });

    await r2.send(command);

    return `${PUBLIC_URL}/${key}`;
  } catch (error) {
    console.error("Erro fatal no Upload R2:", error);
    throw error; 
  }
}

/* =========================
   DELETE (BLINDADO)
========================= */
async function deleteFromR2(url) {
  try {
    if (!url) return;

    // Decodifica a URL para evitar erros com espaços e acentos
    const pathName = new URL(url).pathname;
    const key = decodeURIComponent(pathName.replace(/^\/+/, ""));

    console.log(`Tentando apagar do R2: ${key}`);

    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
    console.log("Sucesso: Apagado do R2");
  } catch (err) {
    // Apenas loga o erro, NÃO trava o sistema.
    // Assim o banco de dados pode prosseguir com a exclusão.
    console.error("Aviso: Falha ao apagar do R2 (pode já ter sido apagado):", err.message);
  }
}

module.exports = {
  uploadToR2,
  deleteFromR2,
};