import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

const baloo2 = localFont({
  src: [{ path: "./fonts/baloo2-variable.woff2", style: "normal" }],
  display: "swap",
  variable: "--font-baloo",
});

const comicNeue = localFont({
  src: [
    { path: "./fonts/comicneue-300.woff2", weight: "300", style: "normal" },
    { path: "./fonts/comicneue-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/comicneue-700.woff2", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-comic",
});

export const metadata: Metadata = {
  title: "Presensi - SMK Muhammadiyah 3 Purbalingga",
  description: "Sistem kehadiran siswa SMK Muhammadiyah 3 Purbalingga - Modern & Playful",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`h-full antialiased ${baloo2.variable} ${comicNeue.variable}`}>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <Toaster position="top-center" richColors expand={true} />
        {children}
      </body>
    </html>
  );
}
