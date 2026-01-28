import { TimeTravelOverlay } from "@billsdk/time-travel/react";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "BillSDK Demo",
  description: "Demo application showcasing BillSDK billing integration",
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    url: "https://demo.billsdk.com",
    images: "https://demo.billsdk.com/og.png",
    siteName: "BillSDK Demo",
  },
  twitter: {
    card: "summary_large_image",
    images: "https://demo.billsdk.com/og.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${ibmPlexMono.className} antialiased`}>
        <NuqsAdapter>{children}</NuqsAdapter>
        <TimeTravelOverlay baseUrl="/api/billing" />
        <Analytics />
      </body>
    </html>
  );
}
