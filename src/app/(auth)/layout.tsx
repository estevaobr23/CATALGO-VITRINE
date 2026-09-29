import Link from "next/link";
import { Logo } from "@/vertical/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-bg px-4 py-10">
      <Link href="/" className="mb-8" aria-label="CestaVitrine — início">
        <Logo />
      </Link>
      <div className="card w-full max-w-md p-6 shadow-sm sm:p-8">{children}</div>
    </main>
  );
}
