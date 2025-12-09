import { GestureType, HandLandmark } from '../types';

// Helper to calculate Euclidean distance between two 3D points
const distance = (p1: HandLandmark, p2: HandLandmark): number => {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2) +
    Math.pow(p1.z - p2.z, 2)
  );
};

export const detectGesture = (landmarks: HandLandmark[]): GestureType => {
  if (!landmarks || landmarks.length < 21) return GestureType.NONE;

  // Key landmarks
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const wrist = landmarks[0];

  // 1. PINCH DETECTION
  // Distance between thumb tip and index tip
  const pinchDist = distance(thumbTip, indexTip);
  if (pinchDist < 0.05) {
    return GestureType.PINCH;
  }

  // 2. FIST DETECTION
  // Check if fingertips are close to the palm (approximate by wrist or MCP joints)
  // A simple heuristic: average distance of tips to wrist is small
  const tips = [indexTip, middleTip, ringTip, pinkyTip];
  const avgDistToWrist = tips.reduce((acc, tip) => acc + distance(tip, wrist), 0) / 4;

  if (avgDistToWrist < 0.25) { // Threshold depends on coordinate normalization
    return GestureType.FIST;
  }

  // 3. OPEN PALM DETECTION
  // If tips are far from wrist and spread out
  if (avgDistToWrist > 0.4) {
    return GestureType.OPEN_PALM;
  }

  return GestureType.NONE;
};
