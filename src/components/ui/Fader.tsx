import React from 'react';

interface FaderProps {
  value: number; // 0-100
  onChange: (value: number) => void;
  color?: 'blue' | 'orange';
}

const colorClasses = {
  blue: 'bg-blue-500',
  orange: 'bg-orange-500',
};

export const Fader: React.FC<FaderProps> = ({ value, onChange, color = 'blue' }) => {
  return (
    <div className="flex-grow flex items-center justify-center py-2 w-full">
      <div className="relative h-48 w-12">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-full bg-gray-900 rounded-full"></div>
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="appearance-none bg-transparent w-48 h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer origin-center -rotate-90"
          style={{ '--thumb-color': color === 'blue' ? '#3b82f6' : '#f97316' } as React.CSSProperties}
        />
        <style>{`
          input[type=range].appearance-none::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 40px;
            width: 20px;
            background-color: var(--thumb-color);
            border-radius: 4px;
            border: 2px solid #1f2937;
            margin-top: -14px; /* You need to specify a margin in Chrome, but in Firefox and IE it is automatic */
          }
          input[type=range].appearance-none::-moz-range-thumb {
            height: 36px;
            width: 16px;
            background-color: var(--thumb-color);
            border-radius: 4px;
            border: 2px solid #1f2937;
          }
        `}</style>
      </div>
    </div>
  );
};
