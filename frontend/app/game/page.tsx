"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ConsoleShell from "@/components/ConsoleShell";
import SessionStatusBar from "@/components/SessionStatusBar";

const DINO_W = 44;
const DINO_H = 48;
const GROUND_Y = 260;
const GRAVITY = 0.6;
const JUMP_FORCE = -13;
const BASE_SPEED = 5;
const CANVAS_W = 800;
const CANVAS_H = 320;

interface Obstacle {
  x: number;
  w: number;
  h: number;
}

interface GameState {
  dinoY: number;
  dinoVY: number;
  onGround: boolean;
  obstacles: Obstacle[];
  score: number;
  speed: number;
  alive: boolean;
  started: boolean;
  frameCount: number;
}

function makeInitialState(): GameState {
  return {
    dinoY: GROUND_Y,
    dinoVY: 0,
    onGround: true,
    obstacles: [],
    score: 0,
    speed: BASE_SPEED,
    alive: true,
    started: false,
    frameCount: 0,
  };
}

export default function GamePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(makeInitialState());
  const rafRef = useRef<number>(0);
  const faahRef = useRef<HTMLAudioElement | null>(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    faahRef.current = new Audio("/faah.mp3");
  }, []);

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (!s.started) {
      s.started = true;
      setStarted(true);
    }
    if (s.onGround && s.alive) {
      s.dinoVY = JUMP_FORCE;
      s.onGround = false;
    }
  }, []);

  const restart = useCallback(() => {
    stateRef.current = makeInitialState();
    stateRef.current.started = true;
    setDisplayScore(0);
    setGameOver(false);
    setStarted(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (!stateRef.current.alive) {
          restart();
        } else {
          jump();
        }
      }
      if (e.code === "Escape") {
        router.push("/");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump, restart, router]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function spawnObstacle() {
      const h = 30 + Math.random() * 40;
      const w = 18 + Math.random() * 20;
      stateRef.current.obstacles.push({ x: CANVAS_W, w, h });
    }

    function drawDino(ctx: CanvasRenderingContext2D, y: number, frame: number) {
      const legOffset = Math.floor(frame / 6) % 2 === 0 ? 4 : -4;
      const green = "#4ade80";
      const darkGreen = "#16a34a";

      // Body
      ctx.fillStyle = green;
      ctx.fillRect(10, y - DINO_H + 8, 28, 28);

      // Head
      ctx.fillRect(22, y - DINO_H - 2, 22, 20);

      // Eye
      ctx.fillStyle = "#000";
      ctx.fillRect(38, y - DINO_H + 2, 4, 4);

      // Mouth
      ctx.fillStyle = darkGreen;
      ctx.fillRect(38, y - DINO_H + 10, 6, 3);

      // Legs
      ctx.fillStyle = green;
      ctx.fillRect(14, y - 12 + legOffset, 8, 14);
      ctx.fillRect(26, y - 12 - legOffset, 8, 14);
    }

    function drawCactus(ctx: CanvasRenderingContext2D, obs: Obstacle) {
      const { x, w, h } = obs;
      ctx.fillStyle = "#22c55e";
      // Main trunk
      ctx.fillRect(x + w / 2 - 5, GROUND_Y - h, 10, h);
      // Left arm
      ctx.fillRect(x, GROUND_Y - h * 0.6, w / 2 - 2, 8);
      ctx.fillRect(x, GROUND_Y - h * 0.6 - 14, 8, 16);
      // Right arm
      ctx.fillRect(x + w / 2 + 2, GROUND_Y - h * 0.5, w / 2 - 2, 8);
      ctx.fillRect(x + w - 8, GROUND_Y - h * 0.5 - 12, 8, 14);
    }

    function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
      ctx.fillStyle = "rgba(74,222,128,0.12)";
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.arc(x + 22, y - 5, 22, 0, Math.PI * 2);
      ctx.arc(x + 44, y, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    let clouds = [
      { x: 100, y: 60 },
      { x: 400, y: 80 },
      { x: 650, y: 50 },
    ];

    function loop() {
      const s = stateRef.current;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Background
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Clouds
      clouds.forEach((c) => {
        drawCloud(ctx, c.x, c.y);
        if (s.started && s.alive) c.x -= s.speed * 0.3;
        if (c.x < -80) c.x = CANVAS_W + 80;
      });

      // Ground line
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y + 2);
      ctx.lineTo(CANVAS_W, GROUND_Y + 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (!s.started) {
        // Idle dino
        drawDino(ctx, s.dinoY, 0);

        // Prompt
        ctx.fillStyle = "#4ade80";
        ctx.font = "16px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText("PRESS SPACE or TAP to start", CANVAS_W / 2, CANVAS_H / 2 + 40);
        ctx.textAlign = "left";
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      if (s.alive) {
        s.frameCount++;

        // Physics
        s.dinoVY += GRAVITY;
        s.dinoY += s.dinoVY;
        if (s.dinoY >= GROUND_Y) {
          s.dinoY = GROUND_Y;
          s.dinoVY = 0;
          s.onGround = true;
        }

        // Speed up over time
        s.speed = BASE_SPEED + s.score / 400;

        // Spawn obstacles
        const minGap = Math.max(60, 100 - s.score / 20);
        const lastObs = s.obstacles[s.obstacles.length - 1];
        const shouldSpawn =
          !lastObs || lastObs.x < CANVAS_W - (200 + Math.random() * minGap * 10);
        if (s.frameCount % Math.max(60, 90 - Math.floor(s.score / 50)) === 0 && shouldSpawn) {
          spawnObstacle();
        }

        // Move & cull obstacles
        s.obstacles = s.obstacles.filter((o) => o.x + o.w > -10);
        s.obstacles.forEach((o) => (o.x -= s.speed));

        // Collision
        const dinoLeft = 10;
        const dinoRight = 38;
        const dinoTop = s.dinoY - DINO_H + 8;
        const dinoBottom = s.dinoY;

        for (const obs of s.obstacles) {
          if (
            dinoRight > obs.x + 4 &&
            dinoLeft < obs.x + obs.w - 4 &&
            dinoBottom > GROUND_Y - obs.h + 4 &&
            dinoTop < GROUND_Y
          ) {
            s.alive = false;
            setGameOver(true);
            if (faahRef.current) {
              faahRef.current.currentTime = 0;
              faahRef.current.play();
            }
            break;
          }
        }

        s.score++;
        setDisplayScore(s.score);
      }

      // Draw obstacles
      s.obstacles.forEach((obs) => drawCactus(ctx, obs));

      // Draw dino
      drawDino(ctx, s.dinoY, s.alive ? s.frameCount : 0);

      if (!s.alive) {
        // Game over overlay
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 32px 'Courier New', monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", CANVAS_W / 2, CANVAS_H / 2 - 20);

        ctx.font = "16px 'Courier New', monospace";
        ctx.fillText(`SCORE: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2 + 16);
        ctx.fillText("PRESS SPACE to restart", CANVAS_W / 2, CANVAS_H / 2 + 48);
        ctx.textAlign = "left";
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <>
      <SessionStatusBar />
      <ConsoleShell>
        <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4">
          {/* Header */}
          <div className="w-full max-w-[800px] flex items-center justify-between terminal-text text-sm">
            <span className="text-[var(--accent-green)]">
              {">"} dino_runner.exe
            </span>
            <span className="text-[var(--text-secondary)]">
              SCORE:{" "}
              <span className="text-[var(--accent-cyan)]">
                {String(displayScore).padStart(5, "0")}
              </span>
            </span>
          </div>

          {/* Canvas */}
          <div
            className="border border-[var(--accent-green)] rounded overflow-hidden"
            style={{ boxShadow: "0 0 20px rgba(74,222,128,0.15)" }}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onClick={() => {
                if (!stateRef.current.alive) {
                  restart();
                } else {
                  jump();
                }
              }}
              style={{ display: "block", cursor: "pointer", maxWidth: "100%" }}
            />
          </div>

          {/* Controls hint */}
          <div className="terminal-text text-xs text-[var(--text-muted)] flex gap-6">
            <span>
              <span className="text-[var(--accent-green)]">SPACE / ↑</span> — jump
            </span>
            <span>
              <span className="text-[var(--accent-green)]">ESC</span> — back to terminal
            </span>
          </div>
        </div>
      </ConsoleShell>
    </>
  );
}
