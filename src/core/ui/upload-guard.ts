/**
 * Impede salvar um formulário enquanto alguma foto ainda está sendo enviada.
 * Sem isto, quem toca em "Salvar" no meio do envio (4G lento) grava o item
 * sem foto e o arquivo fica órfão no Storage.
 */
export function blockWhileUploading(e: React.FormEvent<HTMLFormElement>, warn: (msg: string) => void): boolean {
  if (e.currentTarget.querySelector('[data-uploading="true"]')) {
    e.preventDefault();
    warn("Aguarde a foto terminar de enviar e toque em salvar de novo.");
    return true;
  }
  return false;
}
