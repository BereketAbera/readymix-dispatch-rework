import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const sans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const DESCRIPTION =
  "A one-screen trial, done in advance: the dispatch screen of a ready-mix operations portal, before and after, on invented data. No real company’s records were used.";

export const metadata: Metadata = {
  metadataBase: new URL("https://readymix-dispatch-rework.vercel.app"),
  title: {
    default: "Dispatch screen rework · sample",
    template: "%s · Dispatch rework sample",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Dispatch rework sample",
    title: "Dispatch screen rework: before and after",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Dispatch screen rework: before and after",
    description: DESCRIPTION,
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#18181b", // the sample bar across the top of every page (bg-zinc-900)
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-CA" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh antialiased">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
