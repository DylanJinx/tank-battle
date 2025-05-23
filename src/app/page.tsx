"use client";

import React from "react";
import dynamic from "next/dynamic";

// 使用动态导入避免SSR阶段Canvas等DOM API的问题
const TankGame = dynamic(() => import("../components/game/TankGame"), {
  loading: () => (
    <div className="w-full h-[60vh] flex items-center justify-center text-white">
      游戏加载中...
    </div>
  ),
  ssr: false, // 禁用服务器端渲染
});

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-2 sm:p-6 bg-black overflow-hidden">
      <TankGame />
    </main>
  );
}
