"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/core/supabase/server";
import { safeNext } from "@/core/auth/guard";

export type AuthState = { error?: string; info?: string; email?: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function readEmail(formData: FormData) {
  return String(formData.get("email") ?? "").trim().toLowerCase();
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = readEmail(formData);
  const password = String(formData.get("password") ?? "");
  if (!EMAIL.test(email) || !password) return { error: "Informe e-mail e senha.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Confirme seu e-mail pelo link que enviamos antes de entrar.", email };
    }
    return { error: "E-mail ou senha incorretos.", email };
  }
  redirect(safeNext(String(formData.get("redirect") ?? "")));
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = readEmail(formData);
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const password = String(formData.get("password") ?? "");
  if (!name) return { error: "Informe seu nome.", email };
  if (!EMAIL.test(email)) return { error: "E-mail inválido.", email };
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/app` },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: "Já existe uma conta com este e-mail. Faça login.", email };
    if (error.code === "weak_password") return { error: "Senha fraca. Use letras e números.", email };
    if (error.status === 429) return { error: "Muitas tentativas. Aguarde alguns minutos.", email };
    return { error: "Não foi possível criar a conta agora. Tente de novo.", email };
  }
  return {
    info: `Enviamos um link de confirmação para ${email}. Abra seu e-mail e toque no link para liberar o acesso.`,
    email,
  };
}

export async function resendConfirmation(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = readEmail(formData);
  if (!EMAIL.test(email)) return { error: "E-mail inválido." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/app` },
  });
  if (error) return { error: "Aguarde um pouco antes de pedir outro e-mail.", email };
  return { info: "Link reenviado. Confira também a caixa de spam.", email };
}

export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const email = readEmail(formData);
  if (!EMAIL.test(email)) return { error: "E-mail inválido." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/nova-senha`,
  });
  // mesma resposta exista ou não a conta (não revela quem é cliente)
  return { info: "Se existir uma conta com este e-mail, você vai receber um link para criar uma nova senha.", email };
}

export async function updatePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (password !== String(formData.get("confirm") ?? "")) return { error: "As senhas não conferem." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "Use uma senha diferente da atual." };
    return { error: "Link expirado. Peça um novo em \"Esqueci minha senha\"." };
  }
  redirect("/app?ok=" + encodeURIComponent("Senha atualizada."));
}
