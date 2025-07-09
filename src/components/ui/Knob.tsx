import React, { useState, useRef, useEffect, useCallback } from 'react';

interface KnobProps {
  label: string;
  value: number; // 0-100
  onChange: (value: number) => void;
  color?: 'cyan' | 'blue' | 'orange';
}

const colorClasses = {
  cyan: 'bg-cyan-400',
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
};

export const Knob: React.FC<KnobProps> = ({ label, value, onChange, color = 'cyan' }) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(0);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const deltaY = startY - e.clientY;
    const newValue = Math.max(0, Math.min(100, startValue + deltaY));
    onChange(newValue);
  }, [isDragging, startY, startValue, onChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.cursor = 'default';
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setStartY(e.clientY);
    setStartValue(value);
    document.body.style.cursor = 'ns-resize';
  };

  const rotation = (value / 100) * 270 - 135;

  return (
    <div className="flex flex-col items-center space-y-1">
      <div
        ref={knobRef}
        className="w-12 h-12 bg-gray-800 rounded-full border-2 border-gray-600 flex items-center justify-center cursor-pointer relative shadow-inner"
        onMouseDown={handleMouseDown}
      >
        <div 
            className="w-full h-full absolute top-0 left-0"
            style={{ transform: `rotate(${rotation}deg)` }}
        >
             <div className={`w-1.5 h-4 ${colorClasses[color]} absolute top-0 left-1/2 -ml-[3px] rounded-full`}></div>
        </div>
      </div>
      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
    </div>
  );
};
