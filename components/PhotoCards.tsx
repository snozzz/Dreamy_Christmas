
import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Image } from '@react-three/drei';
import { useAppStore } from '../store';
import { GestureType } from '../types';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      planeGeometry: any;
      meshBasicMaterial: any;
    }
  }
}

interface PhotoProps {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  url: string;
  isFocused: boolean;
  isTreeMode: boolean;
  treePos: THREE.Vector3;
}

const PhotoCard: React.FC<PhotoProps> = ({ position, rotation, url, isFocused, isTreeMode, treePos }) => {
  const meshRef = useRef<THREE.Group>(null);
  const { gesture } = useAppStore();
  const { camera } = useThree();

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Default Target Calculation
    let targetPos = isTreeMode ? treePos : position;
    let targetScale = isTreeMode ? 0.6 : 1.2;
    let targetRot = isTreeMode ? new THREE.Euler(0, 0, 0) : rotation;

    const isPinching = gesture === GestureType.PINCH;

    // Interaction Overrides
    if (!isTreeMode) {
        if (isFocused) {
            targetScale = 1.6;
            // Slight hover for focused card in normal mode
            targetPos = targetPos.clone().add(new THREE.Vector3(0, 0.2, 0)); 
        }

        if (isPinching && isFocused) {
            // LIGHTBOX MODE LOGIC
            
            // --- FIT TO SCREEN CALCULATION ---
            // Camera Z is 12. Target Z is 9.5. Distance is 2.5.
            // Visible Height at distance d = 2 * d * tan(fov/2)
            // 2 * 2.5 * tan(30deg) ~= 2.88 units.
            // If we want margins, max height should be around 2.4 - 2.5.
            // Default plane is 1x1. So scale should be ~2.2 to fit nicely.
            targetScale = 2.2; 

            // 2. Calculate Centered Position
            // We want the card to appear at World Coordinates (0, 0, 9.5) so it's right in front of the camera (0,0,12).
            // However, this card is inside a parent Group that is rotating.
            // We must transform the desired World Position into Local Position.
            // Local = World * InverseParentMatrix
            
            const parent = meshRef.current.parent;
            if (parent) {
                // Approximate inverse rotation logic since we only rotate Y
                const parentRotY = parent.rotation.y;
                
                // Desired World Position
                const worldVec = new THREE.Vector3(0, 0, 9.5);
                
                // Rotate it backwards by the parent's current rotation to find where it should be locally
                worldVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), -parentRotY);
                
                targetPos = worldVec;
            }
        }
    }

    // Smooth Animation
    meshRef.current.position.lerp(targetPos, delta * 5); // Faster lerp for responsiveness
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5);
    
    // Rotation Logic
    if (isPinching && isFocused && !isTreeMode) {
        // Look at camera creates a flat plane facing the user
        meshRef.current.lookAt(camera.position);
    } else if (isTreeMode) {
        // Look at center column
        meshRef.current.lookAt(new THREE.Vector3(0, targetPos.y, 0)); 
    } else {
        // Normal Ring Rotation
        const q = new THREE.Quaternion().setFromEuler(targetRot);
        meshRef.current.quaternion.slerp(q, delta * 4);
    }
  });

  // Render Order: High priority when zooming to overlay everything
  const isPinching = gesture === GestureType.PINCH;
  const renderOrder = isFocused && isPinching ? 999 : 1;

  return (
    <group ref={meshRef} renderOrder={renderOrder}>
      <Image url={url} transparent opacity={isFocused || isTreeMode ? 1 : 0.6} side={THREE.DoubleSide} />
      {/* Frame border */}
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[1.05, 1.05]} />
        <meshBasicMaterial 
            color={isFocused && !isTreeMode ? "#ffd700" : "#ffffff"} 
            toneMapped={false} 
        />
      </mesh>
    </group>
  );
};

// Reliable static Picsum IDs
const IMAGE_URLS = [
  "https://picsum.photos/id/10/500/500", 
  "https://picsum.photos/id/11/500/500", 
  "https://picsum.photos/id/12/500/500", 
  "https://picsum.photos/id/13/500/500", 
  "https://picsum.photos/id/14/500/500", 
  "https://picsum.photos/id/15/500/500", 
  "https://picsum.photos/id/16/500/500", 
  "https://picsum.photos/id/17/500/500", 
  "https://picsum.photos/id/18/500/500", 
  "https://picsum.photos/id/19/500/500", 
  "https://picsum.photos/id/20/500/500", 
  "https://picsum.photos/id/28/500/500", 
];

const PhotoCards: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const { gesture, handPosition } = useAppStore();
  
  // Carousel State
  const [carouselRotation, setCarouselRotation] = useState(0);
  const rotationVelocity = useRef(0);
  const lastHandX = useRef(0.5);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const radius = 7;
  const count = IMAGE_URLS.length;

  const images = useMemo(() => {
    return IMAGE_URLS.map((url, i) => {
      // Ring Position
      const angle = (i / count) * Math.PI * 2;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      
      // Tree Position
      const yRatio = i / count;
      const treeY = yRatio * 8 - 4;
      const treeR = 4 * (1.0 - yRatio) + 0.5;
      const treeAngle = i * 0.8; 
      const tx = Math.cos(treeAngle) * treeR;
      const tz = Math.sin(treeAngle) * treeR;

      return {
        url: url, 
        ringPos: new THREE.Vector3(x, 0, z),
        ringRot: new THREE.Euler(0, angle, 0),
        treePos: new THREE.Vector3(tx, treeY, tz),
        baseAngle: angle
      };
    });
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const isTree = gesture === GestureType.FIST;
    const isPinching = gesture === GestureType.PINCH;

    // 1. ROTATION LOGIC
    // Disable rotation interaction if we are pinching (zooming) to keep it stable
    if (!isTree && !isPinching) {
        if (gesture === GestureType.OPEN_PALM) {
            const deltaX = handPosition.x - lastHandX.current;
            rotationVelocity.current += deltaX * 40 * delta;
        }
    }
    
    // Friction
    rotationVelocity.current *= 0.92;
    
    // Auto drift if idle
    if (Math.abs(rotationVelocity.current) < 0.001 && !isPinching && !isTree) {
         rotationVelocity.current = 0.05 * delta; 
    }
    
    // Force stop if pinching to prevent nausea/jitter
    if (isPinching) {
        rotationVelocity.current = 0;
    }

    const newRot = groupRef.current.rotation.y + rotationVelocity.current;
    groupRef.current.rotation.y = newRot;
    
    lastHandX.current = handPosition.x;

    // 2. FOCUS LOGIC
    if (!isTree) {
        let maxCos = -1;
        let bestIdx = 0;

        images.forEach((img, i) => {
            const worldAngle = img.baseAngle + newRot;
            const c = Math.cos(worldAngle);
            if (c > maxCos) {
                maxCos = c;
                bestIdx = i;
            }
        });
        
        if (focusedIndex !== bestIdx) {
            setFocusedIndex(bestIdx);
        }
    } else {
        setFocusedIndex(null);
        // Reset rotation in tree mode
        groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, 0, delta);
    }
  });

  return (
    <group ref={groupRef}>
      {images.map((img, i) => (
        <PhotoCard 
            key={i} 
            {...img} 
            position={img.ringPos} 
            rotation={img.ringRot}
            isFocused={i === focusedIndex}
            isTreeMode={gesture === GestureType.FIST}
        />
      ))}
    </group>
  );
};

export default PhotoCards;
