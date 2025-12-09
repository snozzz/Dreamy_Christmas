import { create } from 'zustand';
import { GestureType, AppState } from './types';

// Using Zustand for simple state management across the React tree
// This bridges the gap between the MediaPipe loop and the R3F loop
export const useAppStore = create<AppState>((set) => ({
  gesture: GestureType.OPEN_PALM,
  handPosition: { x: 0.5, y: 0.5 },
  isPinching: false,
  setGesture: (gesture) => set({ gesture }),
  setHandPosition: (handPosition) => set({ handPosition }),
  setIsPinching: (isPinching) => set({ isPinching }),
}));
