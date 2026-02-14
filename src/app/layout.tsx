import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Virtual Track Meet Simulator",
  description: "Monte Carlo simulations for virtual track meets"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
