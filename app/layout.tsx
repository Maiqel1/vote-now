import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { NavigationProgress } from "@/components/ui/navigation-progress";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "VoteNow · Online voting for organizations and student unions", template: "%s · VoteNow" },
  description:
    "Secure online voting for organizations, student unions, schools, clubs and associations. Secret ballots, one vote per voter, live turnout and instant polls. Start free.",
  applicationName: "VoteNow",
  openGraph: {
    type: "website",
    siteName: "VoteNow",
    title: "VoteNow · Online voting for organizations and student unions",
    description:
      "Secure online voting for organizations, student unions, schools, clubs and associations. Secret ballots, one vote per voter, live turnout and instant polls.",
  },
  twitter: { card: "summary_large_image" },
  verification: { google: "izZgC2imvgDy4tRi9AmvQtby16FpRqjR0jUdPlMXwgU" },
};

export const viewport: Viewport = {
  themeColor: "#fcfcfc",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <NavigationProgress />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
