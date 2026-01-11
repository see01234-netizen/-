
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Horse, RaceConditions, AnalysisResponse, Source, RaceData } from './types';
import { INITIAL_RACE_CONDITIONS, MOCK_HORSES } from './constants';
import { analyzeRace, analyzeRaceCardPDF } from './services/geminiService';
import { fetchRealTimeWeather } from './services/weatherService'; 
import { RaceTable } from './components/RaceTable'; 
import { PredictionChart } from './components/PredictionChart';
import { TrackVisualization } from './components/TrackVisualization';
import { 
  Trophy, PlayCircle, CloudSun, Ruler, AlertTriangle, Loader2, Clock, Thermometer, FileText, Upload, 
  BarChart2, Quote, RefreshCw, Calendar, List, ExternalLink, Download, Wind, Search, CheckCircle2, 
  Edit2, Save, X, Target, Zap, ShieldCheck, TrendingUp
} from 'lucide-react';

const getGateColorClass = (index: number) => {
  const styles = [
    'bg-white text-black border-slate-300', 'bg-yellow-400 text-black border-yellow-500', 'bg-red-600 text-white border-red-700',
    'bg-black text-white border-slate-600', 'bg-blue-600 text-white border-blue-700', 'bg-green-600 text-white border-green-700',
    'bg-amber-800 text-white border-amber-900', 'bg-pink-400 text-white border-pink-500', 'bg-purple-600 text-white border-purple-700',
    'bg-sky-400 text-black border-sky-500',
  ];
  return styles[index % styles.length];
};

const App: React.FC = () => {
  const [allRaces, setAllRaces] = useState<RaceData[]>([]);
  const [currentRaceIdx, setCurrentRaceIdx] = useState<number>(0);
  const [horses, setHorses] = useState<Horse[]>(MOCK_HORSES);
  const [conditions, setConditions] = useState<RaceConditions>({...INITIAL_RACE_CONDITIONS, raceNumber: 1, trackBias: 'neutral'});
  const [loading, setLoading] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [analysisCache, setAnalysisCache] = useState<{[key: string]: AnalysisResponse}>({});
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditingConditions, setIsEditingConditions] = useState(false);
  const [editedWeather, setEditedWeather] = useState('');
  const [editedTrack, setEditedTrack] = useState('');
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isRaceFinished, setIsRaceFinished] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getRaceKey = (loc: string, num: number, bias?: string) => `${loc.trim()}-${num}-${bias || 'none'}`;
  const getCleanLocation = (loc: string) => loc.replace(/경마공원|LetsRun|Park/gi, '').trim();

  const performAnalysis = useCallback(async (raceData: RaceData, force = false, overrides?: { weather?: string, track?: string }) => {
    const key = getRaceKey(raceData.conditions.location, raceData.conditions.raceNumber, raceData.conditions.trackBias);
    if (!force && !overrides && analysisCache[key]) {
      setResult(analysisCache[key]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let weatherToUse = overrides?.weather;
      if (!weatherToUse) {
         try {
           const fetchedWeather = await fetchRealTimeWeather(raceData.conditions.location);
           if (fetchedWeather) weatherToUse = fetchedWeather;
         } catch(e) {}
      }
      const analysis = await analyzeRace(raceData.horses, raceData.conditions, weatherToUse, overrides?.track);
      setResult(analysis);
      if (!overrides) setAnalysisCache(prev => ({ ...prev, [key]: analysis }));
      setEditedWeather(analysis.appliedWeather || '');
      setEditedTrack(analysis.appliedTrackCondition || '');
      setIsEditingConditions(false);
    } catch (err: any) {
      setError("분석 실패: " + (err.message || "다시 시도해주세요."));
    } finally { setLoading(false); }
  }, [analysisCache]);

  const handleManualAnalyze = (force = false) => {
    if (allRaces[currentRaceIdx]) {
      const data = { ...allRaces[currentRaceIdx], conditions };
      performAnalysis(data, force);
    }
  };

  const handleCorrectionAnalyze = () => {
    if (allRaces[currentRaceIdx]) {
      const data = { ...allRaces[currentRaceIdx], conditions };
      performAnalysis(data, true, { 
        weather: editedWeather, 
        track: editedTrack 
      });
    }
  };

  const updateTrackBias = (bias: RaceConditions['trackBias']) => {
    setConditions(prev => ({ ...prev, trackBias: bias }));
    // Automatically trigger analysis if data is loaded
    if (allRaces[currentRaceIdx]) {
       const updatedData = { ...allRaces[currentRaceIdx], conditions: { ...allRaces[currentRaceIdx].conditions, trackBias: bias } };
       performAnalysis(updatedData, true);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (allRaces.length > 0 && allRaces[currentRaceIdx]) {
      const race = allRaces[currentRaceIdx];
      setHorses(race.horses);
      setConditions(prev => ({ ...race.conditions, trackBias: prev.trackBias }));
      const key = getRaceKey(race.conditions.location, race.conditions.raceNumber, conditions.trackBias);
      if (analysisCache[key]) {
        setResult(analysisCache[key]);
      } else if (!loading) performAnalysis({ ...race, conditions }, false);
    }
  }, [currentRaceIdx, allRaces, analysisCache, performAnalysis]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!conditions.raceTime) return;
      const now = new Date().getTime();
      const raceTime = new Date(conditions.raceTime).getTime();
      const diff = raceTime - now;
      if (diff > 0) {
        setIsRaceFinished(false);
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${mins}분 ${secs}초 전`);
      } else {
        setIsRaceFinished(true);
        setTimeLeft(`진행 중`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [conditions.raceTime]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    setIsProcessingPdf(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const races = await analyzeRaceCardPDF((reader.result as string).split(',')[1], file.name);
        setAllRaces(races);
        setCurrentRaceIdx(0);
      } catch (err: any) { setError(err.message); }
      finally { setIsProcessingPdf(false); }
    };
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-20 overflow-x-hidden">
      <nav className="bg-slate-900/90 border-b border-slate-700 sticky top-0 z-50 backdrop-blur-md h-16 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-emerald-500" />
          <span className="font-black text-xl">경마예측 <span className="text-emerald-400 text-sm">by 성국</span></span>
        </div>
        <div className="bg-slate-800 px-4 py-1.5 rounded-full border border-slate-600 font-mono font-bold text-lg">{currentTime}</div>
      </nav>

      <main className="max-w-[95%] mx-auto py-6 space-y-6">
        {/* Race Selector */}
        {allRaces.length > 0 && (
          <div className="overflow-x-auto pb-2 flex gap-2">
            {allRaces.map((r, i) => (
              <button key={i} onClick={() => setCurrentRaceIdx(i)} 
                className={`px-4 py-2 rounded-xl border transition-all min-w-[100px] flex flex-col items-center
                ${i === currentRaceIdx ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                <span className="text-[10px] font-bold">{getCleanLocation(r.conditions.location)}</span>
                <span className="font-black">{r.conditions.raceNumber}R</span>
              </button>
            ))}
          </div>
        )}

        {/* Dashboard Header */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 shadow-2xl">
          <div className="p-6 border-b md:border-b-0 md:border-r border-slate-700 bg-slate-900/50 flex flex-col justify-center gap-4">
            {allRaces.length === 0 ? (
              <button onClick={() => fileInputRef.current?.click()} className="h-24 bg-emerald-600 hover:bg-emerald-500 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all shadow-xl shadow-emerald-950">
                {isProcessingPdf ? <Loader2 className="animate-spin" /> : <Upload />} PDF 출주표 업로드
              </button>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black text-white">{conditions.location} {conditions.raceNumber}R</h2>
                  <p className="text-slate-400 text-sm flex items-center gap-2 mt-1"><Calendar size={14}/> {conditions.raceTime || '시간 미정'}</p>
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 border border-slate-600"><RefreshCw size={20}/></button>
              </div>
            )}
            <input type="file" accept="application/pdf" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          </div>
          
          <div className="p-6 flex flex-col justify-center gap-5">
             {/* Track Bias Selector (NEW) */}
             <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase mb-2 flex items-center gap-1"><TrendingUp size={12}/> 오늘의 주로 흐름 (선택 시 재분석)</p>
                <div className="flex flex-wrap gap-2">
                   {[
                     { id: 'lead', label: '선행 유리' },
                     { id: 'closer', label: '추입 유리' },
                     { id: 'inside', label: '인게이트 유리' },
                     { id: 'outside', label: '바깥쪽 유리' },
                     { id: 'neutral', label: '편향 없음' }
                   ].map((bias) => (
                     <button 
                       key={bias.id}
                       onClick={() => updateTrackBias(bias.id as RaceConditions['trackBias'])}
                       className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                         conditions.trackBias === bias.id 
                           ? 'bg-emerald-500 border-emerald-400 text-black' 
                           : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                       }`}
                     >
                       {bias.label}
                     </button>
                   ))}
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-3">
                 <Ruler className="text-emerald-500" />
                 <div><p className="text-[10px] text-slate-400 font-bold uppercase">거리</p><p className="text-xl font-black">{conditions.distance}m</p></div>
               </div>
               <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center gap-3">
                 <Clock className={isRaceFinished ? "text-amber-500" : "text-emerald-500"} />
                 <div><p className="text-[10px] text-slate-400 font-bold uppercase">남은시간</p><p className={`text-xl font-black ${isRaceFinished ? 'text-amber-400' : 'text-white'}`}>{timeLeft}</p></div>
               </div>
             </div>
          </div>
        </div>

        {error && <div className="bg-red-900/40 border border-red-500 p-4 rounded-xl text-red-200 flex items-center gap-3"><AlertTriangle/>{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <RaceTable horses={horses} predictions={result?.predictions} onDelete={(id) => setHorses(h => h.filter(x => x.id !== id))} />
            {result?.predictions && <TrackVisualization horses={horses} predictions={result.predictions} />}
          </div>

          <div className="lg:col-span-4 space-y-6">
            {loading ? (
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-4 h-[500px]">
                <div className="w-16 h-16 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
                <h3 className="text-xl font-bold">전설의 예상가가 심층 분석 중...</h3>
                <p className="text-slate-400 text-sm">Thinking 모드로 1만 건의<br/>가상 레이스를 수행 중입니다.</p>
              </div>
            ) : result ? (
              <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl sticky top-20">
                <div className="p-5 bg-slate-800/80 border-b border-slate-700 flex justify-between items-center">
                  <h3 className="font-bold text-emerald-400 flex items-center gap-2"><FileText size={20}/> AI 심층 리포트</h3>
                  <button onClick={() => setIsEditingConditions(!isEditingConditions)} className="p-1.5 bg-slate-700 rounded hover:bg-slate-600"><Edit2 size={14}/></button>
                </div>
                
                <div className="p-5 space-y-6">
                  {/* Confidence & Key Variable (NEW) */}
                  <div className="space-y-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><ShieldCheck size={12}/> 분석 신뢰도</span>
                          <span className="text-sm font-black text-emerald-400">{result.confidenceScore}%</span>
                       </div>
                       <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${result.confidenceScore}%` }}></div>
                       </div>
                       <p className="text-[10px] text-slate-500 mt-2 italic text-center">신뢰도가 70% 미만인 경주는 소액 베팅을 권장합니다.</p>
                    </div>

                    <div className="bg-amber-900/10 border border-amber-500/30 p-4 rounded-xl">
                       <span className="text-[10px] font-black text-amber-500 uppercase block mb-1">핵심 변수 (Key Variable)</span>
                       <p className="text-sm font-bold text-white leading-relaxed">"{result.keyVariable}"</p>
                    </div>
                  </div>

                  {/* Weather/Track Control */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                    {isEditingConditions ? (
                      <div className="space-y-3">
                        <input type="text" value={editedWeather} onChange={e => setEditedWeather(e.target.value)} placeholder="날씨 수정" className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-sm outline-none focus:border-emerald-500" />
                        <input type="text" value={editedTrack} onChange={e => setEditedTrack(e.target.value)} placeholder="주로 수정" className="w-full bg-slate-900 border border-slate-700 p-2 rounded text-sm outline-none focus:border-emerald-500" />
                        <button onClick={handleCorrectionAnalyze} className="w-full bg-emerald-600 py-2 rounded font-bold text-sm flex items-center justify-center gap-2 shadow-lg"><Save size={14}/> 저장 후 재분석</button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div><span className="text-[10px] text-slate-500 font-bold block mb-1">적용 날씨</span><span className="text-xs font-bold flex items-center gap-1"><CloudSun size={12} className="text-sky-400"/> {result.appliedWeather}</span></div>
                        <div><span className="text-[10px] text-slate-500 font-bold block mb-1">적용 주로</span><span className="text-xs font-bold flex items-center gap-1"><Thermometer size={12} className="text-rose-400"/> {result.appliedTrackCondition}</span></div>
                      </div>
                    )}
                  </div>

                  {/* Betting Strategy Section */}
                  <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-2xl p-5 space-y-4 shadow-xl">
                    <h4 className="text-emerald-400 font-black flex items-center gap-2 text-sm uppercase tracking-widest"><Target size={18}/> 유력 마번 조합</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-emerald-800/30">
                        <span className="text-[10px] text-emerald-500 font-black block mb-2">복승 (1, 2위 조합)</span>
                        <div className="flex flex-wrap gap-2">
                          {result.bettingRecommendations.quinella.map((q, i) => (
                            <span key={i} className="bg-emerald-600 text-white px-3 py-1 rounded-lg font-black text-sm shadow-lg shadow-emerald-900/40 border border-emerald-500">{q}</span>
                          ))}
                        </div>
                      </div>
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-emerald-800/30">
                        <span className="text-[10px] text-emerald-500 font-black block mb-2">삼복승 (1, 2, 3위 조합)</span>
                        <div className="flex flex-wrap gap-2">
                          {result.bettingRecommendations.trio.map((t, i) => (
                            <span key={i} className="bg-blue-600 text-white px-3 py-1 rounded-lg font-black text-sm shadow-lg shadow-blue-900/40 border border-blue-500">{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pace Analysis */}
                  <div>
                    <h4 className="text-white font-bold mb-3 flex items-center gap-2 text-xs uppercase tracking-widest"><Wind size={16} className="text-sky-400"/> 레이스 전개 (시나리오)</h4>
                    <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">{result.paceAnalysis}</p>
                  </div>

                  <PredictionChart data={result.predictions} horses={horses} />
                </div>
              </div>
            ) : (
              <div className="h-64 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-500 gap-4">
                <PlayCircle size={40} className="opacity-20"/>
                <p className="font-bold">출주표를 업로드하면 정밀 분석을 시작합니다.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
