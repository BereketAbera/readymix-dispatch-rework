"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const SAMPLE_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/before", label: "Before" },
  { href: "/after", label: "After" },
  { href: "/field", label: "Field" },
  { href: "/standard", label: "Standard" },
];

/**
 * The dark strip at the top belongs to the sample, not the product:
 * it switches between views and holds demo-only controls.
 */
export function DemoBar({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  const current = SAMPLE_LINKS.find((l) => l.href === pathname) ?? SAMPLE_LINKS[0];
  return (
    <div className="shrink-0 bg-zinc-900 text-zinc-100">
      <div className="flex min-h-11 flex-wrap items-center gap-x-5 gap-y-2 px-4 py-1.5">
        <Link
          href="/"
          className="rounded-sm text-sm font-semibold whitespace-nowrap text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          Dispatch rework <span className="font-normal text-zinc-400">· sample</span>
        </Link>
        <nav aria-label="Sample views" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {SAMPLE_LINKS.map((l) => {
              const active = l.href === pathname;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none",
                      active && "bg-zinc-800 font-medium text-white",
                    )}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="ml-auto md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1 rounded-md border border-zinc-700 px-2.5 text-sm text-zinc-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none">
              <span className="sr-only">Sample view: </span>
              {current.label}
              <ChevronDown className="size-4" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              {SAMPLE_LINKS.map((l) => (
                <DropdownMenuItem key={l.href} asChild>
                  <Link href={l.href} aria-current={l.href === pathname ? "page" : undefined}>
                    {l.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {children && (
          <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 md:ml-auto md:w-auto">{children}</div>
        )}
      </div>
    </div>
  );
}
