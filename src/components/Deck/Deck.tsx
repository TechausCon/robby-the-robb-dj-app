import React, { useEffect, useRef, useCallback } from 'react';
import { PlayIcon, PauseIcon, StopCircleIcon, UploadCloudIcon } from 'lucide-react';
import type { DeckState, Action, Track, DeckId } from '../types';

interface DeckProps {
  deckState: DeckState;
  dispatch: React.Dispatch<Action>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  crossfader: number;
  onLoadTrack: (file: File) => void;
  audioContext: AudioContext | null;
  onToggleSync: () => void;
  loadingMessage: string | null;
}

const WaveformDisplay = ({ audioBuffer, progress, trackLoaded, deckId, loadingMessage }: { audioBuffer?: AudioBuffer, progress: number, trackLoaded: boolean, deckId: DeckId, loadingMessage: string | null }): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playheadColor = deckId === 'A' ? '#3b82f6' : '#f97316';
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    ctx.clearRect(0, 0, width, height);

    if (!audioBuffer) return;

    const data = audioBuffer.getChannelData(0);
    const centerY = height / 2;
    const samplesPerPixel = Math.floor(data.length / width);
    const progressInPixels = width * (progress / 100);
    for (let i = 0; i < width; i++) {
      const start = i * samplesPerPixel;
      const end = start + samplesPerPixel;
      let min = 1.0; let max = -1.0;
      for (let j = start; j < end; j++) {
        const sample = data[j];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      const yMax = (1 - max) * centerY;
      const yMin = (1 - min) * centerY;
      const barHeight = Math.max(1, yMin - yMax);
      ctx.fillStyle = i < progressInPixels ? playheadColor : '#4b5563';
      ctx.fillRect(i, yMax, 1, barHeight);
    }
  }, [audioBuffer, progress, playheadColor]);

  return (
    <div className="h-20 bg-gray-700 rounded-lg overflow-hidden relative select-none">
      {loadingMessage ? (
        <div className="absolute top-0 left-0 h-full w-full flex items-center justify-center z-10">
          <p className="text-gray-400 font-semibold animate-pulse">{loadingMessage}</p>
        </div>
      ) : !trackLoaded && (
        <div className="absolute top-0 left-0 h-full w-full flex items-center justify-center z-10">
          <p className="text-gray-500 font-semibold">LOAD TRACK</p>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full absolute top-0 left-0" />
    </div>
  );
};

export const Deck = ({ deckState, dispatch, audioRef, crossfader, onLoadTrack, audioContext, onToggleSync, loadingMessage }: DeckProps): JSX.Element => {
  const { id, track, isPlaying, playbackRate, syncedTo, progress, cuePoint, volume, low, mid, high, filter } = deckState;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const lowShelfRef = useRef<BiquadFilterNode | null>(null);
  const midPeakingRef = useRef<BiquadFilterNode | null>(null);
  const highShelfRef = useRef<BiquadFilterNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const isAudioGraphSetup = useRef(false);
  
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
    const audio = audioRef.current;
    if (!audio || !audioContext) return;
    if (isPlaying) {
      audioContext.resume();
      audio.play().catch(e => console.error("Audio play failed:", e));
    } else {
      audio.pause();
    }
  }, [isPlaying, audioRef, audioContext]);
 
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.playbackRate = playbackRate;
    }
  }, [playbackRate, audioRef]);

  useEffect(() => {
    if (gainNodeRef.current && audioContext) {
      const finalVolume = (volume / 100) * calculateGain();
      const gainValue = Math.pow(finalVolume, 2);
      gainNodeRef.current.gain.setTargetAtTime(gainValue, audioContext.currentTime, 0.01);
    }
  }, [volume, crossfader, calculateGain, audioContext]);
  
  useEffect(() => {
    if (!audioContext) return;
    const valueToDb = (v: number) => (v - 50) * 0.4;
    if(lowShelfRef.current) lowShelfRef.current.gain.setTargetAtTime(valueToDb(low), audioContext.currentTime, 0.01);
    if(midPeakingRef.current) midPeakingRef.current.gain.setTargetAtTime(valueToDb(mid), audioContext.currentTime, 0.01);
    if(highShelfRef.current) highShelfRef.current.gain.setTargetAtTime(valueToDb(high), audioContext.currentTime, 0.01);
  }, [low, mid, high, audioContext]);
  
  useEffect(() => {
    if (!filterRef.current || !audioContext) return;
    const node = filterRef.current;
    const v = filter;
    if (v === 50) {
      node.type = 'allpass';
      node.frequency.value = 20000;
    } else if (v < 50) {
      node.type = 'lowpass';
      const minFreq = 40, maxFreq = 8000;
      node.frequency.setTargetAtTime(minFreq * Math.pow(maxFreq / minFreq, v / 49), audioContext.currentTime, 0.01);
    } else {
      node.type = 'highpass';
      const minFreq = 40, maxFreq = 16000;
      node.frequency.setTargetAtTime(minFreq * Math.pow(maxFreq / minFreq, (v - 51) / 49), audioContext.currentTime, 0.01);
    }
  }, [filter, audioContext]);

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio && audio.duration) {
      dispatch({ type: 'SET_PROGRESS', payload: (audio.currentTime / audio.duration) * 100 });
    }
  };

  const handleCue = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      dispatch({ type: 'SET_CUE', payload: audio.currentTime });
    } else {
      dispatch({ type: 'JUMP_TO_CUE' });
    }
  };

  useEffect(() => {
    if (deckState.isPlaying === false && audioRef.current?.currentTime !== deckState.cuePoint) {
      const audio = audioRef.current;
      if (audio && audio.readyState > 0) {
        audio.currentTime = deckState.cuePoint;
      }
    }
  }, [deckState.isPlaying, deckState.cuePoint, audioRef]);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onLoadTrack(e.target.files[0]);
    }
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRate = parseFloat(e.target.value);
    dispatch({ type: 'SET_PLAYBACK_RATE', payload: newRate });
  };
  
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
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700/50 flex space-x-4">
      <audio ref={audioRef} src={track?.url} onTimeUpdate={handleTimeUpdate} onEnded={() => dispatch({ type: 'TOGGLE_PLAY' })} crossOrigin="anonymous"/>
      <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      {/* Haupt-Deck-Steuerung */}
      <div className="flex-grow flex flex-col space-y-4">
        <div className="flex justify-between items-start">
          <h2 className={`text-2xl font-bold ${id === 'A' ? 'text-blue-400' : 'text-orange-400'}`}>DECK {id}</h2>
          <div className="text-right">
            <p className="text-sm font-semibold truncate max-w-48 h-5" title={trackTitle}>{trackTitle}</p>
            <div className="text-xs text-gray-400 flex justify-end space-x-2 items-center">
              <span className="font-bold text-base text-gray-200 w-16 text-right">
                {displayBpm ? displayBpm : "--.-"}
              </span>
              <span>BPM</span>
              <span>{formatTime(audioRef.current?.currentTime || 0)} / {formatTime(audioRef.current?.duration || 0)}</span>
            </div>
          </div>
        </div>
        
        <WaveformDisplay audioBuffer={track?.audioBuffer} progress={progress} trackLoaded={!!track} deckId={id} loadingMessage={loadingMessage}/>
        
        <div className="flex items-center justify-around">
          <button onClick={() => dispatch({ type: 'TOGGLE_PLAY' })} disabled={!track} className="p-3 bg-gray-700 rounded-full text-white disabled:opacity-30 disabled:cursor-not-_
