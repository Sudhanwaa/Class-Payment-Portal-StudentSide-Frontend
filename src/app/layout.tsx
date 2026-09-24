import type { Metadata, Viewport } from "next";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "./globals.css";
import { tenantConfig, tenantThemeStyle } from "@/config/tenant";

export const metadata: Metadata = {
  title: `Student Portal | ${tenantConfig.name}`,
  description: "Find and securely pay your outstanding school fees.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: tenantConfig.theme.header,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body style={tenantThemeStyle} className="bg-canvas font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
