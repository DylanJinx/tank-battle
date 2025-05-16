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
  handleTouchDirectionChange,
  handleTouchShoot,
} from "@/lib/gameLogic";

const TankGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fps, setFps] = useState(0);
  const [enemyCount, setEnemyCount] = useState(3);
  const joystickRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });

  // 检测是否为移动设备
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || "ontouchstart" in window);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

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

  // 摇杆控制逻辑
  const handleJoystickStart = (e: React.TouchEvent | React.MouseEvent) => {
    setJoystickActive(true);
    handleJoystickMove(e);
  };

  const handleJoystickMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!joystickActive || !joystickRef.current) return;

    let clientX, clientY;

    // 处理鼠标或触摸事件
    if ("touches" in e) {
      e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    const joystickRect = joystickRef.current.getBoundingClientRect();
    const centerX = joystickRect.left + joystickRect.width / 2;
    const centerY = joystickRect.top + joystickRect.height / 2;

    // 计算相对于中心的位置
    let deltaX = clientX - centerX;
    let deltaY = clientY - centerY;

    // 限制操纵杆移动范围
    const maxDistance = joystickRect.width / 2;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > maxDistance) {
      deltaX = (deltaX / distance) * maxDistance;
      deltaY = (deltaY / distance) * maxDistance;
    }

    // 更新操纵杆位置
    setJoystickPos({ x: deltaX, y: deltaY });

    // 计算方向 (-1 到 1 之间的值)
    const dirX = Math.abs(deltaX) < 10 ? 0 : deltaX / maxDistance;
    const dirY = Math.abs(deltaY) < 10 ? 0 : deltaY / maxDistance;

    // 发送方向到游戏逻辑
    handleTouchDirectionChange(dirX, dirY);
  };

  const handleJoystickEnd = () => {
    setJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    handleTouchDirectionChange(0, 0);
  };

  const handleShootButton = () => {
    handleTouchShoot(true);
  };

  // 处理全局鼠标/触摸移动和结束事件
  useEffect(() => {
    const handleGlobalMove = (e: TouchEvent | MouseEvent) => {
      if (joystickActive) {
        const syntheticEvent = e as any;
        handleJoystickMove(syntheticEvent);
      }
    };

    const handleGlobalEnd = () => {
      if (joystickActive) {
        handleJoystickEnd();
      }
    };

    window.addEventListener("mousemove", handleGlobalMove);
    window.addEventListener("mouseup", handleGlobalEnd);
    window.addEventListener("touchmove", handleGlobalMove);
    window.addEventListener("touchend", handleGlobalEnd);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMove);
      window.removeEventListener("mouseup", handleGlobalEnd);
      window.removeEventListener("touchmove", handleGlobalMove);
      window.removeEventListener("touchend", handleGlobalEnd);
    };
  }, [joystickActive]);

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

      <div className={styles.gameWrapper}>
        <canvas
          ref={canvasRef}
          id="gameCanvas"
          width={800}
          height={600}
          className={styles.gameCanvas}
        />

        {isMobile && (
          <>
            {/* 触摸控制器 */}
            <div className={styles.touchControls}>
              {/* 左侧摇杆 */}
              <div
                className={styles.joystickContainer}
                ref={joystickRef}
                onMouseDown={handleJoystickStart}
                onTouchStart={handleJoystickStart}
              >
                <div className={styles.joystickBase}>
                  <div
                    className={styles.joystickHandle}
                    style={{
                      transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
                    }}
                  />
                </div>
              </div>

              {/* 右侧射击按钮 */}
              <div className={styles.actionButtons}>
                <button
                  className={styles.shootButton}
                  onMouseDown={handleShootButton}
                  onTouchStart={handleShootButton}
                >
                  射击
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <button className={styles.restartBtn} onClick={handleRestart}>
        重新开始
      </button>

      {!isMobile && (
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
      )}
    </div>
  );
};

export default TankGame;
