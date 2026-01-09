import React from 'react';
import { Horse } from '../types';
import { Trash2, TrendingUp, User, Activity } from 'lucide-react';

interface HorseCardProps {
  horse: Horse;
  onDelete: (id: string) => void;
}

export const HorseCard: React.FC<HorseCardProps> = ({ horse, onDelete }) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 relative hover:border-emerald-500/50 transition-colors group">
      <button 
        onClick={() => onDelete(horse.id)}
        className="absolute top-2 right-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        title="삭제"
      >
        <Trash2 size={18} />
      </button>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-lg">
          {horse.name.charAt(0)}
        </div>
        <div>
          <h3 className="font-bold text-white text-lg">{horse.name}</h3>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">Age: {horse.age}</span>
            <span className="bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{horse.weight}kg</span>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-slate-300">
        <div className="flex items-center gap-2">
          <User size={14} className="text-blue-400" />
          <span>기수: <span className="text-white">{horse.jockey}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-amber-400" />
          <span>최근성적: <span className="text-white">{horse.recentHistory}</span></span>
        </div>
        {horse.notes && (
          <div className="flex items-start gap-2 mt-2 pt-2 border-t border-slate-700">
            <TrendingUp size={14} className="text-purple-400 mt-0.5" />
            <span className="text-slate-400 text-xs italic">{horse.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
};