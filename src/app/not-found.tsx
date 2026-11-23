import Link from "next/link";
import { MapPinOff } from "lucide-react";
import { DemoBar } from "@/components/demo-bar";
import { SiteFooter } from "@/components/site-footer";
import { EmptyState } from "@/components/states";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <DemoBar />
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-10 md:px-6">
        <div className="w-full rounded-lg border bg-card">
          <EmptyState
            icon={MapPinOff}
            title="This page isn’t part of the sample"
            headingLevel="h1"
            action={
              <>
                <Link href="/" className={buttonVariants({ variant: "outline", className: "h-9 max-md:h-11" })}>
                  Overview
                </Link>
                <Link href="/after" className={buttonVariants({ className: "h-9 max-md:h-11" })}>
                  Open the reworked board
                </Link>
              </>
            }
          >
            The link may be mistyped or from an older version. The sample has an overview, the before and after screens,
            the field views and the UI standard.
          </EmptyState>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
