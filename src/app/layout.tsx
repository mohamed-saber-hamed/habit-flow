import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Habit Flow — make room for better habits",
  description:
    "A calmer way to build routines, keep your streaks, and see your progress add up.",
  applicationName: "Habit Flow",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Habit Flow", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f6f1",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
