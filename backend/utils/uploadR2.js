const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

// 1. Criação do Cliente R2 DIRETAMENTE aqui para evitar erro de importação
const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    // ATENÇÃO: Verifique se no Render suas variáveis são essas mesmas.
    // Às vezes o padrão é R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY
    accessKeyId: process.env.R2_ACCESS_KEY || process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_KEY || process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL; // Ex: https://pub-xyz.r2.dev

/* =========================
   UPLOAD
========================= */
async function uploadToR2(buffer, filename, mimetype) {
  // Cria um nome único para não substituir arquivos
  const key = `midia/${Date.now()}-${Math.random().toString(36).slice(2)}-${filename}`;

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
      // ACL: "public-read", // Descomente se seu bucket não for público por padrão
    });

    // O erro "r2.send is not a function" acontecia aqui
    // Agora, com o cliente criado neste mesmo arquivo, isso deve parar.
    await r2.send(command);

    return `${PUBLIC_URL}/${key}`;
  } catch (error) {
    console.error("Erro detalhado no Upload R2:", error);
    throw error; // Joga o erro para o frontend saber que falhou
  }
}

/* =========================
   DELETE (Com correção de URL)
========================= */
async function deleteFromR2(url) {
  try {
    if (!url) return;

    // 1. Pega apenas o caminho após o domínio
    const pathName = new URL(url).pathname;
    
    // 2. IMPORTANTE: Decodifica espaços (%20) e remove a barra inicial '/'
    const key = decodeURIComponent(pathName.replace(/^\/+/, ""));

    console.log("Tentando deletar Key:", key);

    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
    
    console.log("Sucesso: Arquivo removido do R2");
  } catch (err) {
    console.error("Erro ao excluir do R2:", err);
    // Não damos throw aqui para não travar a exclusão do banco de dados
  }
}

module.exports = {
  uploadToR2,
  deleteFromR2,
};