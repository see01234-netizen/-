import React from 'react';
import { Horse, PredictionResult } from '../types';

interface TrackVisualizationProps {
  horses: Horse[];
  predictions: PredictionResult[];
}

// Gate Colors (Consistent with KRA/RaceTable)
const getGateStyle = (index: number) => {
  const styles = [
    { bg: 'bg-white', text: 'text-black', border: 'border-slate-300', shadow: 'shadow-white/50' },       // 1
    { bg: 'bg-yellow-400', text: 'text-black', border: 'border-yellow-500', shadow: 'shadow-yellow-400/50' }, // 2
    { bg: 'bg-red-600', text: 'text-white', border: 'border-red-700', shadow: 'shadow-red-600/50' },       // 3
    { bg: 'bg-black', text: 'text-white', border: 'border-slate-600', shadow: 'shadow-slate-900/50' },       // 4
    { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700', shadow: 'shadow-blue-600/50' },     // 5
    { bg: 'bg-green-600', text: 'text-white', border: 'border-green-700', shadow: 'shadow-green-600/50' },   // 6
    { bg: 'bg-amber-800', text: 'text-white', border: 'border-amber-900', shadow: 'shadow-amber-800/50' },   // 7
    { bg: 'bg-pink-400', text: 'text-white', border: 'border-pink-500', shadow: 'shadow-pink-400/50' },     // 8
    { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-700', shadow: 'shadow-purple-600/50' }, // 9
    { bg: 'bg-sky-400', text: 'text-black', border: 'border-sky-500', shadow: 'shadow-sky-400/50' },       // 10
  ];
  return styles[index % styles.length];
};

export const TrackVisualization: React.FC<TrackVisualizationProps> = ({ horses, predictions }) => {
  // Sort predictions by win probability to determine rank
  const sortedPredictions = [...predictions].sort((a, b) => b.winProbability - a.winProbability);

  // Combine horse data with prediction data and calculate rank-based position
  const visualData = horses.map((horse, index) => {
    const pred = predictions.find(p => p.horseName === horse.name);
    
    // Determine finish rank based on probability (0-based index)
    let rankIndex = -1;
    if (pred) {
      rankIndex = sortedPredictions.findIndex(p => p.horseName === horse.name);
    }

    // Calculate X position based on Rank
    // 1st place (Rank 0) is closest to finish (Right ~92%)
    // Last place is furthest back (Left ~12%)
    const totalHorses = horses.length || 1;
    const spreadRange = 80; // Uses 80% of the width
    const step = totalHorses > 1 ? spreadRange / (totalHorses - 1) : 0;
    
    // Default to start if no prediction, otherwise calculate linear position
    // BaseX calculation: 92 (Finish) - (Rank * Step)
    const baseX = rankIndex !== -1 ? 92 - (rankIndex * step) : 10;
    
    // Tiny random offset for natural look, but keeping strict order visibility
    const randomOffset = (Math.random() * 1.5) - 0.75;

    // Y Position: Gate 1 at bottom (Inner Rail), Gate N at top (Outer Rail)
    const laneHeight = 80 / totalHorses; 
    const yPos = 88 - (index * laneHeight); // 88% down to leave space for rail

    return {
      ...horse,
      gateNo: index + 1,
      rank: rankIndex !== -1 ? rankIndex + 1 : '?',
      x: Math.min(98, Math.max(2, baseX + randomOffset)),
      y: yPos,
      prediction: pred
    };
  });

  return (
    <div className="w-full bg-slate-800 border border-slate-600 rounded-xl overflow-hidden shadow-xl mt-4 md:mt-6">
      <div className="p-3 md:p-4 bg-slate-800 border-b border-slate-600 flex justify-between items-center">
        <h3 className="font-bold text-emerald-400 flex items-center gap-2 text-sm md:text-base">
          <span className="text-lg md:text-xl">🏁</span> 예상 결승선 통과 순서
        </h3>
        <div className="hidden sm:flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1">◀ 후미</span>
          <span className="flex items-center gap-1">우승 ▶</span>
        </div>
      </div>
      
      {/* Track Surface */}
      <div className="relative w-full h-60 md:h-72 bg-[#2d5a35] overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
        
        {/* Grass Texture */}
        <div className="absolute inset-0 opacity-40" 
             style={{ backgroundImage: 'radial-gradient(#1a3c22 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
        </div>
        
        {/* Distance Lines */}
        <div className="absolute top-0 bottom-0 left-[25%] w-px bg-white/20 border-l border-dashed border-white/40"></div>
        <div className="absolute top-0 bottom-0 left-[50%] w-px bg-white/20 border-l border-dashed border-white/40"></div>
        <div className="absolute top-0 bottom-0 left-[75%] w-px bg-white/20 border-l border-dashed border-white/40"></div>
        
        {/* Finish Line (Right side) */}
        <div className="absolute top-0 bottom-0 right-8 md:right-12 w-6 md:w-8 bg-white/10 flex items-center justify-center">
            <div className="h-full w-1 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1)] z-0"></div>
        </div>
        <div className="absolute top-2 right-2 md:right-4 text-[8px] md:text-[10px] font-black text-red-400 tracking-widest rotate-90 origin-right">FINISH</div>

        {/* Rails */}
        <div className="absolute top-3 left-0 right-0 h-2 bg-slate-300 border-b-2 border-slate-400 shadow-md z-10"></div> {/* Outer Rail */}
        <div className="absolute bottom-3 left-0 right-0 h-2 bg-slate-300 border-t-2 border-slate-400 shadow-md z-10"></div> {/* Inner Rail */}

        {/* Horses */}
        {visualData.map((horse, idx) => {
          const style = getGateStyle(idx);
          const isWinner = horse.rank === 1;

          return (
            <div 
              key={horse.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-all duration-1000 ease-out z-20"
              style={{ 
                left: `${horse.x}%`, 
                top: `${horse.y}%`,
                zIndex: isWinner ? 30 : 20
              }}
            >
              {/* Horse Marker */}
              <div 
                className={`
                  w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center font-black text-xs md:text-sm border-2
                  ${style.bg} ${style.text} ${style.border} ${style.shadow}
                  group-hover:scale-125 transition-transform relative
                  ${isWinner ? 'ring-2 md:ring-4 ring-emerald-500/50 scale-110' : ''}
                `}
              >
                {horse.gateNo}
                
                {/* Speed Lines for leaders */}
                {isWinner && (
                  <div className={`absolute right-full top-1/2 -translate-y-1/2 w-6 md:w-8 h-4 md:h-6 bg-gradient-to-l from-white/40 to-transparent blur-[2px] -z-10 rounded-l-full`}></div>
                )}
              </div>

              {/* Tooltip on Hover (or Click on Touch) */}
              <div className="absolute bottom-full mb-2 md:mb-3 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 text-white text-[10px] md:text-xs py-1 px-2 md:py-1.5 md:px-3 rounded-lg border border-slate-500 whitespace-nowrap z-50 pointer-events-none shadow-xl transform group-hover:-translate-y-1">
                 <div className="flex items-center gap-2 mb-1">
                   <span className={`w-3 h-3 md:w-4 md:h-4 rounded-full flex items-center justify-center text-[8px] md:text-[9px] font-bold ${style.bg} ${style.text}`}>{horse.gateNo}</span>
                   <span className="font-bold">{horse.name}</span>
                 </div>
                 <span className="block text-emerald-400 font-mono text-center bg-slate-800 rounded px-1">
                    예상 {horse.rank}위 ({horse.prediction?.winProbability}%)
                 </span>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="bg-slate-800 px-3 py-2 md:px-4 md:py-3 text-[10px] md:text-[11px] text-slate-400 flex justify-between border-t border-slate-600">
        <span className="flex items-center gap-1 truncate">📌 우측(결승선)에 가까울수록 우승 확률이 높습니다.</span>
      </div>
    </div>
  );
};