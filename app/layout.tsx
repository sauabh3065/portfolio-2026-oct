import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Saurabh Rawat | Backend Engineer & Senior Software Developer",
  description:
    "Saurabh Rawat’s portfolio. Node.js, microservices, PostgreSQL, and AWS. Building fast, reliable systems from architecture to production.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
