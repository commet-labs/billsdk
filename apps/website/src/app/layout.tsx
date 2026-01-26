import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import "./global.css";
import { Analytics } from "@vercel/analytics/next";
import { IBM_Plex_Mono } from "next/font/google";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "BillSDK",
  description:
    "A billing engine that runs inside your application. No lock-in. No revenue share.",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    type: "website",
    url: "https://billsdk.com",
    images: "https://billsdk.com/og.png",
    siteName: "BillSDK",
  },
  twitter: {
    card: "summary_large_image",
    images: "https://billsdk.com/og.png",
  },
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={ibmPlexMono.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>
          {children}
          <Analytics />
        </RootProvider>
      </body>
    </html>
  );
}
