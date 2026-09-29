import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/core/supabase/server";

// POST (nunca GET): um <img src="/auth/sair"> de terceiros não desloga ninguém.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin), { status: 303 });
}
