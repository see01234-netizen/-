import React from 'react';
import { Horse, PredictionResult } from '../types';
import { Trash2, TrendingUp, User, Weight, Calendar } from 'lucide-react';

interface RaceTableProps {
  horses: Horse[];
  predictions?: PredictionResult[];
  onDelete: (id: string) => void;
}

// KRA Standard Gate Colors
const getGateStyle = (index: number) => {
  const styles = [
    { bg: 'bg-white', text: 'text-black', border: 'border-slate-300' },       // 1: White
    { bg: 'bg-yellow-400', text: 'text-black', border: 'border-yellow-500' }, // 2: Yellow
    { bg: 'bg-red-600', text: 'text-white', border: 'border-red-700' },       // 3: Red
    { bg: 'bg-black', text: 'text-white', border: 'border-slate-600' },       // 4: Black
    { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700' },     // 5: Blue
    { bg: 'bg-green-600', text: 'text-white', border: 'border-green-700' },   // 6: Green
    { bg: 'bg-amber-800', text: 'text-white', border: 'border-amber-900' },   // 7: Brown
    { bg: 'bg-pink-400', text: 'text-white', border: 'border-pink-500' },     // 8: Pink
    { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-700' }, // 9: Purple
    { bg: 'bg-sky-400', text: 'text-black', border: 'border-sky-500' },       // 10: Light Blue
  ];
  return styles[index % styles.length];
};

export const RaceTable: React.FC<RaceTableProps> = ({ horses, predictions, onDelete }) => {
  const getPrediction = (name: string) => {
    return predictions?.find(p => p.horseName === name);
  };

  return (
    <>
      {/* Desktop Table View (Hidden on Mobile) */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-slate-700 bg-slate-800/50 shadow-xl">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="text-xs uppercase bg-slate-900/80 text-slate-400 border-b border-slate-700">
            <tr>
              <th scope="col" className="px-4 py-3 text-center w-16">No</th>
              <th scope="col" className="px-4 py-3">마명 / 기수</th>
              <th scope="col" className="px-4 py-3 text-center">정보 (나이/중량)</th>
              <th scope="col" className="px-4 py-3">최근 성적 & 특징</th>
              {predictions && <th scope="col" className="px-4 py-3 w-48">AI 예측 (우승확률)</th>}
              <th scope="col" className="px-4 py-3 text-center w-12">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {horses.map((horse, index) => {
              const gateStyle = getGateStyle(index);
              const prediction = getPrediction(horse.name);
              const winRate = prediction?.winProbability || 0;

              return (
                <tr key={horse.id} className="hover:bg-slate-700/30 transition-colors">
                  {/* Gate Number */}
                  <td className="px-4 py-3 text-center">
                    <div className={`w-8 h-8 mx-auto rounded flex items-center justify-center font-black shadow-md border ${gateStyle.bg} ${gateStyle.text} ${gateStyle.border}`}>
                      {index + 1}
                    </div>
                  </td>

                  {/* Name & Jockey */}
                  <td className="px-4 py-3">
                    <div className="font-bold text-white text-base tracking-tight">{horse.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{horse.jockey}</div>
                  </td>

                  {/* Info */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="bg-slate-700 px-1.5 py-0.5 rounded text-xs text-slate-300 w-14">{horse.age}세</span>
                      <span className="bg-slate-700 px-1.5 py-0.5 rounded text-xs text-slate-300 w-14">{horse.weight}kg</span>
                    </div>
                  </td>

                  {/* History & Notes */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-400 font-mono font-medium">{horse.recentHistory}</span>
                    </div>
                    {horse.notes && (
                      <div className="text-xs text-slate-500 italic flex items-start gap-1">
                        <TrendingUp size={10} className="mt-0.5" />
                        {horse.notes}
                      </div>
                    )}
                  </td>

                  {/* Prediction Bar */}
                  {predictions && (
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between text-xs font-bold">
                          <span className={index === 0 ? "text-emerald-400" : "text-slate-400"}>
                            {winRate}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full transition-all duration-1000 ${
                              winRate > 20 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-slate-500'
                            }`}
                            style={{ width: `${winRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  )}

                  {/* Actions */}
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => onDelete(horse.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Hidden on Desktop) */}
      <div className="md:hidden space-y-3">
        {horses.length === 0 && (
          <div className="p-6 text-center text-slate-500 bg-slate-800/50 rounded-lg border border-slate-700 border-dashed">
            출전마 데이터가 없습니다.
          </div>
        )}
        {horses.map((horse, index) => {
          const gateStyle = getGateStyle(index);
          const prediction = getPrediction(horse.name);
          const winRate = prediction?.winProbability || 0;

          return (
            <div key={horse.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                   <div className={`w-8 h-8 rounded flex items-center justify-center font-black text-sm border shadow-sm ${gateStyle.bg} ${gateStyle.text} ${gateStyle.border}`}>
                      {index + 1}
                   </div>
                   <div>
                      <div className="font-bold text-white text-base">{horse.name}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <User size={12} className="text-slate-500" />
                        {horse.jockey}
                      </div>
                   </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-[11px] bg-slate-700/50 px-2 py-1 rounded text-slate-300">
                    <Calendar size={10} /> {horse.age}세
                  </div>
                   <div className="flex items-center gap-1 text-[11px] bg-slate-700/50 px-2 py-1 rounded text-slate-300">
                    <Weight size={10} /> {horse.weight}kg
                  </div>
                </div>
              </div>

              {/* Prediction Bar Mobile */}
              {predictions && (
                <div className="mb-3 bg-slate-700/20 p-2 rounded-lg border border-slate-700/30">
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-slate-400">우승 확률</span>
                    <span className={winRate > 20 ? "text-emerald-400" : "text-slate-300"}>{winRate}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        winRate > 20 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-slate-500'
                      }`}
                      style={{ width: `${winRate}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-300 space-y-1 bg-slate-900/30 p-2.5 rounded border border-slate-700/30">
                <div className="flex items-start gap-2">
                   <span className="text-slate-500 shrink-0">최근:</span>
                   <span className="text-amber-400 font-mono font-medium">{horse.recentHistory}</span>
                </div>
                {horse.notes && (
                  <div className="flex items-start gap-2 pt-1 border-t border-slate-700/50 mt-1">
                    <span className="text-slate-500 shrink-0">특이:</span>
                    <span className="text-slate-400 italic">{horse.notes}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};