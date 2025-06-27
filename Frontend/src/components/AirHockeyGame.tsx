import { useEffect, useRef, useState } from 'react';

const AirHockeyGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameReady, setGameReady] = useState(false);
  const [gameActive, setGameActive] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width = 350; // Slightly smaller for loading screen
    const H = canvas.height = 250;

    let playerY = H / 2 - 30;
    let botY = H / 2 - 30;
    const paddleHeight = 60;
    const paddleWidth = 10;

    const ball = {
      x: W / 2,
      y: H / 2,
      vx: 3, // Initial velocity added
      vy: 2,  // Initial velocity added
      radius: 8,
      speed: 4,
    };

    let botDelayCounter = 0;
    let resetting = false;
    let playerJustHit = false;
    let animationFrameId: number;

    const resetBall = (serveToPlayer = false) => {
      resetting = true;
      ball.x = W / 2;
      ball.y = H / 2;
      ball.vx = serveToPlayer ? ball.speed : -ball.speed; // Set initial velocity immediately
      ball.vy = (Math.random() - 0.5) * 2;
      setGameReady(false);
      playerJustHit = false;

      setTimeout(() => {
        resetting = false;
        setGameReady(true);
        setGameActive(true);
      }, 1000);
    };

    const startGame = () => {
      resetBall();
    };

    // Start the game immediately when component mounts
    startGame();

    const drawField = () => {
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(0, 0, W, H);

      // Draw center line
      ctx.strokeStyle = '#374151';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(W / 2, 0);
      ctx.lineTo(W / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawPaddles = () => {
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(10, playerY, paddleWidth, paddleHeight);
      
      ctx.fillStyle = '#22D3EE';
      ctx.fillRect(W - 20, botY, paddleWidth, paddleHeight);
    };

    const drawBall = () => {
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#E879F9';
      ctx.fill();
    };

    const moveBall = () => {
      if (!gameReady || resetting) return;
      
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Wall collision
      if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= H) {
        ball.vy *= -0.95;
        ball.y = ball.y - ball.radius <= 0 ? ball.radius : H - ball.radius;
      }
    };

    const handlePaddleCollisions = () => {
      // Player paddle collision
      if (
        ball.x - ball.radius <= 20 &&
        ball.y >= playerY &&
        ball.y <= playerY + paddleHeight &&
        ball.vx < 0 &&
        !playerJustHit
      ) {
        ball.vx = Math.abs(ball.vx) * 1.05;
        const hitPos = (ball.y - playerY) / paddleHeight - 0.5;
        ball.vy += hitPos * 3;
        playerJustHit = true;
        
        setScore(prev => {
          const newScore = prev + 1;
          if (newScore > highScore) setHighScore(newScore);
          return newScore;
        });
      }

      if (ball.x > 50) playerJustHit = false;

      // Bot paddle collision
      if (
        ball.x + ball.radius >= W - 20 &&
        ball.y >= botY &&
        ball.y <= botY + paddleHeight &&
        ball.vx > 0
      ) {
        ball.vx = -Math.abs(ball.vx) * 1.02;
        const hitPos = (ball.y - botY) / paddleHeight - 0.5;
        ball.vy += hitPos * 2.5;
      }
    };

    const moveBot = () => {
      if (!gameReady || resetting) return;
      
      botDelayCounter++;
      if (botDelayCounter > 5) {
        const botSpeed = 3;
        const targetY = ball.y - paddleHeight / 2;
        const diff = targetY - botY;
        const imperfection = (Math.random() - 0.5) * 15;
        
        if (Math.abs(diff) > 5) {
          botY += diff > 0 
            ? Math.min(botSpeed, diff) + imperfection 
            : Math.max(-botSpeed, diff) + imperfection;
        }
        botDelayCounter = 0;
      }
    };

    const checkGoals = () => {
      if (resetting) return;
      
      if (ball.x + ball.radius < 0) {
        setScore(0);
        resetBall(true);
      }

      if (ball.x - ball.radius > W) {
        resetBall();
      }
    };

    const gameLoop = () => {
      drawField();
      drawPaddles();
      drawBall();
      moveBall();
      handlePaddleCollisions();
      moveBot();
      checkGoals();

      // Clamp paddles to canvas bounds
      playerY = Math.max(0, Math.min(H - paddleHeight, playerY));
      botY = Math.max(0, Math.min(H - paddleHeight, botY));

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    const movePlayer = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      playerY = e.clientY - rect.top - paddleHeight / 2;
    };

    const handleClick = () => {
      if (!gameActive) startGame();
    };

    canvas.addEventListener('mousemove', movePlayer);
    canvas.addEventListener('click', handleClick);
    gameLoop();

    return () => {
      canvas.removeEventListener('mousemove', movePlayer);
      canvas.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, [highScore]);

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        style={{
          border: '2px solid #4F46E5',
          borderRadius: '8px',
          backgroundColor: '#1E1B4B',
          cursor: gameActive ? 'none' : 'pointer',
        }}
      />
      <div className="mt-2 text-center">
        <p className="text-white text-sm">
          Score: <span className="font-bold text-yellow-300">{score}</span>
        </p>
        {!gameActive && (
          <p className="text-yellow-300 text-xs mt-1 animate-pulse">
            Click to start!
          </p>
        )}
      </div>
    </div>
  );
};

export default AirHockeyGame;