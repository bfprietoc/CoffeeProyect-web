import Link from "next/link";
import { AdminHeaderActions } from "@/components/admin/admin-header-actions";

/**
 * Chrome del panel admin: header propio (sin nav de tienda ni carrito).
 * El panel es una superficie de operación, no parte del flujo de compra.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
          <Link href="/admin" className="text-lg font-semibold tracking-tight">
            ⚙️ Panel admin
          </Link>
          <AdminHeaderActions />
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </>
  );
}
