import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ImmersiveProvider } from "@/contexts/ImmersiveContext";
import { GlobalAccessibility } from "@/components/ui/global-accessibility";
import { Toaster } from "@/components/ui/sonner";
import { Footer } from "@/components/ui/footer";
import { CustomClerkProvider } from "@/components/providers/clerk-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AI Powered Learning Hub",
  description: "Enhanced learning platform with AI-powered features",
};

import React, { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground flex flex-col`}
        suppressHydrationWarning
      >
        <CustomClerkProvider>
          <ThemeProvider>
            <ImmersiveProvider>
              <GlobalAccessibility />
              <div className="flex-1">
                {children}
              </div>
              <Footer />
              <Toaster />
            </ImmersiveProvider>
          </ThemeProvider>
        </CustomClerkProvider>
      </body>
    </html>
  );
}
