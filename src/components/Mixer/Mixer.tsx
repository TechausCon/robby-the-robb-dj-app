import React from 'react';
import { DeckState, Action } from '../types';
import { Knob } from './ui/Knob';
import { Fader } from './ui/Fader';

interface MixerProps {
  deckAState: DeckState;
  dispatchA: React.Dispatch<Action>;
  deckBState: DeckState;
  dispatchB: React.Dispatch<Action>;
  crossfader: number;
  setCrossfader: (value: number) => void;
}

const ChannelStrip: React.FC<{
  deckState: DeckState,
  dispatch: React.Dispatch<Action>
}> = ({ deckState, dispatch }) => {
  const { id, volume, low, mid, high, filter } = deckState;
  const color = id === 'A' ? 'blue' : 'orange';
  const knobColor = id === 'A' ? 'blue' : 'orange';

  return (
    <div className="flex flex-col items-center space-y-4 flex-1 bg-gray-900/50 p-2 rounded-lg">
      <div className="grid grid-cols-2 gap-y-4 gap-x-2">
        <Knob label="HI" value={high} onChange={(v) => dispatch({ type: 'SET_HIGH', payload: v })} color={knobColor} />
        <Knob label="MID" value={mid} onChange={(v) => dispatch({ type: 'SET_MID', payload: v })} color={knobColor} />
        <Knob label="LOW" value={low} onChange={(v) => dispatch({ type: 'SET_LOW', payload: v })} color={knobColor} />
        <Knob label="FLTR" value={filter} onChange={(v) => dispatch({ type: 'SET_FILTER', payload: v })} color={knobColor} />
      </div>
      <Fader
        value={volume}
        onChange={(v) => dispatch({ type: 'SET_VOLUME', payload: v })}
        color={color}
      />
    </div>
  )
}

export const Mixer: React.FC<MixerProps> = ({
  deckAState,
  dispatchA,
  deckBState,
  dispatchB,
  crossfader,
  setCrossfader
}) => {
  return (
    <div className="bg-gray-800 h-full p-2 rounded-lg border border-gray-700/50 flex flex-col justify-between items-center space-y-4">
      <h3 className="text-lg font-bold text-gray-400 tracking-widest">MIXER</h3>
      
      <div className="w-full flex justify-between items-start space-x-2 flex-grow">
        <ChannelStrip deckState={deckAState} dispatch={dispatchA} />
        <ChannelStrip deckState={deckBState} dispatch={dispatchB} />
      </div>

      <div className="w-full flex flex-col items-center pt-2">
        <label htmlFor="crossfader" className="text-xs font-medium text-gray-400 mb-1">X-FADER</label>
        <input
          id="crossfader"
          type="range"
          min="0"
          max="100"
          value={crossfader}
          onChange={(e) => setCrossfader(Number(e.target.value))}
          className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg"
          style={{
             background: `linear-gradient(to right, #60a5fa ${crossfader}%, #fb923c ${crossfader}%)`
          }}
        />
        <div className="w-full flex justify-between text-xs font-bold mt-1">
          <span className="text-blue-400">A</span>
          <span className="text-orange-400">B</span>
        </div>
      </div>
    </div>
  );
};
