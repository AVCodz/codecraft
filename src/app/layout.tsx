import type { Metadata } from "next";
import { Geist, Geist_Mono, Galindo } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SessionInitializer } from "@/components/auth/SessionInitializer";
import { Toaster } from "@/components/ui/Toaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const galindo = Galindo({
  weight: "400",
  variable: "--font-galindo",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VibeIt - Turn Your Ideas Into Reality",
  description:
    "AI-powered development platform that transforms your vision into fully functional web applications",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${galindo.variable} antialiased`}
      >
        <Toaster />
        <SessionInitializer />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
