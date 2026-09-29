"use client";
import { useActionState, useRef } from "react";
import { useToast } from "./toast";
import { blockWhileUploading } from "./upload-guard";

type Result = { ok: boolean; message: string } | undefined;

/**
 * <form> ligado a uma Server Action que devolve { ok, message }: mostra o
 * aviso (sucesso/erro) e opcionalmente limpa o formulário. `confirm` pede
 * confirmação antes de enviar (exclusões).
 *
 * O aviso é disparado quando a ação termina (e não num efeito deste
 * componente): numa exclusão, a linha que contém o formulário some da tela
 * junto com a resposta, e o aviso ainda precisa aparecer.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  confirm,
  id,
}: {
  action: (state: Result, fd: FormData) => Promise<Result>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  confirm?: string;
  id?: string;
}) {
  const toast = useToast();
  const ref = useRef<HTMLFormElement>(null);
  const [, formAction] = useActionState(async (prev: Result, fd: FormData) => {
    const result = await action(prev, fd);
    if (result?.message) toast(result.message, result.ok ? "success" : "error");
    if (result?.ok && resetOnSuccess) ref.current?.reset();
    return result;
  }, undefined);

  return (
    <form
      ref={ref}
      id={id}
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (blockWhileUploading(e, (m) => toast(m, "error"))) return;
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
