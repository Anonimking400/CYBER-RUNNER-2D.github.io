/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState, Player, Enemy, Projectile, PowerUp, Platform, Particle, LevelGoal, PowerUpType, EnemyType, Checkpoint } from './types';
import { synths } from './audio';
import { idleFrames, runningFrames, jumpFrame, fallFrame, PlayerKeyframe } from '../assets/animations/playerAnimations';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export class GameEngine {
  public state!: GameState;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  public keys: { [key: string]: boolean } = {};
  public autoRun: boolean = true;
  public platformsMovingMode: boolean = true;
  
  // Logical game resolution
  public readonly width = 800;
  public readonly height = 450;
  
  // Game visual/gameplay parameters
  private onStateChange: (state: GameState) => void;
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private backgroundOffset1: number = 0;
  private backgroundOffset2: number = 0;
  private screenShakeTime: number = 0;
  private screenShakeMagnitude: number = 0;

  constructor(onStateChange: (state: GameState) => void) {
    this.onStateChange = onStateChange;
    this.resetState();
  }

  public init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.setupControls();
  }

  public resetState(startLevel: number = 1) {
    const savedHighScore = localStorage.getItem('2d_platformer_high_score');
    const highScore = savedHighScore ? parseInt(savedHighScore, 10) : 0;

    // Up to 50 levels!
    const distGoal = 1000 + (Math.min(50, startLevel) - 1) * 200;

    this.state = {
      player: {
        x: 100,
        y: 200,
        width: 24,
        height: 38,
        vx: 0,
        vy: 0,
        isGrounded: false,
        isJumping: false,
        doubleJumpAvailable: true,
        stompCombo: 0,
        hp: 100,
        maxHp: 100,
        score: 0,
        highScore: highScore,
        ammo: 15,
        maxAmmo: 30,
        shieldTime: 0,
        speedTime: 0,
        animFrame: 0,
        animTimer: 0,
        facing: 'right',
        shootCooldown: 0
      },
      enemies: [],
      projectiles: [],
      powerups: [],
      platforms: [],
      particles: [],
      goal: null,
      checkpoints: this.generateCheckpointsForLevel(startLevel),
      lastActiveCheckpoint: null,
      distanceCovered: 0,
      distanceToGoal: distGoal,
      currentLevel: startLevel,
      gameSpeed: 3.2 + (startLevel - 1) * 0.08, // Base scrolling speed scales gently with selected level up to level 50
      isGameOver: false,
      isPaused: false,
      hasStarted: false,
      score: 0,
      enemySpawnTimer: 0,
      powerupSpawnTimer: 0
    };

    this.backgroundOffset1 = 0;
    this.backgroundOffset2 = 0;
    this.screenShakeTime = 0;
    this.screenShakeMagnitude = 0;

    // Generate initial platforms
    this.generateInitialPlatforms();
  }

  private generateCheckpointsForLevel(level: number): Checkpoint[] {
    const cps: Checkpoint[] = [];
    // Calculate total distance for this level
    const maxLev = Math.min(50, level);
    const totalDistance = 1000 + (maxLev - 1) * 200;
    
    // Checkpoint 1 at ~33% distance, Checkpoint 2 at ~66% distance
    const dist1 = Math.floor(totalDistance * 0.33);
    const dist2 = Math.floor(totalDistance * 0.66);
    
    // Get tier names dynamically
    const names = [
      'DELTA STATION', 'CYAN REEF', 'SYNTH CORE', 'MATRIX VENT', 
      'OMEGA OUTPOST', 'SOLARIS DOCK', 'MATRIX OUTPOST', 'SOLARIS DOCKING',
      'CHRONO CHAMBER', 'STATION VECTORS', 'QUANTUM SECTORS', 'ALPHA TERMINAL'
    ];
    const name1 = names[(level * 2) % names.length];
    const name2 = names[(level * 2 + 1) % names.length];

    cps.push({ 
      id: `cp${level}-1`, 
      x: -1000, 
      y: 280, 
      width: 22, 
      height: 48, 
      isActivated: false, 
      color: '#ef4444', 
      distance: dist1, 
      name: `${name1} CP-A` 
    });
    
    cps.push({ 
      id: `cp${level}-2`, 
      x: -1000, 
      y: 280, 
      width: 22, 
      height: 48, 
      isActivated: false, 
      color: '#ef4444', 
      distance: dist2, 
      name: `${name2} CP-B` 
    });
    
    return cps;
  }

  private generateInitialPlatforms() {
    this.state.platforms = [];

    // Base large starting floor
    this.state.platforms.push({ x: 0, y: 390, width: 900, height: 60, color: '#10b981' });
    
    // Floating platforms
    this.state.platforms.push({ x: 300, y: 280, width: 150, height: 16, color: '#06b6d4' });
    this.state.platforms.push({ 
      x: 550, 
      y: 200, 
      width: 140, 
      height: 16, 
      color: '#06b6d4',
      isMoving: true,
      startY: 200,
      moveRange: 40,
      moveSpeed: 0.02,
      angle: 0
    });
    this.state.platforms.push({ x: 750, y: 290, width: 160, height: 16, color: '#06b6d4' });
    this.state.platforms.push({ 
      x: 1000, 
      y: 220, 
      width: 120, 
      height: 16, 
      color: '#06b6d4',
      isMoving: true,
      startY: 220,
      moveRange: 30,
      moveSpeed: 0.015,
      angle: Math.PI
    });
    this.state.platforms.push({ x: 1200, y: 390, width: 600, height: 60, color: '#10b981' }); // Secondary floor
  }

  private setupControls() {
    this.keys = {};
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      this.keys[code] = true;
      
      if (!this.state.hasStarted) return;
      if (this.state.isGameOver) return;
      if (this.state.isPaused) return;

      // Single triggers
      if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
        this.jump();
      }
      if (code === 'KeyX' || code === 'KeyK' || code === 'Period') {
        this.shoot();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    };

    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  }

  // Handle player Jump
  public jump() {
    const p = this.state.player;
    if (p.isGrounded) {
      p.vy = p.speedTime > 0 ? -12 : -10; // Extra jump high with speed boost!
      p.isGrounded = false;
      p.isJumping = true;
      p.doubleJumpAvailable = true;
      synths.playJump();
      this.spawnJumpParticles(p.x + p.width / 2, p.y + p.height);
    } else if (p.doubleJumpAvailable) {
      p.vy = p.speedTime > 0 ? -10.5 : -8.5;
      p.doubleJumpAvailable = false;
      synths.playJump();
      this.spawnJumpParticles(p.x + p.width / 2, p.y + p.height);
    }
  }

  // Handle player laser fire
  public shoot() {
    const p = this.state.player;
    if (this.state.isGameOver || this.state.isPaused) return;
    if (p.shootCooldown > 0) return;
    if (p.ammo <= 0) return;

    p.ammo -= 1;
    p.shootCooldown = 15; // frames delay (approx 0.25s)
    synths.playShoot();

    // Determine fire vector
    const dir = p.facing === 'right' ? 1 : -1;
    const bulletX = dir === 1 ? p.x + p.width + 4 : p.x - 12;
    const bulletY = p.y + p.height / 2 - 2;

    this.state.projectiles.push({
      id: generateId(),
      x: bulletX,
      y: bulletY,
      vx: dir * 12 + (dir * this.state.gameSpeed * 0.4), // Combine with game scrolling speed
      vy: 0,
      radius: 4,
      color: '#38bdf8', // Blue neon projectile
      isPlayerProj: true,
      damage: 1
    });

    // Spawn tiny exhaust particles
    for (let i = 0; i < 5; i++) {
      this.state.particles.push({
        x: bulletX,
        y: bulletY + (Math.random() * 6 - 3),
        vx: -dir * (Math.random() * 2 + 1),
        vy: Math.random() * 2 - 1,
        radius: Math.random() * 1.5 + 1,
        color: '#38bdf8',
        alpha: 1.0,
        decay: 0.04
      });
    }

    this.onStateChange({ ...this.state });
  }

  // Trigger screen shake (e.g. on damage or defeating boss)
  private shakeCamera(magnitude: number, duration: number) {
    this.screenShakeTime = duration;
    this.screenShakeMagnitude = magnitude;
  }

  public startGame(startLevel: number = 1) {
    this.resetState(startLevel);
    this.state.hasStarted = true;
    synths.init();
    synths.startMusic();
    this.onStateChange({ ...this.state });
    
    this.lastTime = performance.now();
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.loop(this.lastTime);
  }

  public togglePause() {
    this.state.isPaused = !this.state.isPaused;
    if (this.state.isPaused) {
      synths.stopMusic();
    } else {
      synths.startMusic();
      this.lastTime = performance.now();
      if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
      this.loop(this.lastTime);
    }
    this.onStateChange({ ...this.state });
  }

  public stopEngine() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    synths.stopMusic();
  }

  // Core Game Loop
  private loop = (timestamp: number) => {
    if (this.state.isGameOver || this.state.isPaused) return;

    const dt = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update();
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  // --- GAME LOGIC UPDATE ---
  private update() {
    const p = this.state.player;
    
    // 1. Level speed adaptation (scrolls only when the character is moving forward / Right)
    const isMovingForward = (this.keys['ArrowRight'] || this.keys['KeyD'] || this.autoRun);
    const maxSpeed = 3.2 + (Math.min(50, this.state.currentLevel) * 0.08) + (p.speedTime > 0 ? 3.0 : 0);
    const targetSpeed = isMovingForward ? maxSpeed : 0;
    
    // Smooth, snappy interpolation for responsive start/stop when character walks
    this.state.gameSpeed = this.state.gameSpeed * 0.70 + targetSpeed * 0.30;

    // Apply speed tempo to sound synthesizer based on intense vs normal gameplay moments
    // Intense is triggered if: 3+ enemies on screen, HP is critical (< 30), or speed powerup is active!
    const isChallenging = this.state.enemies.length >= 3 || p.hp < 30 || p.speedTime > 0;
    const baseMult = 0.9 + (Math.min(50, this.state.currentLevel) * 0.012);
    const intenseMult = baseMult + 0.35;
    synths.setTempo(isChallenging ? intenseMult : baseMult);

    // 2. Decrement temporary effects
    if (p.shieldTime > 0) p.shieldTime = Math.max(0, p.shieldTime - 16.6); // Based on ~60fps
    if (p.speedTime > 0) p.speedTime = Math.max(0, p.speedTime - 16.6);
    if (p.shootCooldown > 0) p.shootCooldown--;

    // 3. Increment distance
    this.state.distanceCovered += this.state.gameSpeed * 0.05;

    // --- SUPER MARIO RETRO PHYSICS ENGINE ---
    // Mario-style momentum, friction, skidding & variable air controls!
    const isPressingRight = (this.keys['ArrowRight'] || this.keys['KeyD'] || this.autoRun);
    const isPressingLeft = (this.keys['ArrowLeft'] || this.keys['KeyA']) && !this.autoRun;
    const isHoldingJump = (this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['Space']);

    const maxWalkSpeed = p.speedTime > 0 ? 8.0 : 5.0;
    const accelRate = p.isGrounded ? 0.38 : 0.22; // lower air control acceleration
    const slideFriction = p.isGrounded ? 0.84 : 0.95; // slide friction deceleration

    if (isPressingRight) {
      if (p.vx < 0) {
        // Skidding / Brake turn-around
        p.vx += accelRate * 2.5;
        // Spawn skid smoke particles!
        if (p.isGrounded && Math.random() < 0.4) {
          this.state.particles.push({
            x: p.x + p.width / 2,
            y: p.y + p.height,
            vx: -1.5,
            vy: -Math.random() * 1.5,
            radius: Math.random() * 2 + 1,
            color: '#cbd5e1',
            alpha: 0.8,
            decay: 0.04
          });
        }
      } else {
        p.vx += accelRate;
      }
      p.facing = 'right';
    } else if (isPressingLeft) {
      if (p.vx > 0) {
        // Skidding / Brake turn-around
        p.vx -= accelRate * 2.5;
        // Spawn skid smoke particles!
        if (p.isGrounded && Math.random() < 0.4) {
          this.state.particles.push({
            x: p.x + p.width / 2,
            y: p.y + p.height,
            vx: 1.5,
            vy: -Math.random() * 1.5,
            radius: Math.random() * 2 + 1,
            color: '#cbd5e1',
            alpha: 0.8,
            decay: 0.04
          });
        }
      } else {
        p.vx -= accelRate;
      }
      p.facing = 'left';
    } else {
      // Natural inertia slide friction
      p.vx *= slideFriction;
      if (Math.abs(p.vx) < 0.08) {
        p.vx = 0;
      }
    }

    // Limit to max speeds
    if (p.vx > maxWalkSpeed) p.vx = maxWalkSpeed;
    if (p.vx < -maxWalkSpeed) p.vx = -maxWalkSpeed;

    // Apply horizontal velocity
    p.x += p.vx;
    
    // Bounds check
    if (p.x < 10) {
      p.x = 10;
      p.vx = 0;
    }
    if (p.x > this.width - p.width - 110) {
      p.x = this.width - p.width - 110; // Bound to left portion of landscape screen
      p.vx = 0;
    }

    // Mario Variable Jump height + gravity acceleration
    let currentGravity = 0.45;
    if (p.vy < -1.0 && !isHoldingJump) {
      // If player released the jump button early, apply high fall-off gravity for snappy short hops!
      currentGravity = 1.25; 
    }
    p.vy += currentGravity;
    p.y += p.vy;

    // Reset stomp combo when grounded
    if (p.isGrounded) {
      p.stompCombo = 0;
    }

    // Check bottom death pit
    if (p.y > this.height) {
      this.handlePlayerDamage(40); // Lose HP for falling in spikes/pit
      p.y = 100; // Reset safe upper coordinates
      p.vy = 0;
      p.vx = 0;
      this.shakeCamera(8, 20);
    }

    // Platform collision
    p.isGrounded = false;
    for (const plat of this.state.platforms) {
      if (
        p.x + p.width > plat.x &&
        p.x < plat.x + plat.width &&
        p.y + p.height >= plat.y &&
        p.y + p.height - p.vy <= plat.y + 12
      ) {
        // Safe landed
        p.y = plat.y - p.height;
        p.vy = 0;
        p.isGrounded = true;
        p.isJumping = false;
        p.doubleJumpAvailable = true;

        if (plat.isDamaging) {
          this.handlePlayerDamage(15);
          p.vy = -5.0; // Knockback skip jump
          this.shakeCamera(5, 12);
        }
      }
    }

    // Player Animations (Cycled across 6-frame sets)
    p.animTimer += 16.6;
    if (p.animTimer >= 100) {
      p.animTimer = 0;
      p.animFrame = (p.animFrame + 1) % 6;
    }

    // 4. Scrolling platforms & procedural placement
    let rightmostPlatformX = 0;
    for (const plat of this.state.platforms) {
      plat.x -= this.state.gameSpeed;
      
      // Handle dynamic movements if activated
      if (plat.isMoving) {
        if (plat.startY === undefined) plat.startY = plat.y;
        if (plat.angle === undefined) plat.angle = Math.random() * Math.PI * 2;
        
        if (this.platformsMovingMode) {
          plat.angle += plat.moveSpeed || 0.02;
          plat.y = plat.startY + Math.sin(plat.angle) * (plat.moveRange || 30);
        } else {
          // Reset to initial static height if mode is set to static / quiet
          plat.y = plat.startY;
        }
      }

      if (plat.x + plat.width > rightmostPlatformX) {
        rightmostPlatformX = plat.x + plat.width;
      }
    }

    // Filter off-screen platforms
    this.state.platforms = this.state.platforms.filter(plat => plat.x + plat.width > -50);

    // Procedural platforms generator
    if (rightmostPlatformX < this.width + 300) {
      this.spawnProceduralPlatforms(rightmostPlatformX);
    }

    // 5. Update and Collision: PROJECTILES
    for (const proj of this.state.projectiles) {
      proj.x += proj.vx;
      proj.y += proj.vy;
    }

    // Filter off-screen projectiles
    this.state.projectiles = this.state.projectiles.filter(
      proj => proj.x < this.width + 50 && proj.x > -50 && proj.y < this.height + 50 && proj.y > -50
    );

    // 6. Spawn and Update: ENEMIES
    this.state.enemySpawnTimer += 16.6;
    // Spawn more frequently as level increases! Clamped between 600ms and 2800ms
    const currentSpawnRate = Math.max(600, 2800 - (Math.min(50, this.state.currentLevel) * 110));
    if (this.state.enemySpawnTimer >= currentSpawnRate && !this.state.goal?.isActive) {
      this.state.enemySpawnTimer = 0;
      this.spawnEnemy();
    }

    for (const enemy of this.state.enemies) {
      enemy.x -= this.state.gameSpeed; // Scrolling
      enemy.x += enemy.vx; // Self velocity

      if (enemy.type === 'drone') {
        // Floating wave
        enemy.floatTime = (enemy.floatTime || 0) + (enemy.floatSpeed || 0.05);
        enemy.y += Math.sin(enemy.floatTime) * (enemy.floatAmplitude || 1.8);
      } else if (enemy.type === 'scout') {
        // Stay locked at mid height, fire periodically
        enemy.floatTime = (enemy.floatTime || 0) + 0.03;
        enemy.y += Math.sin(enemy.floatTime) * 0.8;

        // Shoot bullet at player
        enemy.shootCooldown++;
        if (enemy.shootCooldown >= enemy.shootInterval) {
          enemy.shootCooldown = 0;
          this.enemyShoot(enemy);
        }
      }

      // Crawler floor tracking
      if (enemy.type === 'crawler') {
        // Ensurecrawler stays on bottom platforms
        let grounded = false;
        for (const p of this.state.platforms) {
          if (enemy.x + enemy.width > p.x && enemy.x < p.x + p.width && enemy.y + enemy.height >= p.y && enemy.y + enemy.height <= p.y + 12) {
            enemy.y = p.y - enemy.height;
            grounded = true;
            break;
          }
        }
        if (!grounded) {
          enemy.vy += 0.4;
          enemy.y += enemy.vy;
        } else {
          enemy.vy = 0;
        }
      }
    }

    // Filter off-screen enemies
    this.state.enemies = this.state.enemies.filter(e => e.x + e.width > -40);

    // 7. Power-ups movement
    for (const pwr of this.state.powerups) {
      pwr.x -= this.state.gameSpeed;
      pwr.floatTime += 0.05;
      pwr.y += Math.sin(pwr.floatTime) * 0.6;
    }
    this.state.powerups = this.state.powerups.filter(pwr => pwr.x + pwr.width > -40);

    // Spawning Power-ups
    this.state.powerupSpawnTimer += 16.6;
    if (this.state.powerupSpawnTimer >= 8000) { // Every 8 seconds
      this.state.powerupSpawnTimer = 0;
      this.spawnPowerUp();
    }

    // 8. Collisions: PROJECTILE VS PLAYER / ENEMY
    for (const proj of [...this.state.projectiles]) {
      if (proj.isPlayerProj) {
        // Bullet hits Enemy
        for (const enemy of this.state.enemies) {
          if (
            proj.x + proj.radius > enemy.x &&
            proj.x - proj.radius < enemy.x + enemy.width &&
            proj.y + proj.radius > enemy.y &&
            proj.y - proj.radius < enemy.y + enemy.height
          ) {
            // Hit! Remove project, reduce HP
            this.state.projectiles = this.state.projectiles.filter(p => p.id !== proj.id);
            enemy.hp -= proj.damage;
            synths.playProjectileHit();
            this.spawnExplosionParticles(proj.x, proj.y, '#e11d48'); // Spark red

            if (enemy.hp <= 0) {
              this.state.enemies = this.state.enemies.filter(e => e.id !== enemy.id);
              this.state.score += enemy.points;
              // Spawn giant loot blast of particles!
              this.spawnExplosionParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 14);
              this.shakeCamera(3, 8);
              
              // 10% chance to drop immediate small heal or ammo
              if (Math.random() < 0.25) {
                this.state.powerups.push({
                  id: generateId(),
                  type: Math.random() < 0.6 ? 'ammo' : 'heal',
                  x: enemy.x,
                  y: enemy.y,
                  width: 18,
                  height: 18,
                  vy: -1,
                  floatTime: 0,
                  color: '#fbbf24'
                });
              }
            }
            break;
          }
        }
      } else {
        // Enemy Bullet hits Player
        if (
          proj.x + proj.radius > p.x &&
          proj.x - proj.radius < p.x + p.width &&
          proj.y + proj.radius > p.y &&
          proj.y - proj.radius < p.y + p.height
        ) {
          this.state.projectiles = this.state.projectiles.filter(pi => pi.id !== proj.id);
          synths.playProjectileHit();
          this.handlePlayerDamage(18);
          this.spawnExplosionParticles(proj.x, proj.y, '#f43f5e', 8);
          this.shakeCamera(6, 12);
        }
      }
    }

    // 9. Collisions: ENEMY VS PLAYER & POWER-UP VS PLAYER
    // Enemy contacts player directly
    for (const enemy of this.state.enemies) {
      if (
        p.x + p.width > enemy.x &&
        p.x < enemy.x + enemy.width &&
        p.y + p.height > enemy.y &&
        p.y < enemy.y + enemy.height
      ) {
        // Player stepped on / touched enemy
        if (p.vy > 0 && p.y + p.height - p.vy <= enemy.y + 16) {
          // Mario stomp style! Kill enemy, bounce player up!
          this.state.enemies = this.state.enemies.filter(e => e.id !== enemy.id);
          
          // If holding jump button, give mega stomp bounce! Else standard jump hop
          const isHoldingJumpStomp = (this.keys['ArrowUp'] || this.keys['KeyW'] || this.keys['Space']);
          p.vy = isHoldingJumpStomp ? -11.0 : -6.8;
          p.isJumping = true;
          p.doubleJumpAvailable = true; // resets double jump on stomp!
          
          // Increment consecutive stomp combo
          p.stompCombo += 1;
          const comboMultiplier = Math.min(8, p.stompCombo);
          this.state.score += enemy.points * comboMultiplier;

          // Play our beautiful new escalating pitch retro synthesize sound!
          synths.playStomp(p.stompCombo - 1);
          
          this.spawnExplosionParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 12);
          this.shakeCamera(3, 8);
          
          // Draw floating score indicator sparks for extra premium retro game feel!
          for (let i = 0; i < 4; i++) {
            this.state.particles.push({
              x: enemy.x + (Math.random() * 20 - 10),
              y: enemy.y - 10,
              vx: Math.random() * 2 - 1,
              vy: -Math.random() * 2 - 1,
              radius: Math.random() * 1.5 + 1.2,
              color: '#facc15', // Yellow retro score glitter
              alpha: 1.0,
              decay: 0.03
            });
          }
        } else {
          // Hit from side
          this.handlePlayerDamage(25);
          // Bounce enemy away
          enemy.vx = -enemy.vx * 1.2;
          this.shakeCamera(7, 14);
        }
      }
    }

    // Collect Powerup
    for (const pwr of [...this.state.powerups]) {
      if (
        p.x + p.width > pwr.x &&
        p.x < pwr.x + pwr.width &&
        p.y + p.height > pwr.y &&
        p.y < pwr.y + pwr.height
      ) {
        this.collectPowerUp(pwr);
        this.state.powerups = this.state.powerups.filter(x => x.id !== pwr.id);
      }
    }

    // 9.5 UPDATE AND COLLIDE CHECKPOINTS (Pristine procedural beacon systems)
    for (const cp of this.state.checkpoints) {
      if (cp.x > -100) {
        cp.x -= this.state.gameSpeed; // world scroll
        
        // Touch checks
        if (
          p.x + p.width > cp.x &&
          p.x < cp.x + cp.width &&
          p.y + p.height > cp.y &&
          p.y < cp.y + cp.height
        ) {
          if (!cp.isActivated) {
            cp.isActivated = true;
            cp.color = '#00f3ff'; // turn cyan when activated
            synths.playCheckpointActive();
            
            this.state.lastActiveCheckpoint = {
              id: cp.id,
              distance: cp.distance,
              level: this.state.currentLevel,
              score: this.state.score,
              name: cp.name
            };

            // Spawn awesome digital neon particles
            for (let i = 0; i < 22; i++) {
              const angle = Math.random() * Math.PI * 2;
              const spd = Math.random() * 4 + 2;
              this.state.particles.push({
                x: cp.x + cp.width / 2,
                y: cp.y,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd - 2, // burst upwards
                radius: Math.random() * 2.5 + 1.2,
                color: '#00f3ff', // glowing cyan
                alpha: 1.0,
                decay: 0.03
              });
            }
          }
        }
      } else if (this.state.distanceCovered >= cp.distance - 200 && cp.x === -1000) {
        // Procedurally spawn checkpoint stands on upcoming solid surface!
        cp.x = this.width + 50;
        let foundY = 280;
        const rightPlats = this.state.platforms.filter(plat => plat.x >= this.width - 200 && !plat.isDamaging);
        if (rightPlats.length > 0) {
          foundY = rightPlats[0].y - cp.height;
        } else {
          // auto-fabricate clean platform if empty air space
          this.state.platforms.push({ x: cp.x - 40, y: 320, width: 140, height: 16, color: '#06b6d4' });
          foundY = 320 - cp.height;
        }
        cp.y = foundY;
      }
    }

    // 10. LEVEL OBJECTIVE / ENDING GATE PORTAL PROCESS
    // Up to 50 levels!
    const cappedLevel = Math.min(50, this.state.currentLevel);
    const distanceThreshold = 1000 + (cappedLevel - 1) * 200;

    if (this.state.distanceCovered >= distanceThreshold && !this.state.goal && this.state.currentLevel <= 50) {
      // Spawn Level End Portal on next big platform
      this.state.goal = {
        x: this.width + 120,
        y: 280,
        width: 45,
        height: 70,
        isActive: true,
        color: '#c084fc', // Purple cyber gateway portal
        pulseTimer: 0
      };
    }

    if (this.state.goal) {
      this.state.goal.x -= this.state.gameSpeed;
      this.state.goal.pulseTimer += 0.08;
      
      const g = this.state.goal;
      // Portal Collision
      if (
        p.x + p.width > g.x &&
        p.x < g.x + g.width &&
        p.y + p.height > g.y &&
        p.y < g.y + g.height
      ) {
        this.advanceLevel();
      }
    }

    // 11. Update particles
    for (const part of this.state.particles) {
      part.x += part.vx;
      part.y += part.vy;
      if (part.gravity) part.vy += part.gravity;
      part.alpha -= part.decay;
    }
    this.state.particles = this.state.particles.filter(p => p.alpha > 0.05);

    // Sync high score
    if (this.state.score > p.highScore) {
      p.highScore = this.state.score;
      localStorage.setItem('2d_platformer_high_score', p.highScore.toString());
    }

    // Update screen shake timing decays
    if (this.screenShakeTime > 0) this.screenShakeTime -= 1;

    // Send state change back to view
    this.onStateChange({ ...this.state });
  }

  // Handle damage with shield mechanics
  private handlePlayerDamage(amount: number) {
    const p = this.state.player;
    if (p.shieldTime > 0) {
      // Shield absorbs damage! Draw sparkly shield hits
      this.spawnExplosionParticles(p.x + p.width / 2, p.y + p.height / 2, '#38bdf8', 12);
      return;
    }

    p.hp -= amount;
    synths.playDamage();
    
    // Spawn digital red damage sparks surrounding the character
    for (let i = 0; i < 8; i++) {
      this.state.particles.push({
        x: p.x + p.width / 2,
        y: p.y + p.height / 2,
        vx: (Math.random() * 6 - 3),
        vy: -Math.random() * 4 - 1,
        radius: Math.random() * 2 + 1.5,
        color: '#ef4444',
        alpha: 1.0,
        decay: 0.03,
        gravity: 0.12
      });
    }

    if (p.hp <= 0) {
      p.hp = 0;
      if (this.state.lastActiveCheckpoint && this.state.lastActiveCheckpoint.level === this.state.currentLevel) {
        this.restoreFromCheckpoint();
      } else {
        this.triggerGameOver();
      }
    }
  }

  // Restore the player's progression and safe vitals from checkpoint
  public restoreFromCheckpoint() {
    const cp = this.state.lastActiveCheckpoint;
    if (!cp) return;

    const p = this.state.player;
    p.hp = 100;
    p.ammo = Math.max(15, p.ammo);
    p.vy = 0;
    
    // Position safely near start of screen
    p.x = 100;
    p.y = 150;
    p.isGrounded = false;
    
    // Revert scrolling progress back to check-point target!
    this.state.distanceCovered = cp.distance;
    
    // Dust and secure screen details
    this.state.enemies = [];
    this.state.projectiles = [];
    this.state.powerups = [];
    
    // Synthesize safe landing stage platform below the player respawn spot
    this.state.platforms = [
      { x: 0, y: 390, width: 350, height: 60, color: '#10b981' },
      { x: 300, y: 280, width: 180, height: 16, color: '#06b6d4' }
    ];

    // Trigger visual teleportation quantum glow processes
    synths.playCheckpointRestore();
    this.shakeCamera(10, 20);

    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 5 + 2;
      this.state.particles.push({
        x: p.x + p.width / 2,
        y: p.y + p.height / 2,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        radius: Math.random() * 3 + 1,
        color: '#00f3ff',
        alpha: 1.0,
        decay: 0.03
      });
    }

    this.onStateChange({ ...this.state });
  }

  // Progress Level
  private advanceLevel() {
    this.state.currentLevel += 1;
    if (this.state.currentLevel > 50) {
      this.triggerGameOver();
      return;
    }
    this.state.goal = null;

    // Pre-populate level Specific checkpoints
    this.state.checkpoints = this.generateCheckpointsForLevel(this.state.currentLevel);

    // Clear platforms and rebuild nicely to let players jump safely
    this.generateInitialPlatforms();
    this.state.enemies = [];
    this.state.projectiles = [];
    
    // Partially heal player and restock ammo as reward!
    const p = this.state.player;
    p.hp = Math.min(p.maxHp, p.hp + 30);
    p.ammo = Math.min(p.maxAmmo, p.ammo + 10);
    this.state.score += 500 * (this.state.currentLevel - 1); // bonus

    synths.playLevelComplete();
    this.shakeCamera(8, 25);
    
    // Trigger majestic levels progression visual particles from screen center!
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 6 + 3;
      this.state.particles.push({
        x: this.width / 2,
        y: this.height / 2,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        radius: Math.random() * 4 + 2,
        color: ['#a855f7', '#ec4899', '#f43f5e', '#3b82f6'][Math.floor(Math.random() * 4)],
        alpha: 1.0,
        decay: 0.02
      });
    }
  }

  // Handle game over logic
  private triggerGameOver() {
    this.state.isGameOver = true;
    synths.stopMusic();
    synths.playGameOver();
    
    // Save Leaderboard automatically (will trigger input form on Component)
    this.onStateChange({ ...this.state });
  }

  // Procedural platform logic to support endless sideways generation
  private spawnProceduralPlatforms(rightmostX: number) {
    const minGap = 55;
    const maxGap = 125;
    const gap = minGap + Math.random() * (maxGap - minGap);
    
    const platX = rightmostX + gap;
    // Platform types
    const rand = Math.random();
    
    if (rand < 0.25) {
      // Long safe platform
      const width = 160 + Math.random() * 100;
      const y = 300 - Math.random() * 120;
      this.state.platforms.push({
        x: platX,
        y: y,
        width: width,
        height: 16,
        color: '#10b981' // Green
      });
    } else if (rand < 0.50) {
      // Elevated stepping floating platform
      const width = 80 + Math.random() * 60;
      const y = 180 + Math.random() * 100;
      const isMoving = Math.random() < 0.65; // 65% chance of vertical movement
      this.state.platforms.push({
        x: platX,
        y: y,
        width: width,
        height: 16,
        color: '#06b6d4', // Cyan outline
        isMoving: isMoving,
        startY: y,
        moveRange: 20 + Math.random() * 35,
        moveSpeed: 0.01 + Math.random() * 0.02,
        angle: Math.random() * Math.PI * 2
      });
    } else if (rand < 0.75) {
      // Dangerous spiked platform!
      const width = 100 + Math.random() * 80;
      const y = 280 - Math.random() * 80;
      this.state.platforms.push({
        x: platX,
        y: y,
        width: width,
        height: 16,
        color: '#ef4444', // Crimson Spikes
        isDamaging: true
      });
    } else {
      // Multi tiered stepping platform
      const y1 = 320;
      const y2 = 200;
      this.state.platforms.push({
        x: platX,
        y: y1,
        width: 100,
        height: 16,
        color: '#06b6d4'
      });
      this.state.platforms.push({
        x: platX + 130,
        y: y2,
        width: 100,
        height: 16,
        color: '#6366f1'
      });
    }
  }

  // Enemy spawning logic (based on current level difficulty)
  private spawnEnemy() {
    const types: EnemyType[] = ['crawler', 'drone', 'scout'];
    // Higher levels progressively unlock scout enemies
    const activeTypes = this.state.currentLevel < 5 ? ['crawler', 'drone'] : types;
    const type = activeTypes[Math.floor(Math.random() * activeTypes.length)] as EnemyType;
    
    const id = generateId();
    let y = 350;
    let width = 28;
    let height = 28;
    let vx = -1.5 - (Math.random() * 1.5) - (Math.min(50, this.state.currentLevel) * 0.08);
    let hp = 1 + Math.floor(Math.min(50, this.state.currentLevel) / 4);
    let points = 100 + Math.min(50, this.state.currentLevel) * 20;
    let color = '#ef4444';

    if (type === 'drone') {
      y = 120 + Math.random() * 150;
      width = 24;
      height = 24;
      color = '#f59e0b'; // Amber Drone
    } else if (type === 'scout') {
      y = 140 + Math.random() * 100;
      width = 26;
      height = 32;
      color = '#ec4899'; // Pink hover scout
      vx = -0.5 - (Math.min(50, this.state.currentLevel) * 0.05);
      hp = 2 + Math.floor(Math.min(50, this.state.currentLevel) / 5);
      points = 180 + Math.min(50, this.state.currentLevel) * 10;
    }

    this.state.enemies.push({
      id,
      type,
      x: this.width + 50,
      y,
      width,
      height,
      vx,
      vy: 0,
      hp,
      maxHp: hp,
      shootCooldown: 0,
      shootInterval: Math.max(50, 180 - (Math.min(50, this.state.currentLevel) * 3)), // rate of fire
      points,
      color,
      floatAmplitude: type === 'drone' ? 1.5 + Math.random() * 1.5 : undefined,
      floatSpeed: type === 'drone' ? 0.04 + Math.random() * 0.05 : undefined,
      floatTime: 0
    });
  }

  // Enemy fires projectile
  private enemyShoot(enemy: Enemy) {
    synths.playEnemyAttack();
    this.state.projectiles.push({
      id: generateId(),
      x: enemy.x - 10,
      y: enemy.y + enemy.height / 2,
      vx: -6.5 - (Math.min(50, this.state.currentLevel) * 0.1),
      vy: 0,
      radius: 4,
      color: '#fb7185', // Radiant Rose bad missile
      isPlayerProj: false,
      damage: 15
    });

    // small fire particles behind enemy shoot
    for (let i = 0; i < 3; i++) {
      this.state.particles.push({
        x: enemy.x - 5,
        y: enemy.y + enemy.height / 2,
        vx: 1 + Math.random() * 2,
        vy: Math.random() * 2 - 1,
        radius: Math.random() * 2 + 1,
        color: '#fb7185',
        alpha: 1.0,
        decay: 0.05
      });
    }
  }

  // Power up spawning algorithm
  private spawnPowerUp() {
    const types: PowerUpType[] = ['shield', 'speed', 'heal', 'ammo'];
    // Weighted percentages: heal & ammo are 35% each, shield 15%, speed 15%
    const rand = Math.random();
    let type: PowerUpType = 'ammo';
    if (rand < 0.15) type = 'shield';
    else if (rand < 0.30) type = 'speed';
    else if (rand < 0.65) type = 'heal';
    
    let color = '#3b82f6'; // Blue
    if (type === 'shield') color = '#a855f7'; // Purple
    if (type === 'speed') color = '#eab308'; // Yellow
    if (type === 'heal') color = '#22c55e'; // Green

    // Spawn hovering in mid air
    this.state.powerups.push({
      id: generateId(),
      type,
      x: this.width + 30,
      y: 155 + Math.random() * 110,
      width: 22,
      height: 22,
      vy: 0,
      floatTime: Math.random() * Math.PI,
      color
    });
  }

  // Process item pickup
  private collectPowerUp(pwr: PowerUp) {
    const p = this.state.player;
    synths.playPowerUp();

    switch (pwr.type) {
      case 'shield':
        p.shieldTime = 8000; // 8 seconds energy aura
        this.spawnPowerUpPopParticles(pwr.x, pwr.y, '#a855f7');
        break;
      case 'speed':
        p.speedTime = 6000; // 6 seconds velocity trails
        this.spawnPowerUpPopParticles(pwr.x, pwr.y, '#eab308');
        break;
      case 'heal':
        p.hp = Math.min(p.maxHp, p.hp + 25);
        this.spawnPowerUpPopParticles(pwr.x, pwr.y, '#22c55e');
        break;
      case 'ammo':
        p.ammo = Math.min(p.maxAmmo, p.ammo + 12);
        this.spawnPowerUpPopParticles(pwr.x, pwr.y, '#3b82f6');
        break;
    }

    this.onStateChange({ ...this.state });
  }

  // --- PARTICLE GENERATOR HELPERS ---
  private spawnJumpParticles(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      this.state.particles.push({
        x,
        y,
        vx: Math.random() * 4 - 2,
        vy: -Math.random() * 2.5 - 0.5,
        radius: Math.random() * 2 + 1,
        color: '#e5e7eb',
        alpha: 0.9,
        decay: 0.04
      });
    }
  }

  private spawnExplosionParticles(x: number, y: number, color: string, count: number = 7) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 3.5 + 1;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        radius: Math.random() * 2 + 1,
        color,
        alpha: 1.0,
        decay: 0.04,
        gravity: 0.05
      });
    }
  }

  private spawnPowerUpPopParticles(x: number, y: number, color: string) {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 4 + 2;
      this.state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        radius: Math.random() * 3 + 1.5,
        color,
        alpha: 1.0,
        decay: 0.03
      });
    }
  }


  // --- CANVAS RENDERING CORE ---
  private render() {
    if (!this.ctx || !this.canvas) return;

    // Camera Shake logic
    this.ctx.save();
    if (this.screenShakeTime > 0) {
      const dx = (Math.random() - 0.5) * this.screenShakeMagnitude;
      const dy = (Math.random() - 0.5) * this.screenShakeMagnitude;
      this.ctx.translate(dx, dy);
    }

    // 1. Clear background layout (Deep dark space sky background)
    this.ctx.fillStyle = '#0f172a';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw Far background grid / parallax structures (Cyberpunk starry city)
    this.backgroundOffset1 -= this.state.gameSpeed * 0.15;
    if (this.backgroundOffset1 <= -this.width) this.backgroundOffset1 = 0;
    
    // Remote low contrast buildings
    this.ctx.fillStyle = '#1e1b4b'; // Deep violet
    this.drawParallaxBuildings(this.backgroundOffset1, 140, 240, 0.4);
    this.drawParallaxBuildings(this.backgroundOffset1 + this.width, 140, 240, 0.4);

    // Midground structures
    this.backgroundOffset2 -= this.state.gameSpeed * 0.4;
    if (this.backgroundOffset2 <= -this.width) this.backgroundOffset2 = 0;
    this.ctx.fillStyle = '#1e1e38'; // Indigo cyber towers
    this.drawParallaxBuildings(this.backgroundOffset2, 210, 150, 0.65);
    this.drawParallaxBuildings(this.backgroundOffset2 + this.width, 210, 150, 0.65);

    // Glowing Neon Grid Line on bottom edge
    this.ctx.strokeStyle = '#312e81';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let x = 0; x < this.width; x += 30) {
      this.ctx.moveTo(x, 390);
      this.ctx.lineTo(x - 50, this.height);
    }
    this.ctx.stroke();

    // 3. Render Level Gate Portal (Goal)
    if (this.state.goal) {
      const g = this.state.goal;
      this.ctx.save();
      this.ctx.shadowBlur = 18;
      this.ctx.shadowColor = g.color;

      // Outer rotating portal aura
      const pulseRadius = g.width / 2 + Math.sin(g.pulseTimer) * 4;
      const gradient = this.ctx.createRadialGradient(
        g.x + g.width / 2, g.y + g.height / 2, 5,
        g.x + g.width / 2, g.y + g.height / 2, g.height / 2 + pulseRadius
      );
      gradient.addColorStop(0, '#f472b6');
      gradient.addColorStop(0.5, '#c084fc');
      gradient.addColorStop(1, 'rgba(192, 132, 252, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(g.x + g.width / 2, g.y + g.height / 2, g.height / 2 + pulseRadius, 0, Math.PI * 2);
      this.ctx.fill();

      // Rotating inner neon rings
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.ellipse(
        g.x + g.width / 2, g.y + g.height / 2,
        g.width / 2, g.height / 2 - Math.abs(Math.sin(g.pulseTimer) * 5),
        g.pulseTimer * 0.5, 0, Math.PI * 2
      );
      this.ctx.stroke();

      // Label
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 10px Courier New';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('PORTAL', g.x + g.width / 2, g.y - 10);
      this.ctx.restore();
    }

    // 3.5 Render CHECKPOINTS (Bi-colored neon cyber columns)
    for (const cp of this.state.checkpoints) {
      if (cp.x > -50 && cp.x < this.width + 50) {
        this.ctx.save();
        this.ctx.shadowBlur = cp.isActivated ? 14 : 6;
        this.ctx.shadowColor = cp.color;

        // Base stand
        this.ctx.fillStyle = '#334155'; // Dark metallic chassis
        this.ctx.fillRect(cp.x - 4, cp.y + cp.height - 4, cp.width + 8, 4);

        // Thin glowing mast column
        this.ctx.strokeStyle = cp.color;
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(cp.x + cp.width / 2, cp.y + cp.height - 4);
        this.ctx.lineTo(cp.x + cp.width / 2, cp.y + 12);
        this.ctx.stroke();

        // Glowing holographic top crystal/energy core
        const pulse = Math.sin(Date.now() * 0.007) * 3;
        this.ctx.fillStyle = cp.color;
        this.ctx.beginPath();
        this.ctx.arc(cp.x + cp.width / 2, cp.y + 8, 4 + pulse * 0.15, 0, Math.PI * 2);
        this.ctx.fill();

        // Holographic rotating orbit ring
        this.ctx.strokeStyle = cp.color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.ellipse(
          cp.x + cp.width / 2, cp.y + 8,
          8, 3,
          (Date.now() * 0.003) % (Math.PI * 2), 0, Math.PI * 2
        );
        this.ctx.stroke();

        // Text station sign label above the beacon
        this.ctx.shadowBlur = 0;
        this.ctx.font = 'bold 8px Courier New';
        this.ctx.fillStyle = cp.isActivated ? '#00f3ff' : '#94a3b8';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(cp.name, cp.x + cp.width / 2, cp.y - 12);
        
        this.ctx.font = '8px Courier New';
        this.ctx.fillText(cp.isActivated ? '[SYNCED]' : '[OFFLINE]', cp.x + cp.width / 2, cp.y - 4);

        // Ambient sparks floating up if activated!
        if (cp.isActivated && Math.random() < 0.08) {
          this.state.particles.push({
            x: cp.x + cp.width / 2 + (Math.random() * 8 - 4),
            y: cp.y + 8,
            vx: Math.random() * 0.8 - 0.4,
            vy: -1 - Math.random() * 0.6,
            radius: Math.random() * 1.5 + 0.5,
            color: '#00f3ff',
            alpha: 0.8,
            decay: 0.035
          });
        }

        this.ctx.restore();
      }
    }

    // 4. Render PLATFORMS
    for (const plat of this.state.platforms) {
      this.ctx.save();
      
      if (plat.isDamaging) {
        // Spiked Dangerous platforms
        this.ctx.fillStyle = '#ef4444';
        this.ctx.fillRect(plat.x, plat.y, plat.width, 10);
        
        // Render triangular hazard spike teeth
        this.ctx.strokeStyle = '#f43f5e';
        this.ctx.lineWidth = 2;
        this.ctx.fillStyle = '#7f1d1d';
        const spikeW = 10;
        this.ctx.beginPath();
        for (let sx = plat.x; sx < plat.x + plat.width; sx += spikeW) {
          this.ctx.moveTo(sx, plat.y);
          this.ctx.lineTo(sx + spikeW / 2, plat.y - 12);
          this.ctx.lineTo(sx + spikeW, plat.y);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
      } else {
        // Draw cybernetic blocks with glowing edges
        const neonColor = plat.color === '#10b981' ? '#10b981' : '#06b6d4';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = neonColor;
        this.ctx.fillStyle = '#0f172a';
        this.ctx.strokeStyle = neonColor;
        this.ctx.lineWidth = 2.5;

        // Draw rounded path edges
        this.ctx.beginPath();
        this.ctx.roundRect(plat.x + 1, plat.y + 1, plat.width - 2, plat.height - 2, 4);
        this.ctx.fill();
        this.ctx.stroke();

        // Tech visual highlights inside blocks
        this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(plat.x + 5, plat.y + 4);
        this.ctx.lineTo(plat.x + plat.width - 5, plat.y + 4);
        this.ctx.stroke();
      }

      this.ctx.restore();
    }

    // 5. Render POWER-UPS
    for (const pwr of this.state.powerups) {
      this.ctx.save();
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = pwr.color;
      this.ctx.fillStyle = pwr.color;
      
      // Floating hexagonal shape
      const px = pwr.x + pwr.width / 2;
      const py = pwr.y + pwr.height / 2;
      const size = pwr.width / 2;
      
      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + pwr.floatTime * 0.3;
        const x = px + Math.cos(angle) * size;
        const y = py + Math.sin(angle) * size;
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.closePath();
      this.ctx.fill();

      // Power up symbol icon overlay (Letters)
      this.ctx.fillStyle = '#1e293b';
      this.ctx.font = 'bold 11px Inter, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      let sym = 'A'; // Ammo
      if (pwr.type === 'shield') sym = 'S';
      if (pwr.type === 'speed') sym = 'V';
      if (pwr.type === 'heal') sym = '+';
      this.ctx.fillText(sym, px, py);

      this.ctx.restore();
    }

    // 6. Render ENEMIES
    for (const enemy of this.state.enemies) {
      this.ctx.save();
      this.ctx.shadowBlur = 12;
      this.ctx.shadowColor = enemy.color;
      
      if (enemy.type === 'crawler') {
        // Red multi-legged crawler bug
        this.ctx.fillStyle = enemy.color;
        this.ctx.beginPath();
        // Spiked carapace
        this.ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 + 2, enemy.width / 2, Math.PI, 0);
        this.ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
        this.ctx.lineTo(enemy.x, enemy.y + enemy.height);
        this.ctx.closePath();
        this.ctx.fill();

        // Glowing cyan eye
        this.ctx.fillStyle = '#06b6d4';
        this.ctx.beginPath();
        this.ctx.arc(enemy.x + 6, enemy.y + 16, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Crawling claws
        this.ctx.strokeStyle = enemy.color;
        this.ctx.lineWidth = 2.5;
        this.ctx.beginPath();
        this.ctx.moveTo(enemy.x + 3, enemy.y + enemy.height);
        this.ctx.lineTo(enemy.x - 2, enemy.y + enemy.height + 4);
        this.ctx.moveTo(enemy.x + enemy.width - 3, enemy.y + enemy.height);
        this.ctx.lineTo(enemy.x + enemy.width + 2, enemy.y + enemy.height + 4);
        this.ctx.stroke();

      } else if (enemy.type === 'drone') {
        // Triangular flying hover-ship
        this.ctx.fillStyle = '#1e293b';
        this.ctx.strokeStyle = enemy.color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(enemy.x + enemy.width / 2, enemy.y);
        this.ctx.lineTo(enemy.x + enemy.width, enemy.y + enemy.height);
        this.ctx.lineTo(enemy.x, enemy.y + enemy.height);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Spinning core
        this.ctx.fillStyle = enemy.color;
        this.ctx.beginPath();
        const coreR = 4 + Math.sin((enemy.floatTime || 0) * 4) * 1.5;
        this.ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2 + 3, coreR, 0, Math.PI * 2);
        this.ctx.fill();

      } else if (enemy.type === 'scout') {
        // Cybernetic sniper/scout mech
        this.ctx.fillStyle = '#1e1b4b';
        this.ctx.strokeStyle = enemy.color;
        this.ctx.lineWidth = 2;
        
        // Rounded head and body armor
        this.ctx.beginPath();
        this.ctx.roundRect(enemy.x, enemy.y, enemy.width, enemy.height, 6);
        this.ctx.fill();
        this.ctx.stroke();

        // Laser lens
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(enemy.x + 5, enemy.y + 10, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Jet flame on bottom (Pink/White hover)
        const flameH = 6 + Math.floor(Math.random() * 8);
        const grad = this.ctx.createLinearGradient(enemy.x + enemy.width / 2, enemy.y + enemy.height, enemy.x + enemy.width / 2, enemy.y + enemy.height + flameH);
        grad.addColorStop(0, '#ec4899');
        grad.addColorStop(1, 'rgba(236,72,153,0)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(enemy.x + 6, enemy.y + enemy.height, enemy.width - 12, flameH);
      }

      // Draw healthbar when damaged
      if (enemy.hp < enemy.maxHp) {
        const hbW = enemy.width;
        this.ctx.fillStyle = '#475569';
        this.ctx.fillRect(enemy.x, enemy.y - 8, hbW, 3);
        this.ctx.fillStyle = '#10b981';
        this.ctx.fillRect(enemy.x, enemy.y - 8, hbW * (enemy.hp / enemy.maxHp), 3);
      }

      this.ctx.restore();
    }

    // 7. Render PROJECTILES
    for (const proj of this.state.projectiles) {
      this.ctx.save();
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = proj.color;
      this.ctx.fillStyle = proj.color;

      if (proj.isPlayerProj) {
        // Horizontal laser lines
        this.ctx.fillRect(proj.x - 8, proj.y - 2, 16, 4);
      } else {
        // Enemy glowing spherical plasma energy ball
        this.ctx.beginPath();
        this.ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    // 8. Render PLAYER Hero Character
    const p = this.state.player;
    this.ctx.save();

    // Trailing/ghost images if speed boost is active
    if (p.speedTime > 0) {
      this.ctx.globalAlpha = 0.25;
      this.ctx.fillStyle = '#eab308';
      this.ctx.fillRect(p.x - 15, p.y + 2, p.width, p.height);
      this.ctx.fillRect(p.x - 30, p.y + 4, p.width, p.height);
      this.ctx.globalAlpha = 1.0;
    }

    // Hero design: Cyber Goggles skeletal animation system
    this.ctx.shadowBlur = p.speedTime > 0 ? 15 : 8;
    this.ctx.shadowColor = p.speedTime > 0 ? '#fbbf24' : '#10b981';

    // Suit color bases
    const suitColor = p.speedTime > 0 ? '#fbbf24' : '#10b981';
    this.ctx.strokeStyle = suitColor;
    this.ctx.lineWidth = 2.5;

    // Resolve active frame
    let frame: any;
    const isMovingForward = (this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['KeyA'] || this.keys['ArrowLeft'] || this.autoRun);
    
    if (!p.isGrounded) {
      if (p.vy < 0) {
        frame = jumpFrame;
      } else {
        frame = fallFrame;
      }
    } else if (isMovingForward) {
      frame = runningFrames[p.animFrame];
    } else {
      frame = idleFrames[p.animFrame];
    }

    // Save and translate to core character center to make flipping fluid
    this.ctx.save();
    this.ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
    if (p.facing === 'left') {
      this.ctx.scale(-1, 1);
    }

    const bobY = frame.torsoBob;
    const hBob = frame.headBob;

    // Torso armor suit drawing: Charcoal carbon fiber composite
    this.ctx.fillStyle = '#1e293b'; 
    this.ctx.strokeStyle = suitColor;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    const tw = 18 * frame.armorScaleX;
    const th = 20 * frame.armorScaleY;
    this.ctx.roundRect(-tw / 2, -10 + bobY, tw, th, 4);
    this.ctx.fill();
    this.ctx.stroke();

    // Helmet with cyan glowing visor
    this.ctx.save();
    this.ctx.shadowColor = '#38bdf8';
    this.ctx.fillStyle = '#1e293b';
    this.ctx.beginPath();
    this.ctx.arc(0, -20 + bobY + hBob, 7.5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Visor strip (Always facing forward relative to localized scale horizontal)
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.fillRect(1, -23 + bobY + hBob, 6.5, 4);
    this.ctx.restore();

    // Draw LIMBS with correct stroke width as lines connecting joints to tips!
    this.ctx.lineWidth = 3.5;
    this.ctx.lineCap = 'round';

    // LEFT LEG
    this.ctx.strokeStyle = '#475569'; // darker back leg layer
    this.ctx.beginPath();
    this.ctx.moveTo(frame.leftLeg.joint.x, frame.leftLeg.joint.y + bobY);
    this.ctx.lineTo(frame.leftLeg.tip.x, frame.leftLeg.tip.y);
    this.ctx.stroke();

    // RIGHT LEG
    this.ctx.strokeStyle = suitColor; // active green foreground leg
    this.ctx.beginPath();
    this.ctx.moveTo(frame.rightLeg.joint.x, frame.rightLeg.joint.y + bobY);
    this.ctx.lineTo(frame.rightLeg.tip.x, frame.rightLeg.tip.y);
    this.ctx.stroke();

    // LEFT ARM
    this.ctx.strokeStyle = '#475569';
    this.ctx.beginPath();
    this.ctx.moveTo(frame.leftArm.joint.x, frame.leftArm.joint.y + bobY);
    this.ctx.lineTo(frame.leftArm.tip.x, frame.leftArm.tip.y);
    this.ctx.stroke();

    // RIGHT ARM
    this.ctx.strokeStyle = suitColor;
    this.ctx.beginPath();
    this.ctx.moveTo(frame.rightArm.joint.x, frame.rightArm.joint.y + bobY);
    this.ctx.lineTo(frame.rightArm.tip.x, frame.rightArm.tip.y);
    this.ctx.stroke();

    this.ctx.restore(); // complete local translation

    // Jet boots flames (Speed powerup particles / rocket vertical drops)
    if (p.speedTime > 0 || !p.isGrounded) {
      const activeIntensity = frame.jetIntensity;
      const bootFlameH = (6 + Math.floor(Math.random() * 10)) * activeIntensity;
      const jetGrad = this.ctx.createLinearGradient(p.x, p.y + p.height, p.x, p.y + p.height + bootFlameH);
      jetGrad.addColorStop(0, '#f97316');
      jetGrad.addColorStop(0.4, '#fb7185');
      jetGrad.addColorStop(1, 'rgba(249,115,22,0)');
      this.ctx.fillStyle = jetGrad;
      this.ctx.fillRect(p.x + 3, p.y + p.height, p.width - 6, bootFlameH);
    }

    // 9. Draw ACTIVE FORCE-FIELD SHIELD (Glowing sphere around player)
    if (p.shieldTime > 0) {
      this.ctx.save();
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = '#a855f7'; // Purple core
      
      const rad = p.height * 0.72;
      const cntX = p.x + p.width / 2;
      const cntY = p.y + p.height / 2;

      const shieldGrad = this.ctx.createRadialGradient(cntX, cntY, rad - 4, cntX, cntY, rad + 4);
      shieldGrad.addColorStop(0, 'rgba(168, 85, 247, 0.15)');
      shieldGrad.addColorStop(0.7, 'rgba(168, 85, 247, 0.45)');
      shieldGrad.addColorStop(0.9, '#a855f7');
      shieldGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      this.ctx.fillStyle = shieldGrad;
      this.ctx.beginPath();
      this.ctx.arc(cntX, cntY, rad + 4, 0, Math.PI * 2);
      this.ctx.fill();

      // Translucent hex orbit line
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.globalAlpha = 0.5;
      this.ctx.lineWidth = 1.2;
      this.ctx.beginPath();
      this.ctx.arc(cntX, cntY, rad, p.shieldTime * 0.005, p.shieldTime * 0.005 + Math.PI * 0.8);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.arc(cntX, cntY, rad, p.shieldTime * 0.005 + Math.PI, p.shieldTime * 0.005 + Math.PI * 1.8);
      this.ctx.stroke();

      this.ctx.restore();
    }

    this.ctx.restore();

    // 10. Render PARTICLES
    for (const part of this.state.particles) {
      this.ctx.save();
      this.ctx.globalAlpha = part.alpha;
      this.ctx.fillStyle = part.color;
      
      this.ctx.beginPath();
      this.ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    }

    // Camera pop check
    this.ctx.restore();
  }

  // Draw background silhouettes with tech details
  private drawParallaxBuildings(offsetX: number, heightMin: number, heightSpread: number, alpha: number) {
    if (!this.ctx) return;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    const bldCount = 9;
    const bldWidth = this.width / bldCount + 10;
    
    // Deterministic layout offsets
    for (let i = 0; i < 11; i++) {
      const bx = offsetX + i * (bldWidth - 4);
      const bh = heightMin + (Math.sin(i * 1.7) + 1) * 0.5 * heightSpread;
      const by = 390 - bh;

      this.ctx.fillRect(bx, by, bldWidth, bh);

      // Micro glowing rectangular window lines on buildings
      this.ctx.fillStyle = '#ffffff';
      this.ctx.globalAlpha = alpha * 0.35;
      if (i % 2 === 0) {
        for (let wy = by + 25; wy < 380; wy += 35) {
          this.ctx.fillRect(bx + 10, wy, 4, 6);
          this.ctx.fillRect(bx + bldWidth - 14, wy, 4, 6);
        }
      }
      this.ctx.fillStyle = '#1e1b4b'; // Reset dark filler back
      this.ctx.globalAlpha = alpha;
    }
    this.ctx.restore();
  }
}
