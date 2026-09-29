"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/core/ui/SubmitButton";
import {
  requestPasswordReset,
  resendConfirmation,
  signIn,
  signUp,
  updatePassword,
  type AuthState,
} from "./actions";

function Notice({ state }: { state: AuthState }) {
  if (!state?.error && !state?.info) return null;
  return (
    <p
      role={state.error ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm ${state.error ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}
    >
      {state.error ?? state.info}
    </p>
  );
}

function PasswordInput({ name = "password", autoComplete, label = "Senha" }: { name?: string; autoComplete: string; label?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <div className="relative">
        <input id={name} name={name} type={show ? "text" : "password"} required minLength={name === "password" && autoComplete === "current-password" ? 1 : 8} autoComplete={autoComplete} className="field pr-20" />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-2 my-auto h-8 rounded-lg px-2 text-xs font-semibold text-body hover:bg-bg-deep">
          {show ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    </div>
  );
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, action] = useActionState(signIn, undefined);
  const [resendState, resend] = useActionState(resendConfirmation, undefined);
  const notConfirmed = state?.error?.startsWith("Confirme");
  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4">
        <input type="hidden" name="redirect" value={redirectTo} />
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state?.email} className="field" />
        </div>
        <PasswordInput autoComplete="current-password" />
        <Notice state={state} />
        <SubmitButton className="btn-primary w-full" pendingText="Entrando...">Entrar</SubmitButton>
      </form>
      {notConfirmed && (
        <form action={resend} className="space-y-2">
          <input type="hidden" name="email" value={state?.email ?? ""} />
          <Notice state={resendState} />
          <SubmitButton className="btn-secondary w-full" pendingText="Enviando...">Reenviar link de confirmação</SubmitButton>
        </form>
      )}
      <div className="flex flex-col items-center gap-2 text-sm">
        <Link href="/recuperar-senha" className="font-medium text-primary hover:underline">Esqueci minha senha</Link>
        <p className="text-body">
          Comprou e ainda não tem conta? <Link href="/cadastro" className="font-semibold text-primary hover:underline">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUp, undefined);
  if (state?.info) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-2xl">✉️</div>
        <h2 className="font-display text-xl font-semibold">Confirme seu e-mail</h2>
        <p className="text-sm leading-relaxed text-body">{state.info}</p>
        <p className="text-xs text-body">Não chegou? Veja a caixa de spam ou promoções.</p>
        <Link href="/login" className="btn-secondary w-full">Já confirmei, quero entrar</Link>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <div className="rounded-xl bg-accent-soft px-4 py-3 text-sm text-ink">
        Use <b>o mesmo e-mail da compra</b>. É por ele que liberamos o seu acesso.
      </div>
      <div>
        <label className="label" htmlFor="name">Seu nome</label>
        <input id="name" name="name" required maxLength={120} autoComplete="name" className="field" />
      </div>
      <div>
        <label className="label" htmlFor="email">E-mail da compra</label>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state?.email} className="field" />
      </div>
      <PasswordInput autoComplete="new-password" label="Crie uma senha (mín. 8 caracteres)" />
      <Notice state={state} />
      <SubmitButton className="btn-primary w-full" pendingText="Criando conta...">Criar minha conta</SubmitButton>
      <p className="text-center text-sm text-body">
        Já tem conta? <Link href="/login" className="font-semibold text-primary hover:underline">Entrar</Link>
      </p>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action] = useActionState(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">E-mail da conta</label>
        <input id="email" name="email" type="email" required autoComplete="email" defaultValue={state?.email} className="field" />
      </div>
      <Notice state={state} />
      <SubmitButton className="btn-primary w-full" pendingText="Enviando...">Enviar link</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-primary hover:underline">Voltar para o login</Link>
      </p>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action] = useActionState(updatePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <PasswordInput autoComplete="new-password" label="Nova senha (mín. 8 caracteres)" />
      <PasswordInput name="confirm" autoComplete="new-password" label="Repita a nova senha" />
      <Notice state={state} />
      <SubmitButton className="btn-primary w-full">Salvar nova senha</SubmitButton>
    </form>
  );
}
