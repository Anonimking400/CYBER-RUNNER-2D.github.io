/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface JointOffset {
  x: number;
  y: number;
}

export interface HandLegKeyframe {
  joint: JointOffset;
  tip: JointOffset;
}

export interface PlayerKeyframe {
  torsoBob: number;
  headBob: number;
  armorScaleX: number;
  armorScaleY: number;
  leftLeg: HandLegKeyframe;
  rightLeg: HandLegKeyframe;
  leftArm: HandLegKeyframe;
  rightArm: HandLegKeyframe;
  jetIntensity: number;
}

// 6-step Idle cycle (Calm breathing bobbing)
export const idleFrames: PlayerKeyframe[] = [
  {
    torsoBob: 0,
    headBob: 0,
    armorScaleX: 1.0,
    armorScaleY: 1.0,
    leftLeg: { joint: { x: -3, y: 12 }, tip: { x: -4, y: 22 } },
    rightLeg: { joint: { x: 3, y: 12 }, tip: { x: 4, y: 22 } },
    leftArm: { joint: { x: -8, y: 2 }, tip: { x: -10, y: 8 } },
    rightArm: { joint: { x: 8, y: 2 }, tip: { x: 10, y: 8 } },
    jetIntensity: 0.1
  },
  {
    torsoBob: 0.4,
    headBob: 0.2,
    armorScaleX: 1.01,
    armorScaleY: 0.99,
    leftLeg: { joint: { x: -3, y: 12 }, tip: { x: -4, y: 22 } },
    rightLeg: { joint: { x: 3, y: 12 }, tip: { x: 4, y: 22 } },
    leftArm: { joint: { x: -8, y: 3 }, tip: { x: -11, y: 9 } },
    rightArm: { joint: { x: 8, y: 3 }, tip: { x: 11, y: 9 } },
    jetIntensity: 0.12
  },
  {
    torsoBob: 0.8,
    headBob: 0.4,
    armorScaleX: 1.02,
    armorScaleY: 0.98,
    leftLeg: { joint: { x: -3, y: 12 }, tip: { x: -4, y: 22 } },
    rightLeg: { joint: { x: 3, y: 12 }, tip: { x: 4, y: 22 } },
    leftArm: { joint: { x: -8, y: 4 }, tip: { x: -12, y: 10 } },
    rightArm: { joint: { x: 8, y: 4 }, tip: { x: 12, y: 10 } },
    jetIntensity: 0.15
  },
  {
    torsoBob: 1.0,
    headBob: 0.5,
    armorScaleX: 1.02,
    armorScaleY: 0.98,
    leftLeg: { joint: { x: -3, y: 12 }, tip: { x: -4, y: 22 } },
    rightLeg: { joint: { x: 3, y: 12 }, tip: { x: 4, y: 22 } },
    leftArm: { joint: { x: -8, y: 4 }, tip: { x: -12, y: 10 } },
    rightArm: { joint: { x: 8, y: 4 }, tip: { x: 12, y: 10 } },
    jetIntensity: 0.14
  },
  {
    torsoBob: 0.6,
    headBob: 0.3,
    armorScaleX: 1.01,
    armorScaleY: 0.99,
    leftLeg: { joint: { x: -3, y: 12 }, tip: { x: -4, y: 22 } },
    rightLeg: { joint: { x: 3, y: 12 }, tip: { x: 4, y: 22 } },
    leftArm: { joint: { x: -8, y: 3 }, tip: { x: -11, y: 9 } },
    rightArm: { joint: { x: 8, y: 3 }, tip: { x: 11, y: 9 } },
    jetIntensity: 0.12
  },
  {
    torsoBob: 0.2,
    headBob: 0.1,
    armorScaleX: 1.0,
    armorScaleY: 1.0,
    leftLeg: { joint: { x: -3, y: 12 }, tip: { x: -4, y: 22 } },
    rightLeg: { joint: { x: 3, y: 12 }, tip: { x: 4, y: 22 } },
    leftArm: { joint: { x: -8, y: 2 }, tip: { x: -10, y: 8 } },
    rightArm: { joint: { x: 8, y: 2 }, tip: { x: 10, y: 8 } },
    jetIntensity: 0.1
  }
];

// 6-step highly dynamic athletic Running frames (joint rotations)
export const runningFrames: PlayerKeyframe[] = [
  {
    torsoBob: 1.5,
    headBob: 0.8,
    armorScaleX: 0.98,
    armorScaleY: 1.02,
    leftLeg: { joint: { x: -1, y: 14 }, tip: { x: 6, y: 22 } },   // Leg forward
    rightLeg: { joint: { x: 1, y: 10 }, tip: { x: -8, y: 18 } },  // Leg backward
    leftArm: { joint: { x: -5, y: 6 }, tip: { x: -10, y: 12 } },
    rightArm: { joint: { x: 5, y: 2 }, tip: { x: 10, y: -4 } },
    jetIntensity: 0.4
  },
  {
    torsoBob: 0.2,
    headBob: 0.1,
    armorScaleX: 1.0,
    armorScaleY: 1.0,
    leftLeg: { joint: { x: -1, y: 15 }, tip: { x: 3, y: 23 } },
    rightLeg: { joint: { x: 0, y: 11 }, tip: { x: -4, y: 19 } },
    leftArm: { joint: { x: -4, y: 5 }, tip: { x: -7, y: 11 } },
    rightArm: { joint: { x: 4, y: 3 }, tip: { x: 7, y: 0 } },
    jetIntensity: 0.55
  },
  {
    torsoBob: 1.4,
    headBob: 0.7,
    armorScaleX: 0.98,
    armorScaleY: 1.02,
    leftLeg: { joint: { x: -1, y: 10 }, tip: { x: -8, y: 18 } },  // Leg backward
    rightLeg: { joint: { x: 1, y: 14 }, tip: { x: 6, y: 22 } },   // Leg forward
    leftArm: { joint: { x: -5, y: 2 }, tip: { x: -9, y: -4 } },
    rightArm: { joint: { x: 5, y: 6 }, tip: { x: 9, y: 12 } },
    jetIntensity: 0.45
  },
  {
    torsoBob: 1.6,
    headBob: 0.9,
    armorScaleX: 0.97,
    armorScaleY: 1.03,
    leftLeg: { joint: { x: 1, y: 11 }, tip: { x: -6, y: 19 } },
    rightLeg: { joint: { x: -1, y: 15 }, tip: { x: 5, y: 23 } },
    leftArm: { joint: { x: -5, y: 3 }, tip: { x: -8, y: -1 } },
    rightArm: { joint: { x: 5, y: 5 }, tip: { x: 8, y: 10 } },
    jetIntensity: 0.6
  },
  {
    torsoBob: 0.1,
    headBob: 0.0,
    armorScaleX: 1.0,
    armorScaleY: 1.0,
    leftLeg: { joint: { x: 0, y: 13 }, tip: { x: -2, y: 21 } },
    rightLeg: { joint: { x: 0, y: 13 }, tip: { x: 2, y: 21 } },
    leftArm: { joint: { x: -3, y: 4 }, tip: { x: -5, y: 4 } },
    rightArm: { joint: { x: 3, y: 4 }, tip: { x: 5, y: 4 } },
    jetIntensity: 0.5
  },
  {
    torsoBob: 1.3,
    headBob: 0.6,
    armorScaleX: 0.99,
    armorScaleY: 1.01,
    leftLeg: { joint: { x: -1, y: 12 }, tip: { x: 4, y: 20 } },
    rightLeg: { joint: { x: 1, y: 12 }, tip: { x: -5, y: 20 } },
    leftArm: { joint: { x: -4, y: 5 }, tip: { x: -8, y: 8 } },
    rightArm: { joint: { x: 4, y: 3 }, tip: { x: 7, y: 2 } },
    jetIntensity: 0.45
  }
];

// Jumping Frame (Tension, legs tucked in, arms raised upwards, massive rocket boot flame)
export const jumpFrame: PlayerKeyframe = {
  torsoBob: -2.0,
  headBob: -1.0,
  armorScaleX: 0.92,
  armorScaleY: 1.08,
  leftLeg: { joint: { x: -4, y: 6 }, tip: { x: -7, y: 12 } },
  rightLeg: { joint: { x: 4, y: 6 }, tip: { x: 7, y: 12 } },
  leftArm: { joint: { x: -7, y: -2 }, tip: { x: -12, y: -10 } }, // raised arm
  rightArm: { joint: { x: 7, y: -2 }, tip: { x: 12, y: -10 } },
  jetIntensity: 1.0
};

// Falling Frame (Legs extended downwards, high speed drops air trails)
export const fallFrame: PlayerKeyframe = {
  torsoBob: 1.0,
  headBob: 0.5,
  armorScaleX: 0.95,
  armorScaleY: 1.05,
  leftLeg: { joint: { x: -2, y: 16 }, tip: { x: -3, y: 25 } },
  rightLeg: { joint: { x: 2, y: 16 }, tip: { x: 3, y: 25 } },
  leftArm: { joint: { x: -6, y: 6 }, tip: { x: -10, y: 14 } },
  rightArm: { joint: { x: 6, y: 6 }, tip: { x: 10, y: 14 } },
  jetIntensity: 0.2
};
