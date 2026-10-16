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
  metadataBase: new URL("https://littlyai.vercel.app"),
  applicationName: "Littly",
  verification: {
    google: "USl8EGsLYj4XHHcnA9t_DezXThHJ20nnG8fox4a5QGA",
  },
  title: {
    default: "Littly AI — Baby Care Assistant | For the Littles",
    template: "%s · Littly",
  },
  description:
    "Meet Littly AI, a parent-friendly baby care assistant offering guidance on infant sleep, feeding, development, crying, and everyday baby safety.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Littly",
    title: "Littly AI — Baby Care Assistant | For the Littles",
    description:
      "Meet Littly AI, a parent-friendly baby care assistant offering guidance on infant sleep, feeding, development, crying, and everyday baby safety.",
    images: [
      {
        url: "/logo/littly-reference.png",
        width: 1254,
        height: 1254,
        alt: "Littly — For the Littles",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Littly AI — Baby Care Assistant | For the Littles",
    description:
      "Meet Littly AI, a parent-friendly baby care assistant offering guidance on infant sleep, feeding, development, crying, and everyday baby safety.",
  },
  robots: {
    index: true,
    follow: true,
  },
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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Littly",
  alternateName: "Littly AI",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  inLanguage: "en",
  url: "https://littlyai.vercel.app/",
  description:
    "Meet Littly AI, a parent-friendly baby care assistant offering guidance on infant sleep, feeding, development, crying, and everyday baby safety.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${brandRounded.variable} h-full`}>
      <body className="min-h-full bg-porcelain font-sans text-stone-900 antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
