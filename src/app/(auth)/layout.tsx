import Link from "next/link";

/** Chrome mínimo para /login y /register: tarjeta centrada, sin nav. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 block text-center text-lg font-semibold tracking-tight"
        >
          ☕ CoffeeProyect
        </Link>
        <div className="rounded-xl border bg-card p-6">{children}</div>
      </div>
    </div>
  );
}
