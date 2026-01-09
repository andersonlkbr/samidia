/* =========================
   DELETE (CORRIGIDO)
========================= */
async function deleteFromR2(url) {
  try {
    if (!url) return;

    // CORREÇÃO: decodeURIComponent resolve problemas de espaços (%20) e acentos
    const pathName = new URL(url).pathname;
    const key = decodeURIComponent(pathName.replace(/^\/+/, "")); 

    console.log("Tentando deletar Key:", key); // Log para debug

    await r2.send(
      new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      })
    );
    console.log("Deletado com sucesso do R2");
  } catch (err) {
    console.error("Erro ao excluir do R2:", err);
  }
}