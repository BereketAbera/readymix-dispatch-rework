import Link from "next/link";
import type { ReactNode } from "react";
import { DemoBar } from "@/components/demo-bar";
import { ProductBrand } from "@/components/product-shell";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/field", label: "Driver", id: "driver" },
  { href: "/field/qc", label: "QC tech", id: "qc" },
] as const;

/** Header for the field screens: who is using it, and a switch between the driver's and the QC tech's view. */
export function FieldShell({
  active,
  title,
  subtitle,
  children,
}: {
  active: "driver" | "qc";
  title: ReactNode;
  subtitle: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <DemoBar />
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-6">
          <ProductBrand subtitle="Field" />
          <nav aria-label="Field views" className="order-last w-full sm:order-none sm:ml-auto sm:w-auto">
            <ul className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:flex">
              {TABS.map((t) => (
                <li key={t.id}>
                  <Link
                    href={t.href}
                    aria-current={t.id === active ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:h-9",
                      t.id === active ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="w-full">
            <h1 className="text-lg leading-snug font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
