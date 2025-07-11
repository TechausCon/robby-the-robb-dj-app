// src/components/Deck/Deck.tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PlayIcon, PauseIcon, StopCircleIcon, UploadCloudIcon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';
import type { DeckId, Track, DeckState, Action, MidiMapping } from '../../../types';
import { HotCues } from '../HotCues';
import { LoopControls, calculateLoopTimes } from '../LoopControls';

interface DeckProps {
  deckState: DeckState;
  dispatch: React.Dispatch<Action>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  crossfader: number;
  audioContext: AudioContext | null;
  onToggleSync: () => void;
  onTogglePlay: () => void;
  loadingMessage: string | null;
  activeMapping?: MidiMapping; // NEU: falls du das Mapping auch auf Deck-Ebene brauchst!
}

// Die WaveformDisplay-Komponente bleibt unverändert...
const WaveformDisplay = ({
  audioBuffer,
  progress,
  trackLoaded,
  deckId,
  loadingMessage,
  zoom,
  beatGrid,
  currentTime,
  duration,
}: {
  audioBuffer?: AudioBuffer;
  progress: number;
  trackLoaded: boolean;
  deckId: DeckId;
  loadingMessage: string | null;
  zoom: number;
  beatGrid?: number[];
  currentTime: number;
  duration: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playheadColor = deckId === 'A' ? '#3b82f6' : '#f97316';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    ctx.clearRect(0, 0, width, height);

    const data = audioBuffer.getChannelData(0);
    const totalSamples = data.length;
    const centerY = height / 2;
    const playheadX = width / 2;
    const currentSample = Math.floor(totalSamples * (progress / 100));
    const visibleSamples = totalSamples / zoom;
    const startSample = Math.max(0, currentSample - (visibleSamples * (playheadX / width)));
    const samplesPerPixel = visibleSamples / width;

    for (let i = 0; i < width; i++) {
      const sampleStartIndex = Math.floor(startSample + (i * samplesPerPixel));
      const sampleEndIndex = Math.floor(sampleStartIndex + samplesPerPixel);
      if (sampleStartIndex >= totalSamples) continue;

      let min = 1.0;
      let max = -1.0;
      for (let j = sampleStartIndex; j < sampleEndIndex; j++) {
        if (j < 0 || j >= totalSamples) continue;
        const sample = data[j];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      if (min === 1.0 && max === -1.0) { min = 0; max = 0; }

      const yMax = (1 - max) * centerY;
      const yMin = (1 - min) * centerY;
      const barHeight = Math.max(1, yMin - yMax);
      
      const positionInTrack = sampleStartIndex / totalSamples;
      const isBeforeCurrent = i < playheadX;
      
      if (isBeforeCurrent) {
        ctx.fillStyle = `hsla(${positionInTrack * 360}, 50%, 30%, 0.8)`;
      } else {
        ctx.fillStyle = `hsla(${positionInTrack * 360}, 100%, 50%, 1)`;
      }
      
      ctx.fillRect(i, yMax, 1, barHeight);
    }

    if (beatGrid && beatGrid.length > 0) {
      const visibleDuration = duration / zoom;
      const startTime = Math.max(0, currentTime - (visibleDuration * (playheadX / width)));
      const endTime = startTime + visibleDuration;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;

      beatGrid.forEach((beatTime, index) => {
        if (beatTime >= startTime && beatTime <= endTime) {
          const x = ((beatTime - startTime) / visibleDuration) * width;
          
          if (index % 4 === 0) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;
          } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
          }
          
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      });

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = '10px monospace';
      beatGrid.forEach((beatTime, index) => {
        if (beatTime >= startTime && beatTime <= endTime && index % 4 === 0) {
          const x = ((beatTime - startTime) / visibleDuration) * width;
          const barNumber = Math.floor(index / 4) + 1;
          ctx.fillText(`${barNumber}`, x + 2, 12);
        }
      });
    }

    ctx.fillStyle = playheadColor;
    ctx.fillRect(playheadX - 1, 0, 2, height);
    
    ctx.shadowColor = playheadColor;
    ctx.shadowBlur = 10;
    ctx.fillRect(playheadX - 1, 0, 2, height);
    ctx.shadowBlur = 0;

  }, [audioBuffer, progress, playheadColor, zoom, beatGrid, currentTime, duration]);

  return (
    <div className="h-20 bg-gray-700 rounded-lg overflow-hidden relative select-none">
      {loadingMessage ? (
        <div className="absolute top-0 left-0 h-full w-full flex items-center justify-center z-10 bg-gray-800/90">
          <p className="text-gray-400 font-semibold animate-pulse">{loadingMessage}</p>
        </div>
      ) : !trackLoaded && (
        <div className="absolute top-0 left-0 h-full w-full flex items-center justify-center z-10 bg-gray-800/90">
          <p className="text-gray-500 font-semibold">LOAD TRACK</p>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full absolute top-0 left-0" />
    </div>
  );
};

export const Deck = React.memo(({
  deckState,
  dispatch,
  audioRef,
  crossfader,
  audioContext,
  onToggleSync,
  onTogglePlay,
  loadingMessage,
  activeMapping, // <- optional, ready für Mapping-basierte Props!
}: DeckProps) => {
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const lowShelfRef = useRef<BiquadFilterNode | null>(null);
  const midPeakingRef = useRef<BiquadFilterNode | null>(null);
  const highShelfRef = useRef<BiquadFilterNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isAudioGraphSetup = useRef(false);
  const loopIntervalRef = useRef<number | null>(null);
  
  const [zoom, setZoom] = useState(25);
  
  if (!deckState) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700/50 flex space-x-4 text-white items-center justify-center">
        Deck wird geladen...
      </div>
    );
  }

  const { id, track, isPlaying, playbackRate, syncedTo, progress, cuePoint, volume, low, mid, high, filter, hotCues, loop } = deckState;

  const handleZoomIn = () => { if (zoom < 50) setZoom(prevZoom => prevZoom * 1.2); };
  const handleZoomOut = () => { if (zoom > 2) setZoom(prevZoom => prevZoom / 1.2); };
  const handleTempoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTempo = parseFloat(e.target.value);
    dispatch({ type: 'SET_PLAYBACK_RATE', payload: newTempo });
  };

  const handleSetHotCue = (index: number, position: number) => dispatch({ type: 'SET_HOT_CUE', payload: { index, position } });
  const handleJumpToHotCue = (index: number) => {
    const cue = hotCues[index];
    if (cue.position !== null && audioRef.current) {
      audioRef.current.currentTime = cue.position;
      if (!isPlaying) dispatch({ type: 'TOGGLE_PLAY' });
    }
  };
  const handleDeleteHotCue = (index: number) => dispatch({ type: 'DELETE_HOT_CUE', payload: { index } });

  const handleSetLoop = (length: number) => {
    dispatch({ type: 'SET_LOOP', payload: { length } });
    if (track?.beatGrid && audioRef.current) {
      dispatch({ type: 'TOGGLE_LOOP' });
    }
  };
  const handleToggleLoop = () => dispatch({ type: 'TOGGLE_LOOP' });
  const handleExitLoop = () => dispatch({ type: 'EXIT_LOOP' });
  const handleHalveLoop = () => dispatch({ type: 'HALVE_LOOP' });
  const handleDoubleLoop = () => dispatch({ type: 'DOUBLE_LOOP' });

  useEffect(() => {
    if (loop.isActive && audioRef.current && track?.beatGrid) {
      const audio = audioRef.current;
      const { start, end } = calculateLoopTimes(track.beatGrid, audio.currentTime, loop.length);
      const checkLoop = () => { if (audio.currentTime >= end) audio.currentTime = start; };
      loopIntervalRef.current = window.setInterval(checkLoop, 10);
    } else if (loopIntervalRef.current) {
      clearInterval(loopIntervalRef.current);
      loopIntervalRef.current = null;
    }
    return () => { if (loopIntervalRef.current) clearInterval(loopIntervalRef.current); };
  }, [loop.isActive, loop.length, track?.beatGrid]);
  
  useEffect(() => {
    if (!audioContext || !audioRef.current || isAudioGraphSetup.current) return;
    const ctx = audioContext;
    sourceNodeRef.current = ctx.createMediaElementSource(audioRef.current);
    lowShelfRef.current = ctx.createBiquadFilter();
    lowShelfRef.current.type = 'lowshelf';
    lowShelfRef.current.frequency.value = 320;
    midPeakingRef.current = ctx.createBiquadFilter();
    midPeakingRef.current.type = 'peaking';
    midPeakingRef.current.frequency.value = 1000;
    midPeakingRef.current.Q.value = 0.5;
    highShelfRef.current = ctx.createBiquadFilter();
    highShelfRef.current.type = 'highshelf';
    highShelfRef.current.frequency.value = 3200;
    filterRef.current = ctx.createBiquadFilter();
    gainNodeRef.current = ctx.createGain();
    sourceNodeRef.current.connect(lowShelfRef.current).connect(midPeakingRef.current).connect(highShelfRef.current).connect(filterRef.current).connect(gainNodeRef.current).connect(ctx.destination);
    isAudioGraphSetup.current = true;
  }, [audioContext, audioRef]);

  const calculateGain = useCallback(() => {
    if (id === 'A' && crossfader > 50) return 1 - (crossfader - 50) / 50;
    if (id === 'B' && crossfader < 50) return crossfader / 50;
    return 1;
  }, [crossfader, id]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate, audioRef]);

  useEffect(() => {
    if (gainNodeRef.current && audioContext) {
      const finalVolume = (volume / 100) * calculateGain();
      gainNodeRef.current.gain.setTargetAtTime(Math.pow(finalVolume, 2), audioContext.currentTime, 0.01);
    }
  }, [volume, crossfader, calculateGain, audioContext]);

  useEffect(() => {
    if (!audioContext) return;
    const valueToDb = (v: number) => (v - 50) * 0.4;
    if (lowShelfRef.current) lowShelfRef.current.gain.setTargetAtTime(valueToDb(low), audioContext.currentTime, 0.01);
    if (midPeakingRef.current) midPeakingRef.current.gain.setTargetAtTime(valueToDb(mid), audioContext.currentTime, 0.01);
    if (highShelfRef.current) highShelfRef.current.gain.setTargetAtTime(valueToDb(high), audioContext.currentTime, 0.01);
  }, [low, mid, high, audioContext]);

  useEffect(() => {
    if (!filterRef.current || !audioContext) return;
    const node = filterRef.current;
    if (filter === 50) {
      node.type = 'allpass';
      node.frequency.value = 20000;
    } else if (filter < 50) {
      node.type = 'lowpass';
      node.frequency.setTargetAtTime(40 * Math.pow(8000 / 40, filter / 49), audioContext.currentTime, 0.01);
    } else {
      node.type = 'highpass';
      node.frequency.setTargetAtTime(40 * Math.pow(16000 / 40, (filter - 51) / 49), audioContext.currentTime, 0.01);
    }
  }, [filter, audioContext]);

  const handleCue = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) dispatch({ type: 'SET_CUE', payload: audio.currentTime });
    else dispatch({ type: 'JUMP_TO_CUE' });
  };

  useEffect(() => {
    if (!isPlaying && audioRef.current?.currentTime !== cuePoint) {
      if (audioRef.current && audioRef.current.readyState > 0) {
        audioRef.current.currentTime = cuePoint;
      }
    }
  }, [isPlaying, cuePoint, audioRef]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const trackTitle = loadingMessage ? ' ' : (track?.artist ? `${track.artist} - ${track.name}` : track?.name || 'No Track Loaded');
  const displayBpm = track?.bpm ? (Number(track.bpm) * playbackRate).toFixed(1) : null;
  const isSynced = syncedTo !== null;
  const syncButtonColor = isSynced ? (id === 'A' ? 'bg-blue-500 hover:bg-blue-400' : 'bg-orange-500 hover:bg-orange-400') : 'bg-gray-700 hover:bg-gray-600';

  return (
    <>
      <style>{`
        .pitch-fader { -webkit-appearance: slider-vertical; writing-mode: lr-tb; accent-color: ${id === 'A' ? '#3b82f6' : '#f97316'}; cursor: ns-resize; }
      `}</style>
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700/50 flex flex-col space-y-4 h-full">
        <audio ref={audioRef} src={track?.url} onEnded={() => dispatch({ type: 'TOGGLE_PLAY' })} crossOrigin="anonymous"/>
        
        <div className="flex space-x-4">
          <div className="flex-grow flex flex-col space-y-4">
            <div className="flex justify-between items-start">
              <h2 className={`text-2xl font-bold ${id === 'A' ? 'text-blue-400' : 'text-orange-400'}`}>DECK {id}</h2>
              <div className="text-right">
                <p className="text-sm font-semibold truncate max-w-48 h-5" title={trackTitle}>{trackTitle}</p>
                <div className="text-xs text-gray-400 flex justify-end space-x-2 items-center">
                  <span className="font-bold text-base text-gray-200 w-16 text-right">{displayBpm || "--.-"}</span>
                  <span>BPM</span>
                  <span>{formatTime(audioRef.current?.currentTime || 0)} / {formatTime(audioRef.current?.duration || 0)}</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
                <WaveformDisplay 
                  audioBuffer={track?.audioBuffer} 
                  progress={progress} 
                  trackLoaded={!!track} 
                  deckId={id} 
                  loadingMessage={loadingMessage} 
                  zoom={zoom}
                  beatGrid={track?.beatGrid}
                  currentTime={audioRef.current?.currentTime || 0}
                  duration={audioRef.current?.duration || 0}
                />
                <div className="absolute top-1 right-1 flex space-x-1 z-20">
                    <button onClick={handleZoomOut} className="w-7 h-7 rounded-md bg-gray-900/50 hover:bg-gray-900/80 text-white flex items-center justify-center transition-colors" title="Zoom Out"><ZoomOutIcon size={16} /></button>
                    <button onClick={handleZoomIn} className="w-7 h-7 rounded-md bg-gray-900/50 hover:bg-gray-900/80 text-white flex items-center justify-center transition-colors" title="Zoom In"><ZoomInIcon size={16} /></button>
                </div>
            </div>

            <div className="flex items-center justify-around">
              <button onClick={onTogglePlay} disabled={!track} className="p-3 bg-gray-700 rounded-full text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors">{isPlaying ? <PauseIcon size={20} /> : <PlayIcon size={20} />}</button>
              <button onClick={handleCue} disabled={!track} className="p-3 bg-gray-700 rounded-full text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"><StopCircleIcon size={20} /></button>
              <button onClick={onToggleSync} disabled={!track} className={`p-3 px-4 rounded-full text-white disabled:opacity-30 transition-colors ${syncButtonColor}`}><span className="text-xs font-bold">SYNC</span></button>
            </div>

            <HotCues deckId={id} hotCues={hotCues} currentTime={audioRef.current?.currentTime || 0} isPlaying={isPlaying} onSetHotCue={handleSetHotCue} onJumpToHotCue={handleJumpToHotCue} onDeleteHotCue={handleDeleteHotCue} />
            <LoopControls deckId={id} loopState={loop} currentTime={audioRef.current?.currentTime || 0} bpm={track?.bpm} beatGrid={track?.beatGrid} onSetLoop={handleSetLoop} onToggleLoop={handleToggleLoop} onExitLoop={handleExitLoop} onHalveLoop={handleHalveLoop} onDoubleLoop={handleDoubleLoop} />
          </div>

          <div className="flex flex-col items-center w-16 h-full justify-between py-4">
              <span className="text-xs text-gray-400 font-semibold">+8%</span>
              <div className="relative flex-1 w-full my-2 flex justify-center items-center">
                  <div className="w-1.5 h-full bg-gray-900 rounded-full absolute"><div className="h-0.5 w-4 bg-gray-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div></div>
                  <input type="range" min="0.92" max="1.08" step="0.0005" value={playbackRate} onChange={handleTempoChange} className="pitch-fader h-full w-8" disabled={!track} />
              </div>
              <span className="text-xs text-gray-400 font-semibold">-8%</span>
              <div className="h-6 flex items-center"><span className="font-mono text-sm font-bold text-gray-300 tabular-nums">{((playbackRate - 1) * 100).toFixed(2)}%</span></div>
          </div>
        </div>
      </div>
    </>
  );
});
