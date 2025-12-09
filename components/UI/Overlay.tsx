import React from 'react';
import { useAppStore } from '../../store';
import { GestureType } from '../../types';

const Overlay: React.FC = () => {
  const { gesture, isPinching, handPosition } = useAppStore();

  const getGestureText = () => {
    switch (gesture) {
      case GestureType.FIST: return "🎄 Tree Mode";
      case GestureType.OPEN_PALM: return "👋 Swipe to Rotate";
      case GestureType.PINCH: return "✨ Zooming Photo";
      default: return "Waiting for hand...";
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-red-400 drop-shadow-md">
            Dreamy Christmas
          </h1>
          <p className="text-white/70 mt-2 text-sm max-w-md">
            Shape the tree, explore the memories.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
          <span className="text-xl font-mono font-bold text-yellow-300">
            {getGestureText()}
          </span>
        </div>
      </div>

      {/* Hand Cursor Indicator */}
      <HandCursor />

      {/* Footer Instructions */}
      <div className="grid grid-cols-3 gap-4 text-center text-white/80 text-sm">
        <div className="bg-black/40 p-3 rounded-lg border border-white/10">
          <div className="font-bold text-yellow-400 mb-1">✊ FIST</div>
          <div>Form Tree</div>
        </div>
        <div className="bg-black/40 p-3 rounded-lg border border-white/10">
          <div className="font-bold text-cyan-400 mb-1">👋 SWIPE</div>
          <div>Rotate Gallery</div>
        </div>
        <div className="bg-black/40 p-3 rounded-lg border border-white/10">
          <div className="font-bold text-pink-400 mb-1">👌 PINCH</div>
          <div>Zoom Active Photo</div>
        </div>
      </div>
    </div>
  );
};

const HandCursor: React.FC = () => {
    const { handPosition, isPinching } = useAppStore();
    
    return (
        <div 
            className={`absolute w-8 h-8 rounded-full border-2 transition-transform duration-100 ease-out flex items-center justify-center
                ${isPinching ? 'border-green-400 scale-125 bg-green-400/20' : 'border-white/50 scale-100'}
            `}
            style={{
                left: `${handPosition.x * 100}%`,
                top: `${handPosition.y * 100}%`,
                transform: 'translate(-50%, -50%)'
            }}
        >
            <div className="w-1 h-1 bg-white rounded-full" />
        </div>
    )
}

export default Overlay;
