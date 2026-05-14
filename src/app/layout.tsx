import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "每日财经简报",
  description: "每日中文财经新闻简报预览"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
