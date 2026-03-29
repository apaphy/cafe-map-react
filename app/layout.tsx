import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "cafe map",
  description: "view your cafe ratings!",
};

export default function RootLayout({
  children,
}: Readonly<{
    children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-screen">
      <head>
        {/* Preconnect to Supabase CDN for faster image loading */}
        <link rel="preconnect" href="https://jngvduzxuimqrgjosugu.supabase.co" />
        <link rel="dns-prefetch" href="https://jngvduzxuimqrgjosugu.supabase.co" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-screen`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
