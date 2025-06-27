import React, { useEffect, useRef, useState } from 'react';

const AirHockeyGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 400;
    canvas.height = 300;

    // Simple ball object
    const ball = {
      x: 200,
      y: 150,
      vx: 0, // Start with no velocity
      vy: 0,
      radius: 8
    };

    // Game state
    let gameStarted = false;
    let countdown = 3;
    let countdownInterval = null;

    // Simple player paddle
    let playerY = 120;
    let botY = 120;

    const draw = () => {
      // Clear canvas
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(0, 0, 400, 300);

      // Draw center line
      ctx.strokeStyle = '#374151';
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(200, 0);
      ctx.lineTo(200, 300);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw goals
      ctx.strokeStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(0, 100);
      ctx.lineTo(0, 200);
      ctx.stroke();

      ctx.strokeStyle = '#3B82F6';
      ctx.beginPath();
      ctx.moveTo(400, 100);
      ctx.lineTo(400, 200);
      ctx.stroke();

      // Draw player paddle
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(10, playerY, 10, 60);

      // Draw bot paddle
      ctx.fillStyle = '#22D3EE';
      ctx.fillRect(380, botY, 10, 60);

      // Draw ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#E879F9';
      ctx.fill();

      // Draw score
      ctx.fillStyle = '#FACC15';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(playerScore.toString(), 100, 30);

      ctx.fillStyle = '#22D3EE';
      ctx.fillText(botScore.toString(), 300, 30);

      // Draw countdown if game hasn't started
      if (!gameStarted) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, 400, 300);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        if (countdown > 0) {
          ctx.fillText(countdown.toString(), 200, 170);
        } else {
          ctx.fillText('GO!', 200, 170);
        }
        
        ctx.font = '16px Arial';
        ctx.fillText('Get Ready!', 200, 120);
      }
    };

    const update = () => {
      // Only move ball if game has started
      if (gameStarted) {
        // Move ball
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Bounce off top/bottom walls
        if (ball.y <= ball.radius || ball.y >= 300 - ball.radius) {
          ball.vy = -ball.vy;
        }

        // Bounce off paddles with angle based on hit position
        // Player paddle collision
        if (ball.x <= 20 + ball.radius && ball.y >= playerY && ball.y <= playerY + 60 && ball.vx < 0) {
          ball.vx = Math.abs(ball.vx);
          // Add angle based on where ball hits paddle
          const hitPos = (ball.y - (playerY + 30)) / 30; // -1 to 1
          ball.vy += hitPos * 2;
        }

        // Bot paddle collision  
        if (ball.x >= 380 - ball.radius && ball.y >= botY && ball.y <= botY + 60 && ball.vx > 0) {
          ball.vx = -Math.abs(ball.vx);
          // Add angle based on where ball hits paddle
          const hitPos = (ball.y - (botY + 30)) / 30; // -1 to 1
          ball.vy += hitPos * 2;
        }

        // Simple bot AI - follow ball with some delay
        const botSpeed = 2;
        const targetY = ball.y - 30;
        if (Math.abs(targetY - botY) > 5) {
          if (targetY > botY) {
            botY += botSpeed;
          } else {
            botY -= botSpeed;
          }
        }
        // Keep bot paddle in bounds
        botY = Math.max(0, Math.min(240, botY));

        // Scoring
        if (ball.x < 0) {
          if (ball.y >= 100 && ball.y <= 200) {
            setBotScore(prev => prev + 1);
          }
          resetBall();
        }

        if (ball.x > 400) {
          if (ball.y >= 100 && ball.y <= 200) {
            setPlayerScore(prev => prev + 1);
          }
          resetBall();
        }
      }
    };

    const resetBall = () => {
      ball.x = 200;
      ball.y = 150;
      ball.vx = 0;
      ball.vy = 0;
      gameStarted = false;
      countdown = 3;
      
      // Clear any existing countdown
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
      
      startCountdown();
    };

    const startCountdown = () => {
      // Clear any existing interval first
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      
      countdownInterval = setInterval(() => {
        countdown--;
        
        if (countdown <= 0) {
          clearInterval(countdownInterval);
          countdownInterval = null;
          
          // Start the ball moving
          ball.vx = Math.random() > 0.5 ? 3 : -3;
          ball.vy = Math.random() * 4 - 2;
          gameStarted = true;
        }
      }, 1000);
    };

    const gameLoop = () => {
      update();
      draw();
      requestAnimationFrame(gameLoop);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      playerY = e.clientY - rect.top - 30;
      playerY = Math.max(0, Math.min(240, playerY));
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    
    // Start the initial countdown
    startCountdown();
    
    // Start the game loop
    gameLoop();

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      // Clean up countdown interval
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center bg-gray-900 p-6 rounded-lg shadow-xl">
      <h2 className="text-3xl font-bold text-white mb-2">🏒 Air Hockey</h2>
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          style={{
            border: '4px solid #4F46E5',
            borderRadius: '10px',
            backgroundColor: '#1E1B4B',
            cursor: 'none',
            display: 'block',
            boxShadow: '0 0 20px rgba(79, 70, 229, 0.5)'
          }}
        />
      </div>
      <div className="flex justify-between w-full mt-4 px-4">
        <div className="text-center">
          <p className="text-yellow-400 font-bold text-xl">Player: {playerScore}</p>
        </div>
        <div className="text-center">
          <p className="text-blue-400 font-bold text-xl">Bot: {botScore}</p>
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-gray-400 text-sm">
          Move your mouse to control the yellow paddle
        </p>
      </div>
    </div>
  );
};

export default AirHockeyGame;