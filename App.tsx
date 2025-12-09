import React from 'react';
import Experience from './components/Experience';
import HandManager from './components/HandManager';
import Overlay from './components/UI/Overlay';

const App: React.FC = () => {
  return (
    <div className="w-screen h-screen relative bg-black overflow-hidden select-none">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Experience />
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <Overlay />
      </div>

      {/* Logic & Camera (Hidden or Corner) */}
      <HandManager />
    </div>
  );
};

export default App;
