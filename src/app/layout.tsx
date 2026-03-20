import dynamic from "next/dynamic";
import type { Metadata } from "next";
import { Inter, Syncopate } from "next/font/google";
import "./globals.css";

const BackgroundVideo = dynamic(() => import("@/components/BackgroundVideo"));

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const syncopate = Syncopate({
  variable: "--font-syncopate",
  weight: ["700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FEROX ROAMER | Find Your Journey Companion",
  description: "Connect with fellow explorers. Find travel companions, share hidden spots, and embark on journeys that redefine the horizon.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${syncopate.variable} antialiased font-body text-white`}
      >
        <BackgroundVideo />
        {children}
      </body>
    </html>
  );
}
