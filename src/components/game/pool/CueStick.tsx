import React from 'react';

interface CueStickProps {
  position: { x: number; y: number };
  rotation: number; // in degrees
  power: number; // 0-100
  tableWidth: number;
  tableHeight: number;
}

const CueStick: React.FC<CueStickProps> = ({
  position,
  rotation,
  power,
  tableWidth,
  tableHeight,
}) => {
  // Convert table coordinates to percentage for responsive design
  const left = (position.x / tableWidth) * 100;
  const top = (position.y / tableHeight) * 100;

  // Calculate cue stick length and width based on table size
  const cueLength = (tableWidth * 0.3); // Example: 30% of table width
  const cueWidth = (tableWidth * 0.005); // Example: 0.5% of table width

  // Adjust rotation origin to be at the cue ball end of the stick
  const transformOrigin = '100% 50%';

  return (
    <div
      className="absolute bg-gray-700 rounded-sm"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${cueLength}px`,
        height: `${cueWidth}px`,
        transform: `translate(-${cueLength}px, -${cueWidth / 2}px) rotate(${rotation}deg)`,
        transformOrigin: transformOrigin,
        transition: 'transform 0.1s ease-out', // Smooth movement
      }}
    />
  );
};

export default CueStick;