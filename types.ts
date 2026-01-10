
export interface Horse {
  id: string;
  name: string;
  jockey: string;
  age: number;
  weight: number;
  recentHistory: string; // e.g., "1st, 3rd, 5th"
  notes: string;
}

export interface RaceConditions {
  raceNumber: number; // Added to identify race (e.g., 1, 2, 3...)
  distance: number; // in meters
  trackCondition: string; // e.g., Dry, Wet, Muddy
  weather: string;
  location: string;
  raceTime?: string; // YYYY-MM-DD HH:mm format
}

export interface PredictionResult {
  horseName: string;
  winProbability: number; // 0-100
  reasoning: string;
  predictedPosition: 'lead' | 'forward' | 'midfield' | 'backend'; // New field for track viz
  starRating: number; // 1-5 scale
  keyFactor: string; // e.g. "감량 이점", "거리 적성"
  riskFactor: string; // e.g. "외곽 게이트", "공백기"
}

export interface AnalysisResponse {
  summary: string;
  paceAnalysis: string; // New field: How the race will unfold (pace, leaders)
  predictions: PredictionResult[];
}

export interface RaceData {
  conditions: RaceConditions;
  horses: Horse[];
}

export interface Source {
  title: string;
  uri: string;
}

export interface FetchRaceResult {
  data: RaceData;
  sources: Source[];
}

export interface HistoryItem {
  id: string;
  timestamp: number; // When the analysis was performed
  conditions: RaceConditions;
  horses: Horse[];
  result: AnalysisResponse;
}