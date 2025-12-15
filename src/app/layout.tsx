import type { Metadata, Viewport } from "next";
import { Inter, Fredoka } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Habitisim",
  description: "Cosmic Routine Builder for Kids",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { ThemeProvider } from '@/components/providers/ThemeProvider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Note: Server Component cannot directly access Zustand store easily for initial render
  // without hydration mismatch. 
  // Strategy: We keep RootLayout generic, but we wrap children in a Client "ThemeProvider" 
  // OR we just rely on Parent/Child layouts setting classes.
  // Actually, standard way: <body> gets class, but we need client access.
  // Let's create a Client Component wrapper for the body content.

  return (
    <html lang="en">
      <body className={`${inter.variable} ${fredoka.variable} font-sans`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
