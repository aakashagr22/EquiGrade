import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "EquiGrade — AI-Powered Contribution Evaluator",
  description:
    "Fairly evaluate individual contributions in group projects using real data, AI analysis, and objective scoring.",
  keywords: [
    "group project grading",
    "contribution evaluation",
    "AI grading",
    "peer assessment",
    "EquiGrade",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col gradient-bg">{children}</body>
    </html>
  );
}
