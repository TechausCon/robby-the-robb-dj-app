import React from 'react';
import { SparklesIcon, LoaderIcon } from 'lucide-react';

interface AITipProps {
  onGetTip: () => void;
  tip: string;
  isLoading: boolean;
}

export const AITip: React.FC<AITipProps> = ({ onGetTip, tip, isLoading }) => {
  return (
    <div className="flex items-center space-x-3">
      {tip && (
        <p className="text-sm text-gray-400 italic bg-gray-700/50 px-3 py-1.5 rounded-md">
          "{tip}"
        </p>
      )}
      <button
        onClick={onGetTip}
        disabled={isLoading}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-purple-600/20 border-purple-500 text-purple-300 hover:bg-purple-600/40 transition-colors disabled:opacity-50 disabled:cursor-wait"
      >
        {isLoading ? (
          <LoaderIcon size={14} className="animate-spin" />
        ) : (
          <SparklesIcon size={14} />
        )}
        <span>{isLoading ? 'Thinking...' : 'Get AI Tip'}</span>
      </button>
    </div>
  );
};
