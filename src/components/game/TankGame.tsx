"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./TankGame.module.css";
import {
  initGame,
  startGameLoop,
  stopGameLoop,
  restartGame,
  getCurrentFps,
  getEnemyCount,
} from "@/lib/gameLogic";

const TankGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fps, setFps] = useState(0);
  const [enemyCount, setEnemyCount] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 初始化游戏
    initGame(canvas);

    // 启动游戏循环
    startGameLoop();

    // 定时更新UI数据
    const statsInterval = setInterval(() => {
      setFps(getCurrentFps());
      setEnemyCount(getEnemyCount());
    }, 500);

    // 在组件卸载时清理
    return () => {
      stopGameLoop();
      clearInterval(statsInterval);
    };
  }, []);

  const handleRestart = () => {
    restartGame();
  };

  return (
    <div className={styles.gameContainer}>
      <h1 className={styles.gameTitle}>坦克大战</h1>

      <div className={styles.gameStats}>
        <div className={styles.stat} id="enemyCount">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
              stroke="#ff3b30"
              strokeWidth="2"
            />
          </svg>
          <span>
            敌人: <span id="enemyCountValue">{enemyCount}</span>
          </span>
        </div>
        <div className={styles.stat} id="fps">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 8V12L15 15"
              stroke="#64d2ff"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="12" r="9" stroke="#64d2ff" strokeWidth="2" />
          </svg>
          <span>
            FPS: <span id="fpsValue">{fps}</span>
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        id="gameCanvas"
        width={800}
        height={600}
        className={styles.gameCanvas}
      />

      <button className={styles.restartBtn} onClick={handleRestart}>
        重新开始
      </button>

      <div className={styles.controls}>
        <div className={styles.controlsRow}>
          <div className={styles.controlKey}>W</div>
          <div className={styles.controlKey}>A</div>
          <div className={styles.controlKey}>S</div>
          <div className={styles.controlKey}>D</div>
          <div className={styles.controlDesc}>移动坦克</div>
        </div>
        <div className={styles.controlsRow}>
          <div className={styles.controlKey}>↑</div>
          <div className={styles.controlKey}>←</div>
          <div className={styles.controlKey}>↓</div>
          <div className={styles.controlKey}>→</div>
          <div className={styles.controlDesc}>移动坦克</div>
        </div>
        <div className={styles.controlsRow}>
          <div className={styles.controlKey}>空格</div>
          <div className={styles.controlDesc}>发射炮弹</div>
        </div>
      </div>
    </div>
  );
};

export default TankGame;
