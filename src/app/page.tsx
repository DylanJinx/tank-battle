"use client";

import React from "react";
import dynamic from "next/dynamic";

// 使用动态导入避免SSR阶段Canvas等DOM API的问题
const TankGame = dynamic(() => import("../components/game/TankGame"), {
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center text-white">
      游戏加载中...
    </div>
  ),
});

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-6 bg-black">
      <TankGame />
    </main>
  );
}
