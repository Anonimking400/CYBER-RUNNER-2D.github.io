/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/engine';
import { GameState, LeaderboardEntry, PowerUpType } from '../game/types';
import { synths } from '../game/audio';
import { 
  Play, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Pause, 
  Gamepad2, 
  Shield, 
  Zap, 
  Flame, 
  Crosshair, 
  Trophy, 
  Heart, 
  Compass, 
  UserPlus 
} from 'lucide-react';

export default function GameBoard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Sound Config States
  const [masterVol, setMasterVol] = useState<number>(0.5);
  const [musicVol, setMusicVol] = useState<number>(0.4);
  const [sfxVol, setSfxVol] = useState<number>(0.6);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  // AutoRun (Continuous automated running) State
  const [autoRun, setAutoRun] = useState<boolean>(() => {
    const saved = localStorage.getItem('cyber_runner_autorun');
    return saved === null ? true : saved === 'true';
  });
  
  // Platform movement option state (Moving vs Static platforms toggle)
  const [platformsMoving, setPlatformsMoving] = useState<boolean>(true);

  // Leaderboard input state
  const [playerName, setPlayerName] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [scoreSubmitted, setScoreSubmitted] = useState<boolean>(false);

  // Mobile virtual touch button states (tracked to maintain smooth hold down/up)
  const [touchLeft, setTouchLeft] = useState(false);
  const [touchRight, setTouchRight] = useState(false);
  const [touchJump, setTouchJump] = useState(false);
  
  // Active sector tab for the 50 level grid: 
  // 1: Emerald (1-10), 2: Amber (11-20), 3: Cyan (21-30), 4: Rose (31-40), 5: Purple (41-50)
  const [activeSector, setActiveSector] = useState<number>(1);

  // Monitor physical viewport orientation
  const [isPortrait, setIsPortrait] = useState<boolean>(false);

  // Dynamic screen scaling dimensions to support extreme responsiveness on both mobile and PC/laptops
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 450 });

  useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const isPort = windowHeight > windowWidth;
      setIsPortrait(isPort);

      // Responsive margin allowance
      let paddingX = windowWidth < 640 ? 12 : 36;
      
      // Calculate active page state details from the engine ref directly
      const isPlaying = engineRef.current?.state?.hasStarted && !engineRef.current?.state?.isGameOver;
      
      let paddingY = 135; // default PC/laptop clearance
      if (isPort) {
        paddingY = 32;
      } else if (windowHeight < 550) {
        // landscape mobile
        paddingY = isPlaying ? 12 : 36;
      } else {
        // landscape laptop/desktop
        paddingY = isPlaying ? 48 : 125;
      }

      const maxAvailWidth = windowWidth - paddingX;
      const maxAvailHeight = windowHeight - paddingY;

      // Fit to 16:9 container keeping proportions intact
      let w = maxAvailWidth;
      let h = (w * 9) / 16;

      if (h > maxAvailHeight) {
        h = maxAvailHeight;
        w = (h * 16) / 9;
      }

      // Hard ceiling clamp of 850px to retain the polished cyber outline
      if (w > 850) {
        w = 850;
        h = (850 * 9) / 16;
      }

      // Safe floor limit
      if (w < 280) {
        w = 280;
        h = (280 * 9) / 16;
      }

      setDimensions({
        width: Math.floor(w),
        height: Math.floor(h)
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [gameState?.hasStarted, gameState?.isGameOver]);

  // Attempt to lock physical screen orientation to landscape
  const requestLandscapeAndFullscreen = async () => {
    try {
      const element = document.documentElement;
      const requestFS = element.requestFullscreen || 
                        (element as any).webkitRequestFullscreen || 
                        (element as any).mozRequestFullScreen || 
                        (element as any).msRequestFullscreen;
                        
      if (requestFS) {
        await requestFS.call(element);
      }
      
      const screenObj = window.screen as any;
      if (screenObj.orientation && screenObj.orientation.lock) {
        await screenObj.orientation.lock('landscape');
      } else if (screenObj.lockOrientation) {
        screenObj.lockOrientation('landscape');
      } else if (screenObj.mozLockOrientation) {
        screenObj.mozLockOrientation('landscape');
      } else if (screenObj.msLockOrientation) {
        screenObj.msLockOrientation('landscape');
      }
    } catch (err) {
      console.warn('Orientation lock / Fullscreen request declined or unsupported on this device:', err);
    }
  };

  // Track the unlocked stages dynamically
  const [unlockedLevel, setUnlockedLevel] = useState<number>(() => {
    const saved = localStorage.getItem('cyber_runner_unlocked_level');
    return saved ? parseInt(saved, 10) : 1;
  });

  // On page load, initialize leaderboard from localstorage
  useEffect(() => {
    const savedLeaderboard = localStorage.getItem('2d_platformer_leaderboard');
    if (savedLeaderboard) {
      try {
        setLeaderboard(JSON.parse(savedLeaderboard));
      } catch (e) {
        console.error('Failed to parse leaderboard from local storage');
      }
    }

    // Set up standard game engine closure callback
    const engine = new GameEngine((state: GameState) => {
      // Receive reactive state updates from game loop
      setGameState({ ...state });

      // Save level progress if higher level than currently unlocked
      if (state.currentLevel > 1) {
        setUnlockedLevel(prev => {
          const nextVal = Math.max(prev, state.currentLevel);
          localStorage.setItem('cyber_runner_unlocked_level', nextVal.toString());
          return nextVal;
        });
      }
    });
    engineRef.current = engine;

    return () => {
      engine.stopEngine();
    };
  }, []);

  // Sync virtual screen touch press with engine keys map
  useEffect(() => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    
    // Wire touch buttons to the internal keyboard listener keys object
    (engine as any).keys['ArrowLeft'] = touchLeft;
    (engine as any).keys['KeyA'] = touchLeft;
    (engine as any).keys['ArrowRight'] = touchRight;
    (engine as any).keys['KeyD'] = touchRight;
    (engine as any).keys['Space'] = touchJump;
    (engine as any).keys['ArrowUp'] = touchJump;
    (engine as any).keys['KeyW'] = touchJump;
  }, [touchLeft, touchRight, touchJump]);

  // Sync autoRun option state directly to active engine instance
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.autoRun = autoRun;
    }
  }, [autoRun]);

  // Sync platformsMoving option state directly to active engine instance
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.platformsMovingMode = platformsMoving;
    }
  }, [platformsMoving]);

  const handleStartGame = (level: number = 1) => {
    if (!engineRef.current || !canvasRef.current) return;
    
    // Attempt auto-landscape orientation lock on mobile tap
    requestLandscapeAndFullscreen();
    
    // Apply pre-start audio levels
    synths.init();
    synths.setMasterVolume(isMuted ? 0 : masterVol);
    synths.setMusicVolume(musicVol);
    synths.setSfxVolume(sfxVol);

    engineRef.current.autoRun = autoRun;
    engineRef.current.platformsMovingMode = platformsMoving;
    engineRef.current.init(canvasRef.current);
    engineRef.current.startGame(level);
    setScoreSubmitted(false);
    setPlayerName('');
  };

  const handlePauseToggle = () => {
    if (!engineRef.current) return;
    engineRef.current.togglePause();
  };

  const handleVolumeChange = (type: 'master' | 'music' | 'sfx', val: number) => {
    if (type === 'master') {
      setMasterVol(val);
      if (!isMuted) synths.setMasterVolume(val);
    } else if (type === 'music') {
      setMusicVol(val);
      synths.setMusicVolume(val);
    } else {
      setSfxVol(val);
      synths.setSfxVolume(val);
    }
  };

  const handleMuteToggle = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    synths.setMasterVolume(nextMuted ? 0 : masterVol);
  };

  const handleSubmitScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !gameState) return;

    const newEntry: LeaderboardEntry = {
      name: playerName.trim().substring(0, 15),
      score: gameState.score,
      level: gameState.currentLevel,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    const updatedLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Keep top 10

    setLeaderboard(updatedLeaderboard);
    localStorage.setItem('2d_platformer_leaderboard', JSON.stringify(updatedLeaderboard));
    setScoreSubmitted(true);
  };

  const clearScores = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua rekor skor?')) {
      localStorage.removeItem('2d_platformer_leaderboard');
      localStorage.removeItem('2d_platformer_high_score');
      setLeaderboard([]);
      if (gameState && engineRef.current) {
        engineRef.current.state.player.highScore = 0;
        setGameState({ ...engineRef.current.state });
      }
    }
  };

  const handleExitGame = () => {
    if (engineRef.current) {
      engineRef.current.stopEngine();
    }
    setGameState(null);
  };

  const resetLevelProgress = () => {
    if (window.confirm('Apakah Anda yakin ingin menyetel ulang semua tingkat perjalanan? Level 2 dan 3 akan terkunci kembali.')) {
      localStorage.setItem('cyber_runner_unlocked_level', '1');
      setUnlockedLevel(1);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center p-2 sm:p-6" id="game-container-wrapper">
      {/* Title Header Section - auto-hides when actively playing to save vertical mobile space */}
      {(!gameState || !gameState.hasStarted || gameState.isGameOver) && (
        <div className="text-center mb-3 transition-all duration-300 transform scale-90 sm:scale-100" id="game-title-header">
          <h1 className="text-2xl sm:text-5xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-indigo-500 font-sans [text-shadow:_0_2px_15px_rgba(34,197,94,0.4)]">
            CYBER RUNNER 2D
          </h1>
          <p className="text-[10px] sm:text-sm text-slate-400 mt-1 font-mono tracking-widest">
            LEVEL METRIC & ADAPTIVE SYNTHESIZER BEAT
          </p>
        </div>
      )}

      {/* Main Screen Container - Bound to precise landscape width aspect, max width constraint */}
      <div 
        ref={containerRef}
        className="relative bg-slate-950 border-2 sm:border-4 border-slate-800 rounded-xl sm:rounded-2xl overflow-hidden shadow-[0_0_35px_rgba(0,0,0,0.8)] flex items-center justify-center"
        style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
        id="game-aspect-viewport"
      >
        {/* Extreme Responsive: Immersive Orientation Helper Overlay */}
        {isPortrait && (
          <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center z-50 animate-fade-in" id="mobile-orientation-lock-overlay">
            <div className="flex flex-col items-center max-w-sm" id="orientation-lock-card">
              
              {/* Animated Phone Rotation Graphic */}
              <div className="relative w-18 h-18 mb-4 flex items-center justify-center" id="phone-rotate-anim">
                {/* Outter Ring */}
                <div className="absolute inset-0 rounded-full border border-dashed border-[#00f3ff]/40 animate-[spin_12s_linear_infinite]" />
                
                {/* SVG Rotating Device */}
                <div className="relative animate-[bounce_2s_infinite] flex items-center justify-center">
                  <svg className="w-10 h-10 text-[#ff00ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}>
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </div>
                {/* Arrow indicator */}
                <div className="absolute right-0 top-1 text-[#00f3ff] text-xs font-bold font-mono animate-pulse">🔄</div>
              </div>

              <span className="text-xs text-[#00f3ff] font-bold tracking-widest font-mono uppercase bg-indigo-950/60 border border-indigo-500/40 px-3 py-1 rounded-full mb-3 shadow-[0_0_12px_rgba(34,197,94,0.15)]">
                📱 MEMBUTUHKAN MODE LANSKAP
              </span>

              <h2 className="text-lg font-black text-white uppercase tracking-wider font-mono">
                PUTAR LAYAR ANDA
              </h2>
              
              <p className="text-slate-405 text-[11px] font-sans mt-2 leading-relaxed">
                Cyber Runner 2D membutuhkan orientasi <strong>Lanskap (Mendatar)</strong> agar game dan kontrol virtual dapat dimainkan dengan nyaman.
              </p>

              <button
                onClick={requestLandscapeAndFullscreen}
                className="mt-5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 active:from-emerald-600 active:to-teal-600 text-slate-950 font-mono font-black text-[10px] tracking-widest rounded-xl transition-all cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)] hover:scale-105 active:scale-95 flex items-center gap-2"
                id="btn-rotate-fullscreen-lock"
              >
                <span>🔄 KUNCI LANSKAP OTOMATIS</span>
              </button>

              <p className="text-[9px] text-slate-550 font-mono mt-3 leading-tight text-slate-500">
                *Atau aktifkan "Putar Otomatis" di setelan cepat ponsel Anda.
              </p>
            </div>
          </div>
        )}

        {/* Immersive 3D scrolling vector grid underlay */}
        <div className="grid-bg-underlay">
          <div className="grid-bg"></div>
        </div>

        {/* Game Canvas */}
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          className="w-full h-full object-cover relative z-10"
          id="game-board-canvas"
        />

        {/* 1. HUD heads-up-display overlay (renders during gameplay) */}
        {gameState && gameState.hasStarted && !gameState.isGameOver && (
          <div className="absolute inset-0 p-3 pointer-events-none select-none font-sans z-20 flex flex-col justify-between" id="game-hud-overlay">
            
            {/* Top row: HP, Score, Level and KELUAR Button with dynamic gameplay configuration controls */}
            <div className="flex flex-col gap-1.5 w-full pointer-events-auto">
              <div className="flex justify-between items-start w-full">
                
                {/* Left HUD: HP Vitals */}
                <div className="cyber-stat-box flex items-center gap-2 py-1.5 px-3 bg-slate-950/70" style={{ borderLeftColor: '#10b981' }}>
                  <Heart className="w-3.5 h-3.5 text-emerald-400 animate-pulse fill-emerald-400/20" />
                  <div className="flex flex-col">
                    <span className="text-[8px] text-[#10b981] font-bold uppercase tracking-widest leading-none mb-0.5">HP</span>
                    <div className="w-16 sm:w-20 bg-[#151525] h-1.5 rounded overflow-hidden border border-slate-800">
                      <div 
                        className="bg-gradient-to-r from-red-500 via-orange-400 to-emerald-400 h-full transition-all duration-200"
                        style={{ width: `${gameState.player.hp}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-white font-mono font-black">{gameState.player.hp}%</span>
                </div>

                {/* Center HUD: Score & Level information label */}
                <div className="flex gap-1.5 sm:gap-2">
                  <div className="cyber-stat-box flex items-center gap-1.5 py-1 px-2.5 sm:px-3 bg-slate-950/70 animate-pulse" style={{ borderLeftColor: '#f43f5e' }}>
                    <div>
                      <span className="text-[7.5px] text-[#f43f5e] font-black uppercase tracking-widest leading-none block mb-0.5">TINGKAT</span>
                      <div className="text-xs sm:text-sm font-mono font-black text-[#f43f5e] leading-none">
                        LVL {gameState.currentLevel}
                      </div>
                    </div>
                  </div>

                  <div className="cyber-stat-box flex items-center gap-1.5 py-1 px-2.5 sm:px-3 bg-slate-950/70" style={{ borderLeftColor: '#00f3ff' }}>
                    <div>
                      <span className="text-[7.5px] text-[#00f3ff] font-black uppercase tracking-widest leading-none block mb-0.5">SKOR</span>
                      <div className="text-xs sm:text-sm font-mono font-black text-white leading-none">
                        {gameState.score.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right HUD: Exit Button */}
                <button 
                  onClick={handleExitGame}
                  className="px-3 py-1.5 bg-rose-950/90 hover:bg-rose-900 border border-rose-500/50 hover:border-rose-405 text-rose-200 font-mono text-[9px] font-extrabold transition-all cursor-pointer shadow-[0_0_10px_rgba(244,63,94,0.15)] flex items-center gap-1 hover:scale-105 rounded-lg"
                  title="Keluar dari level saat ini dan kembali ke menu utama"
                  id="btn-quit-match"
                >
                  ◀ KELUAR
                </button>
              </div>

              {/* Quick Config Toggles below the main stats bar */}
              <div className="flex gap-2 self-start items-center bg-slate-950/80 border border-slate-800/60 rounded-lg p-1 px-2 max-w-full overflow-x-auto" id="top-quick-toggles-bar">
                <span className="text-[7px] text-slate-500 font-mono tracking-wider font-extrabold mr-1 uppercase">SISTEM:</span>
                
                {/* AutoRun Sprint Toggle */}
                <button
                  onClick={() => {
                    const next = !autoRun;
                    setAutoRun(next);
                    localStorage.setItem('cyber_runner_autorun', String(next));
                  }}
                  className={`px-2 py-0.5 text-[8px] rounded font-mono font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                    autoRun 
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-black shadow-[0_0_6px_rgba(16,185,129,0.2)]' 
                      : 'bg-[#0f0e21]/90 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                  id="hud-toggle-autorun-ingame"
                >
                  <span>🏃🏃‍♂️</span>
                  <span>{autoRun ? 'LARI: OTOMATIS' : 'LARI: MANUAL'}</span>
                </button>

                {/* Platform Motion Toggle */}
                <button
                  onClick={() => {
                    const next = !platformsMoving;
                    setPlatformsMoving(next);
                  }}
                  className={`px-2 py-0.5 text-[8px] rounded font-mono font-extrabold border transition-all cursor-pointer flex items-center gap-1 ${
                    platformsMoving
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 font-black shadow-[0_0_6px_rgba(6,182,212,0.2)]' 
                      : 'bg-[#fb7185]/15 border-[#fb7185]/40 text-[#fb7185]'
                  }`}
                  id="hud-toggle-moving-platforms-ingame"
                >
                  <span>⚙️</span>
                  <span>{platformsMoving ? 'PLATFORM: BERGERAK' : 'PLATFORM: DIAM'}</span>
                </button>
              </div>
            </div>            {/* Bottom Row Touch Screen Controls Overlay */}
            <div className="pointer-events-none select-none z-30 flex justify-between items-end w-full px-2 pb-2 sm:px-4 sm:pb-3" id="android-virtual-controls">
              
              {/* Left D-Pad: Move Left & Move Right */}
              <div className="flex gap-2 pointer-events-auto" id="virtual-dpad-left">
                <button
                  disabled={autoRun}
                  onMouseDown={() => !autoRun && setTouchLeft(true)}
                  onMouseUp={() => !autoRun && setTouchLeft(false)}
                  onMouseLeave={() => !autoRun && setTouchLeft(false)}
                  onTouchStart={(e) => { e.preventDefault(); !autoRun && setTouchLeft(true); }}
                  onTouchEnd={(e) => { e.preventDefault(); !autoRun && setTouchLeft(false); }}
                  className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center bg-[#090915]/90 border-2 ${
                    autoRun 
                      ? 'border-slate-900/40 text-slate-700/30 opacity-20 cursor-not-allowed' 
                      : touchLeft
                        ? 'border-[#00f3ff] text-[#00f3ff] bg-[#00f3ff]/20 shadow-[0_0_15px_rgba(0,243,255,0.5)] scale-90' 
                        : 'border-slate-800 text-slate-300 hover:border-slate-650'
                  } transition-all`}
                  title="Gerak Kiri (Nonaktif saat Autorun)"
                  id="touch-btn-left"
                >
                  <span className="text-sm sm:text-xl font-bold leading-none">◀</span>
                  <span className="text-[6px] sm:text-[7px] font-mono font-bold tracking-widest mt-0.5">KIRI</span>
                </button>
 
                <button
                  disabled={autoRun}
                  onMouseDown={() => !autoRun && setTouchRight(true)}
                  onMouseUp={() => !autoRun && setTouchRight(false)}
                  onMouseLeave={() => !autoRun && setTouchRight(false)}
                  onTouchStart={(e) => { e.preventDefault(); !autoRun && setTouchRight(true); }}
                  onTouchEnd={(e) => { e.preventDefault(); !autoRun && setTouchRight(false); }}
                  className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center bg-[#090915]/90 border-2 ${
                    autoRun
                      ? 'border-[#10b981]/50 text-[#10b981] bg-[#10b981]/15 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse'
                      : touchRight 
                        ? 'border-[#00f3ff] text-[#00f3ff] bg-[#00f3ff]/20 shadow-[0_0_15px_rgba(0,243,255,0.5)] scale-90' 
                        : 'border-slate-800 text-slate-300 hover:border-[#00f3ff]/40'
                  } transition-all`}
                  title={autoRun ? 'Berlari Otomatis Aktif' : 'Gerak Kanan'}
                  id="touch-btn-right"
                >
                  <span className="text-sm sm:text-xl font-bold leading-none">▶</span>
                  <span className="text-[6px] sm:text-[7px] font-mono font-bold tracking-widest mt-0.5">{autoRun ? 'AUTO' : 'KANAN'}</span>
                </button>
              </div>
 
              {/* Right Tactical Buttons: Jump and Fire Blasters */}
              <div className="flex gap-2 pointer-events-auto" id="virtual-actions-right">
                {/* Attack / Fire Laser */}
                <button
                  onMouseDown={() => engineRef.current?.shoot()}
                  onTouchStart={(e) => { e.preventDefault(); engineRef.current?.shoot(); }}
                  className="w-11 h-11 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center bg-[#090915]/92 border-2 border-rose-500/60 active:border-rose-400 active:text-rose-450 active:bg-rose-500/20 active:shadow-[0_0_15px_rgba(244,63,94,0.45)] text-slate-300 font-bold transition-all cursor-pointer select-none active:scale-90"
                  title="Tembak Laser"
                  id="touch-btn-shoot"
                >
                  <Crosshair className="w-3 h-3 sm:w-4 sm:h-4 mb-0.5 text-rose-400 animate-pulse" />
                  <span className="text-[6px] sm:text-[7px] font-mono tracking-widest leading-none">TEMBAK</span>
                </button>
 
                {/* Jump Trigger */}
                <button
                  onMouseDown={() => { setTouchJump(true); engineRef.current?.jump(); }}
                  onMouseUp={() => setTouchJump(false)}
                  onMouseLeave={() => setTouchJump(false)}
                  onTouchStart={(e) => { e.preventDefault(); setTouchJump(true); engineRef.current?.jump(); }}
                  onTouchEnd={(e) => { e.preventDefault(); setTouchJump(false); }}
                  className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center border-2 text-slate-200 font-bold transition-all cursor-pointer select-none active:scale-90 shadow-lg ${
                    touchJump 
                      ? 'border-[#ff00ff] bg-[#db2777]/30 text-[#ff00ff] shadow-[0_0_18px_rgba(255,0,255,0.6)]' 
                      : 'border-[#ff00ff]/70 bg-[#da2777]/10 active:bg-[#db2777]/25'
                  }`}
                  title="Lompat (Jump)"
                  id="touch-btn-jump"
                >
                  <Compass className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5 text-pink-400" />
                  <span className="text-[7px] sm:text-[8px] font-mono tracking-widest leading-none">LOMPAT</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Screen State: MAIN MENU LEVEL SELECTION SCREEN */}
        {(!gameState || !gameState.hasStarted) && (
          <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-center text-slate-100 font-sans overflow-y-auto z-30" id="start-screen-overlay">
            <div className="w-full max-w-[720px] bg-[#090911]/92 border border-[#00f3ff]/30 rounded-2xl p-4 sm:p-5 shadow-[0_0_30px_rgba(0,243,255,0.15)] relative" id="start-menu-card">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ff00ff]/20 border border-[#ff00ff] text-[#ff00ff] text-[9px] font-mono px-3 py-0.5 rounded-full uppercase tracking-widest font-black animate-pulse">
                CYBER ROADWAY LEVEL SELECT
              </div>

              {/* Title Header with interactive orientation warning */}
              <div className="mb-4">
                {isPortrait && (
                  <div className="mb-2.5 bg-indigo-950/40 border border-indigo-500/30 p-2 rounded-lg text-center leading-tight scale-95" id="portrait-alert-lobby">
                    <span className="text-[10px] text-[#00f3ff] font-bold tracking-wider font-mono">📱 REKOMENDASI LANSKAP (MENYAMPING)</span>
                    <p className="text-[9px] text-slate-300 mt-0.5">Putar ponsel secara mendatar untuk pengalaman visual terbaik!</p>
                  </div>
                )}
                <h2 className="text-xl sm:text-2xl font-black text-[#00f3ff] uppercase tracking-widest font-mono [text-shadow:_0_0_10px_rgba(0,243,255,0.4)]">
                  PILIH TINGKAT PERJALANAN
                </h2>
                <p className="text-slate-400 text-[11px] font-mono mt-1 leading-normal max-w-xl mx-auto">
                  Selesaikan level sebelumnya untuk membuka kunci tingkat perjalanan yang lebih tinggi!
                </p>
              </div>

              {/* Sector Tabs Bar */}
              <div className="flex flex-wrap gap-1 mb-3.5 justify-center font-mono text-[8px] sm:text-[9.5px] font-black" id="sector-selector-tabs">
                {[
                  { id: 1, name: 'SEKTOR 1: ALPHA', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20 shadow-[0_0_8px_rgba(16,185,129,0.15)]', active: 'border-emerald-500 bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.4)]' },
                  { id: 2, name: 'SEKTOR 2: BETA', color: 'border-amber-500/30 text-amber-400 bg-amber-950/20 shadow-[0_0_8px_rgba(245,158,11,0.15)]', active: 'border-amber-500 bg-amber-500 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]' },
                  { id: 3, name: 'SEKTOR 3: DELTA', color: 'border-cyan-500/30 text-cyan-400 bg-cyan-950/20 shadow-[0_0_8px_rgba(6,182,212,0.15)]', active: 'border-cyan-500 bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.4)]' },
                  { id: 4, name: 'SEKTOR 4: GAMMA', color: 'border-rose-500/30 text-rose-400 bg-rose-950/20 shadow-[0_0_8px_rgba(244,63,94,0.15)]', active: 'border-rose-500 bg-rose-500 text-slate-950 shadow-[0_0_15px_rgba(244,63,94,0.4)]' },
                  { id: 5, name: 'SEKTOR 5: OMEGA', color: 'border-pink-500/30 text-pink-400 bg-pink-950/20 shadow-[0_0_8px_rgba(236,72,153,0.15)]', active: 'border-pink-500 bg-pink-500 text-slate-950 shadow-[0_0_15px_rgba(236,72,153,0.4)]' }
                ].map(sec => {
                  const isActive = activeSector === sec.id;
                  const hasUnlockedLevelInSector = unlockedLevel >= (sec.id - 1) * 10 + 1;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => { if (hasUnlockedLevelInSector) setActiveSector(sec.id); }}
                      disabled={!hasUnlockedLevelInSector}
                      className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded-md border transition-all cursor-pointer ${
                        isActive 
                          ? sec.active
                          : hasUnlockedLevelInSector
                            ? `${sec.color} hover:brightness-110`
                            : 'border-slate-900 bg-slate-950/40 text-slate-600 cursor-not-allowed opacity-45'
                      }`}
                      id={`sector-tab-${sec.id}`}
                    >
                      {sec.name} {!hasUnlockedLevelInSector && '🔒'}
                    </button>
                  );
                })}
              </div>

              {/* Active Sector Levels Grid */}
              <div className="grid grid-cols-2 min-[480px]:grid-cols-5 gap-2 mb-4 max-h-[195px] overflow-y-auto pr-1" id="level-selection-grid">
                {Array.from({ length: 10 }, (_, idx) => {
                  const levelNum = (activeSector - 1) * 10 + idx + 1;
                  const isUnlocked = levelNum <= unlockedLevel;
                  
                  // Get sector theme parameters
                  const dist = 1000 + (levelNum - 1) * 200;
                  const speedMult = (3.2 + (levelNum - 1) * 0.08).toFixed(1);

                  const names = [
                    'DELTA STATION', 'CYAN REEF', 'SYNTH CORE', 'MATRIX VENT', 
                    'OMEGA OUTPOST', 'SOLARIS DOCK', 'MATRIX OUTPOST', 'SOLARIS DOCKING',
                    'CHRONO CHAMBER', 'STATION VECTORS', 'QUANTUM SECTORS', 'ALPHA TERMINAL'
                  ];
                  const levelName = `${names[(levelNum - 1) % names.length]} ${String(levelNum).padStart(2, '0')}`;

                  let sectorAccent = 'border-emerald-555/35 hover:border-emerald-400 bg-emerald-950/10 text-emerald-400 hover:shadow-[0_0_8px_rgba(16,185,129,0.2)]';
                  let btnBg = 'bg-[#10b981] text-slate-950 hover:brightness-110 active:opacity-90';
                  
                  if (activeSector === 2) {
                    sectorAccent = 'border-amber-500/35 hover:border-amber-400 bg-amber-950/10 text-amber-400 hover:shadow-[0_0_8px_rgba(245,158,11,0.2)]';
                    btnBg = 'bg-[#f59e0b] text-slate-950 hover:brightness-110 active:opacity-90';
                  } else if (activeSector === 3) {
                    sectorAccent = 'border-cyan-500/35 hover:border-cyan-400 bg-cyan-950/10 text-cyan-400 hover:shadow-[0_0_8px_rgba(6,182,212,0.2)]';
                    btnBg = 'bg-[#06b6d4] text-slate-950 hover:brightness-110 active:opacity-90';
                  } else if (activeSector === 4) {
                    sectorAccent = 'border-rose-500/35 hover:border-rose-400 bg-rose-950/10 text-rose-400 hover:shadow-[0_0_8px_rgba(244,63,94,0.2)]';
                    btnBg = 'bg-[#f43f5e] text-slate-950 hover:brightness-110 active:opacity-90';
                  } else if (activeSector === 5) {
                    sectorAccent = 'border-pink-500/35 hover:border-pink-400 bg-pink-950/10 text-pink-400 hover:shadow-[0_0_8px_rgba(236,72,153,0.2)]';
                    btnBg = 'bg-[#ec4899] text-slate-950 hover:brightness-110 active:opacity-90';
                  }

                  return (
                    <div 
                      key={levelNum} 
                      className={`border p-2 rounded-xl flex flex-col justify-between items-center transition-all duration-200 relative ${
                        isUnlocked 
                          ? `${sectorAccent}`
                          : 'border-slate-900 bg-slate-950/35 text-slate-500 opacity-60'
                      }`}
                      id={`level-card-${levelNum}`}
                    >
                      <div className="absolute top-1 left-1.5 text-[7px] font-mono leading-none tracking-widest text-slate-400 font-black">
                        LVL {String(levelNum).padStart(2, '0')}
                      </div>

                      {isUnlocked && (
                        <div className="absolute top-1 right-1 bg-emerald-500/20 text-emerald-450 text-[6px] font-mono font-bold px-1 py-0.5 rounded leading-none">
                          OPEN
                        </div>
                      )}

                      <div className="mt-3.5 flex flex-col items-center w-full">
                        <span className="text-base select-none leading-none mb-1">
                          {activeSector === 1 ? '🏙️' : activeSector === 2 ? '🏜️' : activeSector === 3 ? '🌌' : activeSector === 4 ? '🛰️' : '🌀'}
                        </span>
                        
                        <h4 className="font-extrabold text-[9px] font-mono tracking-tighter truncate w-full text-center leading-tight">
                          {levelName.split(' ')[0]}
                        </h4>
                        
                        <p className="text-[7.5px] text-slate-405 mt-1 font-mono tracking-tight text-center leading-normal">
                          {dist}m • Spd {speedMult}x
                        </p>
                      </div>

                      {isUnlocked ? (
                        <button
                          onClick={() => handleStartGame(levelNum)}
                          className={`w-full mt-2.5 py-1 font-mono font-black text-[8px] tracking-wider rounded transition-all cursor-pointer hover:scale-105 active:scale-95 ${btnBg}`}
                        >
                          MAINKAN
                        </button>
                      ) : (
                        <div className="w-full mt-2.5 py-1 bg-slate-950 border border-slate-900 text-slate-600 font-mono font-extrabold text-[7.5px] rounded text-center select-none flex items-center justify-center gap-0.5">
                          <span>🔒 KUNCI</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sound parameters section */}
              <div className="bg-[#0f0e21]/45 border border-[#00f3ff]/10 p-2.5 rounded-xl text-xs flex flex-col gap-2 font-mono text-left" id="start-menu-audio-settings">
                <div className="flex justify-between items-center text-slate-350 font-bold">
                  <span className="flex items-center gap-1.5 text-slate-205"><Volume2 className="w-3.5 h-3.5 text-[#00f3ff]" /> UNIT PENYETELAN SUARA SYNTH</span>
                  <button 
                    onClick={handleMuteToggle}
                    className="text-[9px] text-[#ff00ff] hover:text-[#ff33ff] hover:underline px-1.5 py-0.5 rounded transition-all bg-[#ff00ff]/5 border border-[#ff00ff]/20 font-black cursor-pointer"
                  >
                    {isMuted ? 'SUARA: NONAKTIF' : 'SUARA: AKTIF'}
                  </button>
                </div>
                
                {/* AutoRun continuous running mechanics toggle */}
                <div className="flex justify-between items-center text-slate-350 font-bold border-b border-slate-900/60 pb-2 mb-1">
                  <span className="flex items-center gap-1.5 text-slate-205">⚡ MODE LARI HERO (AUTORUN)</span>
                  <button 
                    onClick={() => {
                      const next = !autoRun;
                      setAutoRun(next);
                      localStorage.setItem('cyber_runner_autorun', String(next));
                    }}
                    className={`text-[9px] px-2 py-0.5 rounded transition-all font-black cursor-pointer border ${
                      autoRun 
                        ? 'text-emerald-400 bg-emerald-900/20 border-emerald-500/50 hover:bg-emerald-900/40 shadow-[0_0_8px_rgba(52,211,153,0.3)]' 
                        : 'text-rose-450 bg-rose-950/20 border-rose-500/30 hover:bg-rose-950/35'
                    }`}
                  >
                    {autoRun ? 'LARI OTOMATIS (REKOMENDASI HP)' : 'LARI MANUAL (D/ARAH)'}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-450 mb-1">MASTER VOL: {Math.round(masterVol * 100)}%</span>
                    <input 
                      type="range" min="0" max="1" step="0.1" value={masterVol} 
                      onChange={(e) => handleVolumeChange('master', parseFloat(e.target.value))}
                      className="accent-[#00f3ff] cursor-pointer w-full h-1 bg-slate-850 rounded-lg appearance-none"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-450 mb-1">MUSIC VOL: {Math.round(musicVol * 100)}%</span>
                    <input 
                      type="range" min="0" max="1" step="0.1" value={musicVol} 
                      onChange={(e) => handleVolumeChange('music', parseFloat(e.target.value))}
                      className="accent-[#ff00ff] cursor-pointer w-full h-1 bg-slate-850 rounded-lg appearance-none"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-450 mb-1">LASER VOL: {Math.round(sfxVol * 100)}%</span>
                    <input 
                      type="range" min="0" max="1" step="0.1" value={sfxVol} 
                      onChange={(e) => handleVolumeChange('sfx', parseFloat(e.target.value))}
                      className="accent-[#00f3ff] cursor-pointer w-full h-1 bg-slate-850 rounded-lg appearance-none"
                    />
                  </div>
                </div>
              </div>

              {/* Maintenance Tools - Reset Level Lock */}
              <div className="mt-3 flex justify-between items-center text-[10px] text-slate-500 font-mono" id="menu-footer-util">
                <span>*Gunakan sela tombol laser dan lompat padat untuk android</span>
                {unlockedLevel > 1 && (
                  <button 
                    onClick={resetLevelProgress}
                    className="text-rose-400 hover:text-rose-350 cursor-pointer underline flex items-center gap-1 leading-none text-[9px]"
                  >
                    🔒 RESET LEVEL LOCKS (Kunci Kembali)
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 3. Screen State: GAME OVER OVERLAY (Score submission & scoreboard display) */}
        {gameState && gameState.isGameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 text-slate-100 font-sans overflow-y-auto z-30" id="gameover-screen-overlay">
            <div className="grid grid-cols-1 min-[500px]:grid-cols-2 gap-4 w-full max-w-[760px] max-h-full" id="gameover-menu-split">
              
              {/* Left Column: Final score display and registry form */}
              <div className={`bg-[#090911]/92 border ${gameState.currentLevel >= 51 ? 'border-[#00f3ff]/40 shadow-[0_0_30px_rgba(0,243,255,0.25)]' : 'border-[#ff00ff]/30'} p-4 rounded-xl flex flex-col justify-center text-center relative`} id="gameover-left-panel">
                <div className={`absolute top-2 left-2 ${gameState.currentLevel >= 51 ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-450' : 'bg-[#ff00ff]/10 border-[#ff00ff]/50 text-[#ff00ff]'} border px-2 py-0.5 text-[9px] font-mono rounded`}>
                  {gameState.currentLevel >= 51 ? 'CAMPAIGN COMPLETED' : 'OFFLINE-STATE STOPPED'}
                </div>
                
                <h2 className={`text-3xl font-black ${gameState.currentLevel >= 51 ? 'text-emerald-400 [text-shadow:_0_0_12px_rgba(52,211,153,0.5)]' : 'text-[#ff00ff] [text-shadow:_0_0_8px_rgba(255,0,255,0.4)]'} tracking-widest mt-4`}>
                  {gameState.currentLevel >= 51 ? 'MISI BERHASIL!' : 'PERMAINAN SELESAI'}
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  {gameState.currentLevel >= 51 
                    ? 'Selamat! Anda berhasil menaklukkan seluruh rintangan tingkat tinggi!' 
                    : `Anda gugur di tingkat perjalanan Level ${gameState.currentLevel}`}
                </p>
                
                {/* Score highlights */}
                <div className="my-3 bg-slate-950/80 p-3 rounded-lg border border-slate-900">
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest">Skor Akhir</div>
                  <div className="text-3xl font-black text-[#00f3ff] [text-shadow:_0_0_8px_rgba(0,243,255,0.4)] leading-none my-1 tracking-wide">
                    {gameState.score.toLocaleString()}
                  </div>
                  <p className="text-[10px] text-emerald-450">Jarak tempuh: {Math.floor(gameState.distanceCovered)} meter</p>
                </div>

                {/* Score submissions form */}
                {!scoreSubmitted ? (
                  <form onSubmit={handleSubmitScore} className="flex flex-col gap-2 mt-1 mb-2 text-left" id="score-registry-form">
                    <label className="text-[10px] font-mono text-[#00f3ff] font-bold uppercase tracking-wider flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5 text-[#00f3ff]" /> NAMA IDENTIFIKASI (LOCAL RECORD):
                    </label>
                    <div className="flex gap-1.5">
                      <input 
                        type="text" 
                        placeholder="Ketik nama..." 
                        maxLength={15} 
                        value={playerName}
                        required
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:border-[#00f3ff] focus:ring-1 focus:ring-[#00f3ff]"
                        id="score-name-input"
                      />
                      <button 
                        type="submit"
                        className="bg-[#00f3ff] hover:bg-[#38bdf8] text-slate-950 font-black text-[10px] tracking-widest px-3 rounded-lg transition-all cursor-pointer"
                        id="score-submit-button"
                      >
                        SIMPAN
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-lg p-2 text-emerald-400 text-xs font-semibold my-2">
                    ✓ Skor Anda Berhasil Disimpan ke Peringkat Lokal!
                  </div>
                )}

                {/* Restart Buttons */}
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => handleStartGame(gameState.currentLevel)}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 cursor-pointer hover:brightness-110 text-slate-950 font-black text-xs tracking-widest py-2 rounded-lg transition-all"
                    id="btn-restart-from-gameover"
                  >
                    MAIN LAGI (RETRY)
                  </button>
                  <button
                    onClick={handleExitGame}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 cursor-pointer text-slate-100 font-bold text-xs tracking-widest py-2 rounded-lg transition-all"
                    id="btn-mainmenu-from-gameover"
                  >
                    KE MENU UTAMA
                  </button>
                </div>
              </div>

              {/* Right Column: Local High scores board */}
              <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col max-h-[290px] md:max-h-none overflow-hidden" id="gameover-right-panel">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-xs font-mono font-bold tracking-widest text-slate-300 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-400 fill-amber-400/20" /> TOP REKOR LOKAL (BROWSER)
                  </h3>
                  {leaderboard.length > 0 && (
                    <button 
                      onClick={clearScores}
                      className="text-[9px] text-rose-400 hover:text-rose-300 hover:underline"
                    >
                      Reset Rekor
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs font-mono" id="leaderboard-scores-scroll">
                  {leaderboard.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-[11px] py-12">
                      Belum ada skor tersimpan.
                      <p className="text-[9px] mt-1 text-slate-600">Jadilah yang pertama menuliskan nama!</p>
                    </div>
                  ) : (
                    leaderboard.map((entry, idx) => (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between p-2 rounded-md ${
                          idx === 0 
                            ? 'bg-amber-500/10 border border-amber-500/30' 
                            : idx === 1 
                            ? 'bg-slate-300/5 border border-slate-400/20'
                            : 'bg-slate-950/40 border border-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={`font-black w-4 text-[10px] ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-400' : 'text-slate-500'}`}>
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-200 truncate max-w-[120px]">{entry.name}</span>
                          <span className="text-[9px] bg-slate-800 text-slate-400 px-1 rounded">Lv.{entry.level}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-black text-amber-400">{entry.score.toLocaleString()}</span>
                          <span className="text-[8px] text-slate-500">{entry.date}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Helpful Hint banner - hidden when active to clean up mobile screen height */}
      {(!gameState || !gameState.hasStarted || gameState.isGameOver) && (
        <div className="mt-4 text-center max-w-sm text-slate-500 font-mono text-[10px]" id="gameplay-footer-tip">
          <p>Tip: Main di komputer untuk performa input keyboard tercepat. Sumbu lompatan mendukung double jump!</p>
        </div>
      )}
    </div>
  );
}
