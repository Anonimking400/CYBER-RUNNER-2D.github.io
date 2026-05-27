/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PowerUpType = 'shield' | 'speed' | 'heal' | 'ammo';
export type EnemyType = 'crawler' | 'drone' | 'scout';

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  isGrounded: boolean;
  isJumping: boolean;
  doubleJumpAvailable: boolean;
  stompCombo: number;
  
  // Stats
  hp: number;
  maxHp: number;
  score: number;
  highScore: number;
  ammo: number;
  maxAmmo: number;
  
  // Power-up durations (in ms / remaining frames)
  shieldTime: number; // > 0 means active
  speedTime: number;  // > 0 means active
  
  // Aesthetics/Animations
  animFrame: number;
  animTimer: number;
  facing: 'right' | 'left';
  shootCooldown: number;
}

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  floatAmplitude?: number;
  floatSpeed?: number;
  floatTime?: number;
  shootCooldown: number;
  shootInterval: number;
  points: number;
  color: string;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  isPlayerProj: boolean; // Fired by player vs enemy
  damage: number;
}

export interface PowerUp {
  id: string;
  type: PowerUpType;
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  floatTime: number;
  color: string;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  isDamaging?: boolean; // spiked platform
  isMoving?: boolean;
  startY?: number;
  moveRange?: number;
  moveSpeed?: number;
  angle?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  gravity?: number;
}

export interface LevelGoal {
  x: number;
  y: number;
  width: number;
  height: number;
  isActive: boolean;
  color: string;
  pulseTimer: number;
}

export interface Checkpoint {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isActivated: boolean;
  color: string;
  distance: number;
  name: string;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  level: number;
  date: string;
}

export interface GameConfig {
  gravity: number;
  maxLevels: number;
  baseSpeed: number;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  powerups: PowerUp[];
  platforms: Platform[];
  particles: Particle[];
  goal: LevelGoal | null;
  checkpoints: Checkpoint[];
  lastActiveCheckpoint: {
    id: string;
    distance: number;
    level: number;
    score: number;
    name: string;
  } | null;
  
  // Environmental stats
  distanceCovered: number;
  distanceToGoal: number; // Total distance required to trigger checkpoint/goal
  currentLevel: number;
  gameSpeed: number;
  isGameOver: boolean;
  isPaused: boolean;
  hasStarted: boolean;
  score: number;
  
  // Spawning frequencies
  enemySpawnTimer: number;
  powerupSpawnTimer: number;
}
