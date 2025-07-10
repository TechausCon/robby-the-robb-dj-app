import React, { useState, useEffect, useRef } from 'react';
import { Activity, Cpu, HardDrive, Zap } from 'lucide-react';

interface PerformanceStats {
  cpu: number;
  memory: number;
  audioLatency: number;
  frameRate: number;
}

export const PerformanceMonitor: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats>({
    cpu: 0,
    memory: 0,
    audioLatency: 0,
    frameRate: 60,
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(performance.now());

  useEffect(() => {
    let animationFrameId: number;
    
    const measurePerformance = () => {
      // Measure frame rate
      frameCountRef.current++;
      const currentTime = performance.now();
      const timeDiff = currentTime - lastFrameTimeRef.current;
      
      if (timeDiff >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / timeDiff);
        frameCountRef.current = 0;
        lastFrameTimeRef.current = currentTime;
        
        // Estimate CPU usage (simplified)
        const cpuEstimate = Math.min(100, Math.max(0, 100 - (fps / 60) * 100));
        
        // Get memory usage if available
        let memoryUsage = 0;
        if ('memory' in performance && (performance as any).memory) {
          const memory = (performance as any).memory;
          memoryUsage = Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
        }
        
        // Get audio latency
        const audioContext = (window as any).audioContext;
        const latency = audioContext ? Math.round(audioContext.baseLatency * 1000) : 0;
        
        setStats({
          cpu: cpuEstimate,
          memory: memoryUsage,
          audioLatency: latency,
          frameRate: fps,
        });
      }
      
      animationFrameId = requestAnimationFrame(measurePerformance);
    };
    
    measurePerformance();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const getStatusColor = (value: number, type: 'cpu' | 'fps' | 'latency') => {
    switch (type) {
      case 'cpu':
        if (value < 50) return 'text-green-400';
        if (value < 75) return 'text-yellow-400';
        return 'text-red-400';
      case 'fps':
        if (value >= 50) return 'text-green-400';
        if (value >= 30) return 'text-yellow-400';
        return 'text-red-400';
      case 'latency':
        if (value < 10) return 'text-green-400';
        if (value < 20) return 'text-yellow-400';
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isExpanded ? (
        <div className="bg-gray-900/95 backdrop-blur-sm rounded-lg border border-gray-700 p-4 shadow-2xl">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-300 flex items-center space-x-2">
              <Activity size={16} />
              <span>Performance</span>
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between space-x-8">
              <div className="flex items-center space-x-2 text-gray-400">
                <Cpu size={14} />
                <span>CPU</span>
              </div>
              <span className={`font-mono font-bold ${getStatusColor(stats.cpu, 'cpu')}`}>
                {stats.cpu.toFixed(0)}%
              </span>
            </div>
            
            <div className="flex items-center justify-between space-x-8">
              <div className="flex items-center space-x-2 text-gray-400">
                <HardDrive size={14} />
                <span>Memory</span>
              </div>
              <span className="font-mono font-bold text-gray-300">
                {stats.memory}%
              </span>
            </div>
            
            <div className="flex items-center justify-between space-x-8">
              <div className="flex items-center space-x-2 text-gray-400">
                <Zap size={14} />
                <span>Latency</span>
              </div>
              <span className={`font-mono font-bold ${getStatusColor(stats.audioLatency, 'latency')}`}>
                {stats.audioLatency}ms
              </span>
            </div>
            
            <div className="flex items-center justify-between space-x-8">
              <div className="flex items-center space-x-2 text-gray-400">
                <Activity size={14} />
                <span>FPS</span>
              </div>
              <span className={`font-mono font-bold ${getStatusColor(stats.frameRate, 'fps')}`}>
                {stats.frameRate}
              </span>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Status</span>
              <span className={`text-xs font-bold ${
                stats.cpu < 75 && stats.frameRate >= 30 && stats.audioLatency < 20
                  ? 'text-green-400'
                  : 'text-yellow-400'
              }`}>
                {stats.cpu < 75 && stats.frameRate >= 30 && stats.audioLatency < 20
                  ? 'Optimal'
                  : 'Caution'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className={`
            bg-gray-900/90 backdrop-blur-sm rounded-full p-3
            border border-gray-700 shadow-lg
            hover:bg-gray-800 transition-all duration-200
            flex items-center space-x-2
          `}
        >
          <Activity 
            size={16} 
            className={
              stats.cpu < 75 && stats.frameRate >= 30 
                ? 'text-green-400' 
                : 'text-yellow-400'
            } 
          />
          <span className="text-xs font-mono font-bold text-gray-300">
            {stats.frameRate} FPS
          </span>
        </button>
      )}
    </div>
  );
};