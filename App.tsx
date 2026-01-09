import React, { useState, useEffect, useRef } from 'react';
import { Horse, RaceConditions, AnalysisResponse, Source, RaceData } from './types';
import { INITIAL_RACE_CONDITIONS, MOCK_HORSES } from './constants';
import { analyzeRace, analyzeRaceCardPDF } from './services/geminiService';
import { RaceTable } from './components/RaceTable'; 
import { PredictionChart } from './components/PredictionChart';
import { TrackVisualization } from './components/TrackVisualization';
import { 
  Trophy, 
  Plus, 
  PlayCircle, 
  MapPin,
  CloudSun,
  Ruler,
  AlertTriangle,
  Loader2,
  Clock,
  Thermometer,
  FileText,
  Upload,
  BarChart2,
  Quote,
  RefreshCw,
  FastForward,
  X,
  ChevronRight,
  Trash2,
  Calendar,
  List,
  ExternalLink
} from 'lucide-react';

const getGateColorClass = (index: number) => {
  const styles = [
    'bg-white text-black border-slate-300',       // 1
    'bg-yellow-400 text-black border-yellow-500', // 2
    'bg-red-600 text-white border-red-700',       // 3
    'bg-black text-white border-slate-600',       // 4
    'bg-blue-600 text-white border-blue-700',     // 5
    'bg-green-600 text-white border-green-700',   // 6
    'bg-amber-800 text-white border-amber-900',   // 7
    'bg-pink-400 text-white border-pink-500',     // 8
    'bg-purple-600 text-white border-purple-700', // 9
    'bg-sky-400 text-black border-sky-500',       // 10
  ];
  return styles[index % styles.length];
};

const App: React.FC = () => {
  // Main Data States
  const [allRaces, setAllRaces] = useState<RaceData[]>([]);
  const [currentRaceIdx, setCurrentRaceIdx] = useState<number>(0);
  
  // Derived state for current view
  const [horses, setHorses] = useState<Horse[]>(MOCK_HORSES);
  const [conditions, setConditions] = useState<RaceConditions>({...INITIAL_RACE_CONDITIONS, raceNumber: 1});
  
  // Analysis & Loading States
  const [loading, setLoading] = useState(false); // Global loading (analyzing race)
  const [isProcessingPdf, setIsProcessingPdf] = useState(false); // PDF extraction loading
  const [analysisCache, setAnalysisCache] = useState<{[key: string]: AnalysisResponse}>({}); // Cache predictions by "location-raceNumber"
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // UI States
  const [sources, setSources] = useState<Source[]>([]);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);

  // Timer State
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isRaceFinished, setIsRaceFinished] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Manual Add Form
  const [isAdding, setIsAdding] = useState(false);
  const [newHorse, setNewHorse] = useState<Partial<Horse>>({
    name: '', jockey: '', age: 3, weight: 450, recentHistory: '', notes: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Helpers ---
  const getRaceKey = (location: string, raceNumber: number) => {
    return `${location.trim()}-${raceNumber}`;
  };

  const getCleanLocation = (location: string) => {
    return location.replace(/경마공원|LetsRun|Park/gi, '').trim();
  };

  // Helper for Race Button Styling
  const getLocationStyles = (location: string, isActive: boolean) => {
    const loc = getCleanLocation(location);

    if (loc.includes('서울')) {
      return isActive 
        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40 ring-1 ring-blue-400' 
        : 'bg-slate-800 border-slate-700 text-blue-400 hover:border-blue-500/50 hover:bg-blue-900/20';
    }
    if (loc.includes('제주')) {
      return isActive 
        ? 'bg-orange-600 border-orange-500 text-white shadow-lg shadow-orange-900/40 ring-1 ring-orange-400' 
        : 'bg-slate-800 border-slate-700 text-orange-400 hover:border-orange-500/50 hover:bg-orange-900/20';
    }
    if (loc.includes('부산') || loc.includes('부경')) {
      return isActive 
        ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-900/40 ring-1 ring-rose-400' 
        : 'bg-slate-800 border-slate-700 text-rose-400 hover:border-rose-500/50 hover:bg-rose-900/20';
    }
    
    // Default
    return isActive 
      ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/20' 
      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600';
  };

  // --- Effects ---

  // Real-time Clock
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update View when Race Selection Changes
  useEffect(() => {
    if (allRaces.length > 0 && allRaces[currentRaceIdx]) {
      const race = allRaces[currentRaceIdx];
      setHorses(race.horses);
      setConditions(race.conditions);
      
      // Check cache for prediction using composite key
      const key = getRaceKey(race.conditions.location, race.conditions.raceNumber);
      if (analysisCache[key]) {
        setResult(analysisCache[key]);
      } else {
        setResult(null); 
        // We can optionally auto-analyze if needed, but manual is cost-safer
      }
      setError(null);
    }
  }, [currentRaceIdx, allRaces, analysisCache]);

  // Timer Logic & Auto Selection
  useEffect(() => {
    if (!conditions.raceTime) {
      setTimeLeft('');
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const raceTime = new Date(conditions.raceTime!).getTime();
      
      if (isNaN(raceTime)) {
          setTimeLeft('시간 정보 없음');
          return;
      }

      const difference = raceTime - now;

      if (difference > 0) {
        setIsRaceFinished(false);
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft(`${hours > 0 ? `${hours}시간 ` : ''}${minutes}분 ${seconds}초 전`);
      } else {
        setIsRaceFinished(true);
        const minutesPast = Math.abs(Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)));
        const secondsPast = Math.abs(Math.floor((difference % (1000 * 60)) / 1000));
        setTimeLeft(`진행 중 (${minutesPast}분 ${secondsPast}초 경과)`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [conditions.raceTime]);

  // --- Handlers ---

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError("PDF 파일만 업로드 가능합니다.");
      return;
    }

    setIsProcessingPdf(true);
    setError(null);
    setResult(null);
    setAnalysisCache({});
    setAllRaces([]);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const base64Content = base64Data.split(',')[1];
        setPdfFileName(file.name);
        
        try {
          // Pass filename to help date inference
          const races = await analyzeRaceCardPDF(base64Content, file.name);
          
          if (races.length === 0) {
            throw new Error("경기 정보를 찾을 수 없습니다.");
          }

          setAllRaces(races);
          setSources([{ title: `PDF: ${file.name}`, uri: '#' }]);
          
          // Find the next upcoming race to display by default
          const now = new Date().getTime();
          let nextRaceIdx = 0;
          
          // Find first race that hasn't started or started within last 5 mins
          const upcoming = races.findIndex(r => {
             if (!r.conditions.raceTime) return false;
             const rTime = new Date(r.conditions.raceTime).getTime();
             // Include races started within last 10 mins as "active"
             return rTime > now - (10 * 60 * 1000);
          });

          if (upcoming !== -1) {
            nextRaceIdx = upcoming;
          }

          setCurrentRaceIdx(nextRaceIdx);
          
          // Automatically analyze the selected race to give immediate value
          if (races[nextRaceIdx].horses.length > 0) {
             performAnalysis(races[nextRaceIdx]);
          }

        } catch (err: any) {
          console.error(err);
          setError(err.message || "PDF 분석 중 오류가 발생했습니다.");
        } finally {
          setIsProcessingPdf(false);
        }
      };
    } catch (err) {
      console.error(err);
      setError("파일 읽기 실패");
      setIsProcessingPdf(false);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const performAnalysis = async (raceData: RaceData) => {
    // If already cached, don't re-run
    const key = getRaceKey(raceData.conditions.location, raceData.conditions.raceNumber);
    if (analysisCache[key]) {
      setResult(analysisCache[key]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const analysis = await analyzeRace(raceData.horses, raceData.conditions);
      setResult(analysis);
      setAnalysisCache(prev => ({
        ...prev,
        [key]: analysis
      }));
    } catch (err: any) {
      console.error(err);
      setError("경기 분석에 실패했습니다. " + (err.message || "다시 시도해주세요."));
    } finally {
      setLoading(false);
    }
  };

  const handleManualAnalyze = () => {
    if (allRaces[currentRaceIdx]) {
      performAnalysis(allRaces[currentRaceIdx]);
    } else {
        // Fallback for manual horse entry mode
        const manualRaceData = { conditions, horses };
        performAnalysis(manualRaceData as RaceData);
    }
  };

  const handleAddHorse = () => {
    if (!newHorse.name || !newHorse.jockey) return;
    const horse: Horse = {
      id: Date.now().toString(),
      name: newHorse.name!,
      jockey: newHorse.jockey!,
      age: newHorse.age || 3,
      weight: newHorse.weight || 450,
      recentHistory: newHorse.recentHistory || '정보 없음',
      notes: newHorse.notes || '',
    };
    setHorses([...horses, horse]);
    setNewHorse({ name: '', jockey: '', age: 3, weight: 450, recentHistory: '', notes: '' });
    setIsAdding(false);
  };

  const handleDeleteHorse = (id: string) => {
    setHorses(horses.filter(h => h.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-20 relative overflow-x-hidden">
      
      {/* Top Navigation Bar */}
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-[95%] mx-auto px-3 md:px-4 h-14 md:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-emerald-600 p-1.5 rounded text-white transform -rotate-6 scale-90 md:scale-100">
              <Trophy size={18} md:size={20} fill="currentColor" />
            </div>
            <span className="font-black text-lg md:text-xl tracking-tight text-white">
              DerbyAI <span className="text-emerald-500 text-[10px] md:text-xs font-normal align-top">PDF</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 md:gap-3 bg-slate-800/50 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-slate-700/50 shadow-inner">
               <Clock size={16} className="text-emerald-500 md:w-5 md:h-5" />
               <span className="font-mono font-bold text-lg md:text-2xl text-slate-100 tracking-wide">{currentTime}</span>
             </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="w-full max-w-[98%] md:max-w-[95%] mx-auto px-2 md:px-4 py-4 md:py-6">
        
        {/* Race Selector Bar (Horizontal Scroll) */}
        {allRaces.length > 0 && (
          <div className="mb-4 md:mb-6 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0">
            <div className="flex gap-2 min-w-max">
              {allRaces.map((race, idx) => {
                const isActive = idx === currentRaceIdx;
                const raceTime = race.conditions.raceTime ? new Date(race.conditions.raceTime) : null;
                const timeString = raceTime ? raceTime.toLocaleTimeString('ko-KR', {hour: '2-digit', minute: '2-digit', hour12: false}) : '미정';
                const locationShort = getCleanLocation(race.conditions.location);
                const raceKey = getRaceKey(race.conditions.location, race.conditions.raceNumber);
                const hasResult = !!analysisCache[raceKey];
                
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentRaceIdx(idx)}
                    className={`
                      flex flex-col items-center justify-center px-3 py-2 md:px-4 md:py-3 rounded-xl border transition-all min-w-[85px] md:min-w-[100px]
                      ${getLocationStyles(locationShort, isActive)}
                    `}
                  >
                    <div className="flex flex-col items-center leading-none mb-1 md:mb-2">
                        <span className={`text-[10px] md:text-[11px] font-bold mb-0.5 ${isActive ? 'text-white/90' : 'text-current opacity-80'}`}>
                           {locationShort}
                        </span>
                        <span className="text-xs md:text-sm font-black uppercase tracking-wider">
                           {race.conditions.raceNumber}경주
                        </span>
                    </div>
                    <span className={`text-lg md:text-xl font-bold font-mono ${isActive ? 'text-white' : 'text-slate-400'}`}>
                      {timeString}
                    </span>
                    {hasResult && (
                      <span className="text-[9px] md:text-[10px] bg-white/20 text-white px-1.5 rounded-full mt-1">분석완료</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Race Dashboard Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-0 mb-4 md:mb-6 overflow-hidden shadow-lg">
          <div className="flex flex-col md:flex-row">
            
            {/* Left: PDF Upload & Status */}
            <div className="p-3 md:p-5 border-b md:border-b-0 md:border-r border-slate-700 bg-slate-800/50 w-full md:w-1/3 flex flex-col justify-center">
               <input 
                  type="file" 
                  accept="application/pdf" 
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileUpload}
                />
                
                {allRaces.length === 0 ? (
                  <div className="space-y-3 md:space-y-4">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingPdf || loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 shadow-lg p-3 md:p-4 rounded-xl transition-all flex items-center justify-center gap-3 h-20 md:h-24"
                    >
                      {isProcessingPdf ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          <span className="text-sm md:text-base">분석 중...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={20} className="md:w-6 md:h-6" />
                          <div className="text-left">
                            <span className="block font-bold text-base md:text-lg">출주표 PDF 업로드</span>
                            <span className="text-[10px] md:text-xs opacity-80">오늘의 전체 경주 파일</span>
                          </div>
                        </>
                      )}
                    </button>

                    <div className="bg-slate-900/50 rounded-lg p-2 md:p-3 border border-slate-700/50 text-center">
                        <a 
                          href="https://www.krking.net/krPaper/YsPaper.asp" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center justify-center gap-2 text-emerald-400 font-bold hover:text-emerald-300 transition-colors text-sm md:text-base"
                        >
                          <ExternalLink size={14} className="md:w-4 md:h-4" />
                          <span>예측 PDF 다운 (KRKing)</span>
                        </a>
                        <p className="text-[10px] md:text-xs text-slate-500 mt-1">위 사이트에서 오늘 '출주표' PDF를 받으세요.</p>
                    </div>
                  </div>
                ) : (
                   <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
                           <span className="bg-emerald-500 text-black px-2 rounded text-base md:text-lg">{conditions.raceNumber}R</span>
                           {conditions.location}
                        </h2>
                        <div className="text-slate-400 text-[10px] md:text-xs mt-1 flex items-center gap-2">
                           <Calendar size={12}/> {conditions.raceTime?.split(' ')[0] || '날짜 미정'}
                           {allRaces.length > 1 && <span className="bg-slate-700 px-2 rounded-full text-white hidden sm:inline">{allRaces.length}개 로드됨</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a 
                          href="https://www.krking.net/krPaper/YsPaper.asp" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-emerald-400 transition-colors"
                          title="예상지 사이트"
                        >
                          <ExternalLink size={18} />
                        </a>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                          title="새 파일 업로드"
                        >
                          <RefreshCw size={18} />
                        </button>
                      </div>
                   </div>
                )}
            </div>

            {/* Middle: Race Conditions */}
            <div className="flex-1 p-3 md:p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 items-center w-full md:w-2/3">
               <div className="flex flex-col gap-0.5 md:gap-1">
                 <span className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1"><Ruler size={10} className="md:w-3 md:h-3"/> 거리</span>
                 <span className="font-bold text-base md:text-lg">{conditions.distance}m</span>
               </div>
               <div className="flex flex-col gap-0.5 md:gap-1">
                 <span className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1"><Thermometer size={10} className="md:w-3 md:h-3"/> 주로</span>
                 <span className="font-bold text-sm md:text-lg truncate" title={conditions.trackCondition}>{conditions.trackCondition}</span>
               </div>
               <div className="flex flex-col gap-0.5 md:gap-1">
                 <span className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1"><CloudSun size={10} className="md:w-3 md:h-3"/> 날씨</span>
                 <span className="font-bold text-sm md:text-lg truncate" title={conditions.weather}>{conditions.weather}</span>
               </div>
               <div className="flex flex-col gap-0.5 md:gap-1 pl-4 border-l border-slate-700/50">
                  <span className="text-[10px] md:text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">남은시간</span>
                  <div className={`text-base md:text-xl font-black font-mono tracking-tight flex items-center gap-2 ${isRaceFinished ? 'text-amber-400' : 'text-white'}`}>
                     {timeLeft || '--:--'}
                  </div>
               </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm flex items-center gap-3 animate-pulse">
              <AlertTriangle size={18} /> 
              <span>{error}</span>
            </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          
          {/* Left: Horse Table */}
          <div className="lg:col-span-8 space-y-4">
             <div className="flex items-center justify-between">
                <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                  <List size={18} className="text-amber-400"/> 출전표
                </h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded border border-slate-700 transition-colors flex items-center gap-1"
                  >
                    <Plus size={14} /> <span className="hidden sm:inline">수동 추가</span>
                  </button>
                </div>
             </div>

             {isAdding && (
               <div className="bg-slate-800 border border-slate-700 p-4 rounded-lg mb-4">
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <input placeholder="마명" value={newHorse.name} onChange={e=>setNewHorse({...newHorse, name: e.target.value})} className="bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"/>
                    <input placeholder="기수" value={newHorse.jockey} onChange={e=>setNewHorse({...newHorse, jockey: e.target.value})} className="bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white"/>
                 </div>
                 <button onClick={handleAddHorse} className="w-full bg-emerald-600 text-white py-2 rounded font-bold text-sm">추가하기</button>
               </div>
             )}

             <RaceTable 
               horses={horses} 
               predictions={result?.predictions} 
               onDelete={handleDeleteHorse} 
             />

             {result?.predictions && horses.length > 0 && (
                <TrackVisualization horses={horses} predictions={result.predictions} />
             )}
          </div>

          {/* Right: Analysis Result */}
          <div className="lg:col-span-4 space-y-6">
            
            {loading ? (
               <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center gap-4 shadow-xl min-h-[400px]">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <RefreshCw size={20} className="text-emerald-500 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-white">AI가 {conditions.raceNumber}경기를 분석 중입니다</h3>
                    <p className="text-sm text-slate-400">데이터를 정밀 분석하고 있습니다.<br/>잠시만 기다려주세요.</p>
                  </div>
               </div>
            ) : result ? (
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl sticky top-20">
                <div className="p-4 md:p-5 border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm">
                  <h3 className="font-bold text-emerald-400 flex items-center gap-2 text-base md:text-lg">
                     <FileText size={18} className="md:w-5 md:h-5" /> AI 분석 리포트 ({conditions.raceNumber}R)
                  </h3>
                </div>
                
                <div className="p-4 md:p-5 space-y-6 md:space-y-8">
                  {/* Top 3 Recommendation - Moved to Top */}
                  <div>
                     <h4 className="text-slate-400 font-bold mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                      <Trophy size={14} className="text-amber-500" />
                      Top 3 추천
                    </h4>
                    <div className="space-y-3">
                      {result.predictions.sort((a,b) => b.winProbability - a.winProbability).slice(0, 3).map((pred, idx) => {
                        const hIndex = horses.findIndex(h => h.name === pred.horseName);
                        const gateNo = hIndex !== -1 ? hIndex + 1 : '?';
                        const gateColorClass = hIndex !== -1 ? getGateColorClass(hIndex) : 'bg-slate-700 text-slate-300 border-slate-600';

                        return (
                          <div key={idx} className="flex items-start gap-3 md:gap-4 bg-slate-700/20 p-3 md:p-4 rounded-xl border border-slate-700/30 hover:bg-slate-700/40 transition-all">
                             <div className={`w-6 h-6 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                               idx === 0 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 
                               idx === 1 ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-300'
                             }`}>
                               {idx + 1}
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="flex justify-between items-center w-full mb-1.5">
                                  <div className="flex items-center gap-2 truncate">
                                      <span className={`text-[10px] w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full border font-bold ${gateColorClass}`}>
                                          {gateNo}
                                      </span>
                                      <span className="font-bold text-slate-100 text-sm md:text-base truncate">{pred.horseName}</span>
                                  </div>
                                  <span className="text-[10px] md:text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md ml-2 whitespace-nowrap">{pred.winProbability}%</span>
                               </div>
                               <p className="text-xs md:text-sm text-slate-400 leading-snug">{pred.reasoning}</p>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <h4 className="text-slate-400 font-bold mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                      <Quote size={14} className="text-emerald-500" />
                      경기 총평
                    </h4>
                    <div className="bg-slate-900/40 rounded-xl p-4 md:p-6 border border-slate-700/50">
                        <p className="text-slate-200 text-sm md:text-[15px] leading-7 md:leading-8 font-medium whitespace-pre-line text-justify tracking-wide">
                          {result.summary}
                        </p>
                    </div>
                  </div>

                  {/* Chart */}
                  <div>
                     <h4 className="text-slate-400 font-bold mb-3 flex items-center gap-2 text-xs uppercase tracking-wider">
                      <BarChart2 size={14} className="text-blue-500" />
                      우승 확률
                    </h4>
                    <div className="w-full bg-slate-900/20 rounded-lg p-3 border border-slate-700/30">
                        <PredictionChart data={result.predictions} horses={horses} />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
                <div className="hidden lg:flex flex-col items-center justify-center h-64 bg-slate-800/30 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 gap-4 mt-12">
                   {allRaces.length > 0 ? (
                      <button 
                        onClick={handleManualAnalyze}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all transform hover:scale-105"
                      >
                        {conditions.raceNumber}경주 AI 분석 시작하기
                      </button>
                   ) : (
                     <>
                       <div className="p-4 bg-slate-800 rounded-full shadow-lg">
                         <PlayCircle size={32} className="opacity-50" />
                       </div>
                       <div className="text-center">
                          <p className="font-bold text-slate-400 text-lg">AI 분석 대기 중</p>
                          <p className="text-sm mt-2 leading-relaxed">PDF를 업로드하면 자동으로 분석됩니다.</p>
                       </div>
                     </>
                   )}
                </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;