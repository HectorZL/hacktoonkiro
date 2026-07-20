import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Juegos accesibles",
  description: "Una experiencia de juego simple y accesible.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
