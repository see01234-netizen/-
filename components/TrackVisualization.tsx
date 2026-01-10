import React, { useState, useEffect, useRef } from 'react';
import { Horse, PredictionResult } from '../types';
import { Play, RotateCcw, Flag, Trophy } from 'lucide-react';

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
  // Animation States
  const [raceStatus, setRaceStatus] = useState<'idle' | 'racing' | 'finished'>('idle');
  const [progress, setProgress] = useState(0); // 0 to 100
  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  // Constants
  const DURATION = 5000; // 5 seconds race
  const FINISH_LINE_X = 92;
  const START_GATE_X = 5;

  // Reset simulation when data changes
  useEffect(() => {
    setRaceStatus('idle');
    setProgress(0);
    cancelAnimationFrame(requestRef.current);
  }, [horses, predictions]);

  const startSimulation = () => {
    setRaceStatus('racing');
    setProgress(0);
    startTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(animate);
  };

  const animate = (time: number) => {
    const elapsed = time - startTimeRef.current;
    const newProgress = Math.min((elapsed / DURATION) * 100, 100);
    
    setProgress(newProgress);

    if (newProgress < 100) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      setRaceStatus('finished');
    }
  };

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

    // --- Position Logic ---
    const totalHorses = horses.length || 1;
    const spreadRange = 80; 
    const step = totalHorses > 1 ? spreadRange / (totalHorses - 1) : 0;
    
    // Final Target X (Static View & End of Sim)
    // Winner lands at 92%, Last place lands further back
    const finalTargetX = rankIndex !== -1 ? FINISH_LINE_X - (rankIndex * (step * 0.4)) : 10; 
    // We reduced step multiplier (0.4) to keep them closer at the finish line like a real photo finish

    let currentX = 0;

    if (raceStatus === 'idle') {
      // Idle: Show final result (Static)
      currentX = finalTargetX;
    } else {
      // Racing: Interpolate
      // Normalized progress 0.0 -> 1.0
      const p = progress / 100;
      
      // Speed Variance:
      // Winner moves linearly to 1.0
      // Others move slightly slower to reach their target X at the same time T
      
      // Add "Wobble" / Randomness during the race
      // Math.sin to create oscillation. Different frequency per horse.
      const wobble = raceStatus === 'racing' 
        ? Math.sin(p * 20 + index) * 2 * (1 - p) // Wobble decreases as they near finish
        : 0;

      // Base movement from Start to Final
      const dist = finalTargetX - START_GATE_X;
      
      // Non-linear ease-out for dramatic finish? No, linear is better for race viz.
      // But let's add a "spurt" logic.
      // If rank is high (winner), they accelerate at the end.
      // If rank is low, they fade.
      
      // Simple Linear + Wobble for now to ensure they end up correctly
      currentX = START_GATE_X + (dist * p) + wobble;
    }
    
    // Tiny random offset for natural look (prevent exact overlap)
    const staticOffset = (Math.random() * 0.5);

    // Y Position: Gate 1 at bottom (Inner Rail), Gate N at top (Outer Rail)
    const laneHeight = 80 / totalHorses; 
    const yPos = 88 - (index * laneHeight); 

    // Bouncing effect (Gallop) during race
    const bounce = raceStatus === 'racing' ? Math.abs(Math.sin(Date.now() / 100 + index)) * 1.5 : 0;

    return {
      ...horse,
      gateNo: index + 1,
      rank: rankIndex !== -1 ? rankIndex + 1 : '?',
      x: Math.min(98, Math.max(2, currentX + staticOffset)),
      y: yPos - bounce,
      isWinner: rankIndex === 0,
      prediction: pred
    };
  });

  return (
    <div className="w-full bg-slate-800 border border-slate-600 rounded-xl overflow-hidden shadow-xl mt-4 md:mt-6 flex flex-col">
      {/* Header & Controls */}
      <div className="p-3 md:p-4 bg-slate-800 border-b border-slate-600 flex flex-wrap justify-between items-center gap-3">
        <h3 className="font-bold text-emerald-400 flex items-center gap-2 text-sm md:text-base">
          <Flag size={18} className="text-emerald-500" />
          예상 경주 전개 시뮬레이션
        </h3>
        
        <div className="flex items-center gap-2">
          {raceStatus === 'idle' || raceStatus === 'finished' ? (
             <button 
               onClick={startSimulation}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-xs md:text-sm transition-all shadow-lg 
                 ${raceStatus === 'finished' 
                   ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-500' 
                   : 'bg-emerald-600 text-white hover:bg-emerald-500 border border-emerald-500 animate-pulse'}
               `}
             >
               {raceStatus === 'finished' ? <RotateCcw size={14} /> : <Play size={14} fill="currentColor" />}
               {raceStatus === 'finished' ? '다시 보기' : '경주 시뮬레이션 시작'}
             </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs md:text-sm font-bold">
               <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
               LIVE REPLAY
            </div>
          )}
        </div>
      </div>
      
      {/* Track Surface */}
      <div className="relative w-full h-64 md:h-80 bg-[#2d5a35] overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
        
        {/* Grass Texture */}
        <div className="absolute inset-0 opacity-40" 
             style={{ backgroundImage: 'radial-gradient(#1a3c22 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
        </div>
        
        {/* Distance Lines (Moving Effect?? No, camera is fixed for simplicity) */}
        <div className="absolute top-0 bottom-0 left-[25%] w-px bg-white/10 border-l border-dashed border-white/30"></div>
        <div className="absolute top-0 bottom-0 left-[50%] w-px bg-white/10 border-l border-dashed border-white/30"></div>
        <div className="absolute top-0 bottom-0 left-[75%] w-px bg-white/10 border-l border-dashed border-white/30"></div>
        
        {/* Finish Line (Right side) */}
        <div className="absolute top-0 bottom-0 right-8 md:right-12 w-6 md:w-8 bg-white/10 flex items-center justify-center z-10">
            <div className="h-full w-1.5 bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.8)]"></div>
            {/* Checkered pattern overlay */}
            <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #fff 25%, #fff 75%, #000 75%, #000)', backgroundPosition: '0 0, 4px 4px', backgroundSize: '8px 8px'}}></div>
        </div>
        <div className="absolute top-2 right-2 md:right-4 text-[8px] md:text-[10px] font-black text-red-400 tracking-widest rotate-90 origin-right opacity-80">FINISH</div>

        {/* Start Gate Line */}
        <div className="absolute top-0 bottom-0 left-5 w-2 bg-white/20 border-r border-slate-400 z-10"></div>

        {/* Rails */}
        <div className="absolute top-4 left-0 right-0 h-3 bg-gradient-to-b from-slate-300 to-slate-400 border-b-2 border-slate-500 shadow-md z-10"></div> {/* Outer Rail */}
        <div className="absolute bottom-4 left-0 right-0 h-3 bg-gradient-to-t from-slate-300 to-slate-400 border-t-2 border-slate-500 shadow-md z-10"></div> {/* Inner Rail */}

        {/* Horses */}
        {visualData.map((horse, idx) => {
          const style = getGateStyle(idx);
          const isWinner = horse.isWinner;
          const showSpotlight = isWinner && (raceStatus === 'finished' || raceStatus === 'idle');

          return (
            <div 
              key={horse.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-20 will-change-transform"
              style={{ 
                left: `${horse.x}%`, 
                top: `${horse.y}%`,
                zIndex: isWinner ? 30 : 20,
                transition: raceStatus === 'racing' ? 'none' : 'left 1s ease-in-out, top 0.5s ease'
              }}
            >
              {/* Winner Spotlight */}
              {showSpotlight && (
                 <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-8 h-20 bg-gradient-to-b from-yellow-400/30 to-transparent blur-md -z-10 animate-pulse"></div>
              )}

              {/* Horse Marker */}
              <div className="relative">
                <div 
                  className={`
                    w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center font-black text-xs md:text-sm border-2 shadow-lg
                    ${style.bg} ${style.text} ${style.border}
                    ${showSpotlight ? 'ring-2 md:ring-4 ring-yellow-400/80 scale-110' : ''}
                    transition-transform
                  `}
                >
                  {horse.gateNo}
                </div>
                
                {/* Dust Effect when racing */}
                {raceStatus === 'racing' && (
                  <div className="absolute top-1/2 right-full w-4 h-4 bg-yellow-100/20 blur-sm rounded-full animate-ping"></div>
                )}
                
                {/* Winner Crown */}
                {showSpotlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-yellow-400 drop-shadow-lg animate-bounce">
                    <Trophy size={16} fill="currentColor" />
                  </div>
                )}
              </div>

              {/* Info Label (Visible on Hover or for Winner) */}
              <div className={`
                  absolute top-full mt-1 bg-black/80 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap backdrop-blur-sm border border-white/10
                  ${showSpotlight ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} 
                  transition-opacity z-50
              `}>
                 <span className="font-bold">{horse.name}</span>
                 {isWinner && <span className="ml-1 text-yellow-400 font-bold">1위</span>}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="bg-slate-800 px-3 py-2 md:px-4 md:py-3 text-[10px] md:text-[11px] text-slate-400 flex justify-between border-t border-slate-600">
        <span className="flex items-center gap-1">📌 {raceStatus === 'racing' ? '경주가 진행 중입니다!' : '버튼을 눌러 실제와 유사한 경주 전개를 시뮬레이션 하세요.'}</span>
        {raceStatus === 'finished' && <span className="text-emerald-400 font-bold animate-pulse">예측 1위: {visualData.find(h=>h.isWinner)?.name}</span>}
      </div>
    </div>
  );
};