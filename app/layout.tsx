import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { Sidebar } from "@/app/components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tresora - Treasury Management",
  description: "AI-powered treasury management with multi-chain payments",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 2800,
            className:
              'rounded-2xl border border-white/10 bg-zinc-950/95 px-4 py-3 text-sm font-medium text-white shadow-[0_20px_60px_-25px_rgba(0,0,0,0.6)] backdrop-blur',
          }}
        />
        <div className="flex h-screen w-full overflow-hidden bg-black font-sans">
          <Sidebar />
          <main className="flex flex-1 flex-col overflow-hidden bg-white shadow-2xl transition-all md:m-3 md:rounded-[32px] md:border md:border-zinc-200/50">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
