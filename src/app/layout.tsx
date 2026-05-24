import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getServerSession } from "next-auth";
import { Providers } from "@/components/Providers";
import { authOptions } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ResumeAI: Free Resume Coach",
  description: "Get AI-powered resume feedback with inline highlights and scoring",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={inter.variable}>
      <body
        className={`${inter.className} min-h-dvh bg-navy text-foreground antialiased`}
      >
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
}
