import React, { useEffect, useRef, useState, useCallback } from 'react';
import bg1 from '../../src/assets/music/1.mp3';
import bg2 from '../../src/assets/music/2.mp3';

interface AirHockeyGameProps {
  jwtData?: {
    username?: string;
    // add other fields if needed
  };
}

const AirHockeyGame: React.FC<AirHockeyGameProps> = ({ jwtData }) => {
  const canvasRef = useRef(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [isGamePaused, setIsGamePaused] = useState(false);
  const backgroundMusicRef = useRef(null);

  // Extract username from JWT data or default to "You"
  const username = jwtData ? jwtData.username : "You";

  // List of background music files using imported files
  const backgroundMusicFiles = [bg1, bg2];

  const playBackgroundMusic = useCallback(() => {
    if (!soundOn) return;

    // Clear any existing background music
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.pause();
      backgroundMusicRef.current = null;
    }

    // Randomly select a music file
    const randomIndex = Math.floor(Math.random() * backgroundMusicFiles.length);
    const musicFile = backgroundMusicFiles[randomIndex];

    // Create and play the audio element
    backgroundMusicRef.current = new Audio(musicFile);
    backgroundMusicRef.current.loop = true;
    backgroundMusicRef.current.volume = 0.3; // Set volume lower for background music
    backgroundMusicRef.current.play().catch(e => console.log("Background music play failed:", e));
  }, [soundOn]);

  const playSound = useCallback((type) => {
    if (!soundOn) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch (type) {
      case 'hit':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        break;
      case 'score':
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        break;
      default:
        break;
    }

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
  }, [soundOn]);

  useEffect(() => {
    if (soundOn) {
      playBackgroundMusic();
    } else {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
      }
    }

    return () => {
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
      }
    };
  }, [soundOn, playBackgroundMusic]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to fit the screen
    const resizeCanvas = () => {
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = window.innerHeight * 0.7;
      const ratio = 4 / 3;
      let width = maxWidth;
      let height = width / ratio;

      if (height > maxHeight) {
        height = maxHeight;
        width = height * ratio;
      }

      canvas.width = width;
      canvas.height = height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Simple ball object
    const ball = {
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: 0,
      vy: 0,
      radius: 8
    };

    // Game state
    let gameStarted = false;
    let countdown = 3;
    let countdownInterval = null;

    // Simple player paddle
    let playerY = canvas.height / 2 - 30;
    let botY = canvas.height / 2 - 30;

    // Goal dimensions
    const goalHeight = canvas.height * 0.2;
    const goalWidth = 20;

    const draw = () => {
      // Clear canvas
      ctx.fillStyle = '#1E1B4B';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw playing area
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      // Draw center line
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 20);
      ctx.lineTo(canvas.width / 2, canvas.height - 20);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw center circle
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 30, 0, Math.PI * 2);
      ctx.stroke();

      // Draw goals
      ctx.strokeStyle = '#F59E0B';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2 - goalHeight / 2);
      ctx.lineTo(20, canvas.height / 2 - goalHeight / 2);
      ctx.lineTo(20, canvas.height / 2 + goalHeight / 2);
      ctx.lineTo(0, canvas.height / 2 + goalHeight / 2);
      ctx.stroke();

      ctx.strokeStyle = '#3B82F6';
      ctx.beginPath();
      ctx.moveTo(canvas.width, canvas.height / 2 - goalHeight / 2);
      ctx.lineTo(canvas.width - 20, canvas.height / 2 - goalHeight / 2);
      ctx.lineTo(canvas.width - 20, canvas.height / 2 + goalHeight / 2);
      ctx.lineTo(canvas.width, canvas.height / 2 + goalHeight / 2);
      ctx.stroke();

      // Draw player paddle
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(20, playerY, 10, 60);

      // Draw bot paddle
      ctx.fillStyle = '#22D3EE';
      ctx.fillRect(canvas.width - 30, botY, 10, 60);

      // Draw ball
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#E879F9';
      ctx.fill();

      // Draw score
      ctx.fillStyle = '#FACC15';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(playerScore.toString(), canvas.width / 4, 40);

      ctx.fillStyle = '#22D3EE';
      ctx.fillText(botScore.toString(), canvas.width * 3 / 4, 40);

      // Draw pause overlay if game is paused
      if (isGamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
      }

      // Draw countdown if game hasn't started
      if (!gameStarted && !isGamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        if (countdown > 0) {
          ctx.fillText(countdown.toString(), canvas.width / 2, canvas.height / 2);
        } else {
          ctx.fillText('GO!', canvas.width / 2, canvas.height / 2);
        }

        ctx.font = '16px Arial';
        ctx.fillText('Get Ready!', canvas.width / 2, canvas.height / 2 - 50);
      }
    };

    const update = () => {
      if (gameStarted && !isGamePaused) {
        // Move ball
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Bounce off top/bottom walls
        if (ball.y <= 20 + ball.radius || ball.y >= canvas.height - 20 - ball.radius) {
          ball.vy = -ball.vy;
        }

        // Bounce off paddles with angle based on hit position
        if (ball.x <= 30 + ball.radius && ball.y >= playerY && ball.y <= playerY + 60 && ball.vx < 0) {
          ball.vx = Math.abs(ball.vx);
          const hitPos = (ball.y - (playerY + 30)) / 30;
          ball.vy += hitPos * 2;
          playSound('hit');
        }

        if (ball.x >= canvas.width - 30 - ball.radius && ball.y >= botY && ball.y <= botY + 60 && ball.vx > 0) {
          ball.vx = -Math.abs(ball.vx);
          const hitPos = (ball.y - (botY + 30)) / 30;
          ball.vy += hitPos * 2;
          playSound('hit');
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
        botY = Math.max(20, Math.min(canvas.height - 80, botY));

        // Scoring logic
        if (ball.x < 20) {
          setBotScore(prev => prev + 1);
          playSound('score');
          resetBall();
        }

        if (ball.x > canvas.width - 20) {
          setPlayerScore(prev => prev + 1);
          playSound('score');
          resetBall();
        }
      }
    };

    const resetBall = () => {
      ball.x = canvas.width / 2;
      ball.y = canvas.height / 2;
      ball.vx = 0;
      ball.vy = 0;
      gameStarted = false;
      countdown = 3;

      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }

      startCountdown();
    };

    const startCountdown = () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }

      countdownInterval = setInterval(() => {
        countdown--;

        if (countdown <= 0) {
          clearInterval(countdownInterval);
          countdownInterval = null;

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

    const handleMouseMove = (e) => {
      if (!isGamePaused) {
        const rect = canvas.getBoundingClientRect();
        playerY = e.clientY - rect.top - 30;
        playerY = Math.max(20, Math.min(canvas.height - 80, playerY));
      }
    };

    const handleMouseLeave = () => {
      setIsGamePaused(true);
    };

    const handleMouseEnter = () => {
      setIsGamePaused(false);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('mouseenter', handleMouseEnter);

    startCountdown();
    gameLoop();

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('mouseenter', handleMouseEnter);
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [playerScore, botScore, soundOn, isGamePaused, playSound, playBackgroundMusic]);

  const toggleSound = () => {
    setSoundOn(!soundOn);
  };

  return (
    <div className="flex flex-col items-center bg-gray-900 p-6 rounded-lg shadow-xl">
      <h2 className="text-3xl font-bold text-white mb-4">🏒 Air Hockey</h2>
      <div className="relative">
        <canvas
          ref={canvasRef}
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
          <p className="text-yellow-400 font-bold text-xl">{username}: {playerScore}</p>
        </div>
        <div className="text-center">
          <p className="text-blue-400 font-bold text-xl">Bot: {botScore}</p>
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-gray-400 text-sm mb-2">
          Move your mouse to control the yellow paddle
        </p>
        <button
          onClick={toggleSound}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          {soundOn ? 'Sound: ON' : 'Sound: OFF'}
        </button>
      </div>
    </div>
  );
};

export default AirHockeyGame;
