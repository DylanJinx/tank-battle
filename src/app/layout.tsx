import React from "react";
import "./globals.css";

export const metadata = {
  title: "坦克大战 - Next.js 版本",
  description: "使用Next.js构建的现代化坦克大战游戏",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
