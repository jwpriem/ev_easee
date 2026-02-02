import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EV Easee - Manage Your Electric Vehicle",
  description: "Connect and manage your electric vehicles in one place",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
