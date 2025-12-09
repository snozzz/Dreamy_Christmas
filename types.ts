export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export enum GestureType {
  NONE = 'NONE',
  FIST = 'FIST', // Form tree
  OPEN_PALM = 'OPEN_PALM', // Scatter / Explode
  PINCH = 'PINCH', // Select item
}

export interface AppState {
  gesture: GestureType;
  handPosition: { x: number; y: number }; // Normalized 0-1
  isPinching: boolean;
  setGesture: (g: GestureType) => void;
  setHandPosition: (pos: { x: number; y: number }) => void;
  setIsPinching: (b: boolean) => void;
}

export interface ParticleData {
  initialPos: [number, number, number];
  treePos: [number, number, number];
  color: [number, number, number];
  size: number;
}
