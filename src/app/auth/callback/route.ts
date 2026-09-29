import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/core/supabase/server";
import { safeNext } from "@/core/auth/guard";

// Confirmação de e-mail e recuperação de senha. Aceita os dois formatos do
// Supabase: ?code= (PKCE) e ?token_hash=&type= (template de e-mail
// recomendado no README, funciona mesmo abrindo o link em outro aparelho).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  if (!ok) return NextResponse.redirect(new URL("/login?erro=link", origin));
  if (type === "recovery") return NextResponse.redirect(new URL("/nova-senha", origin));
  return NextResponse.redirect(new URL(next, origin));
}
