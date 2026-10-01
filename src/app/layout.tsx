import type { Metadata, Viewport } from "next";
import { Baloo_2, Fraunces, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const brandRounded = Baloo_2({
  variable: "--font-brand",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  applicationName: "Littly",
  title: {
    default: "Littly — For the Littles.",
    template: "%s · Littly",
  },
  description:
    "Littly offers calm, parent-friendly guidance on sleep, feeding, development, crying, and baby safety. For the Littles.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/littly-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/littly-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f6f3ea",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${brandRounded.variable} h-full`}>
      <body className="min-h-full bg-porcelain font-sans text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
