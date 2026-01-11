
export interface Horse {
  id: string;
  name: string;
  jockey: string;
  age: number;
  weight: number;
  recentHistory: string; 
  notes: string;
}

export interface RaceConditions {
  raceNumber: number; 
  distance: number; 
  trackCondition: string; 
  weather: string;
  location: string;
  raceTime?: string; 
  trackBias?: 'lead' | 'closer' | 'inside' | 'outside' | 'neutral'; // New: Today's flow
}

export interface PredictionResult {
  horseName: string;
  winProbability: number; 
  reasoning: string;
  predictedPosition: 'lead' | 'forward' | 'midfield' | 'backend';
  starRating: number; 
  keyFactor: string; 
  riskFactor: string; 
}

export interface BettingRecommendations {
  topFiveNames: string[];
  quinella: string[]; 
  trio: string[];     
  strategyNote: string; 
}

export interface AnalysisResponse {
  summary: string;
  paceAnalysis: string; 
  predictions: PredictionResult[];
  bettingRecommendations: BettingRecommendations;
  confidenceScore: number; // 0-100: How certain the AI is
  keyVariable: string;    // The single most important factor for this race
  sources?: { title: string; uri: string }[]; 
  appliedWeather: string;        
  appliedTrackCondition: string; 
}

export interface RaceData {
  conditions: RaceConditions;
  horses: Horse[];
}

export interface Source {
  title: string;
  uri: string;
}
