import { Horse, RaceConditions } from './types';

export const INITIAL_RACE_CONDITIONS: RaceConditions = {
  raceNumber: 1,
  distance: 1800,
  trackCondition: '건조 (Dry)',
  weather: '맑음 (Sunny)',
  location: '서울 경마공원',
};

export const MOCK_HORSES: Horse[] = [
  {
    id: '1',
    name: '스피드레이서',
    jockey: '김철수',
    age: 4,
    weight: 480,
    recentHistory: '1위, 2위, 1위',
    notes: '최근 컨디션 최상, 선행마',
  },
  {
    id: '2',
    name: '썬더볼트',
    jockey: '이영희',
    age: 5,
    weight: 510,
    recentHistory: '3위, 5위, 2위',
    notes: '추입에 능함, 장거리에 유리',
  },
  {
    id: '3',
    name: '황금빛',
    jockey: '박지성',
    age: 3,
    weight: 460,
    recentHistory: '신마, 1위',
    notes: '잠재력이 높으나 경험 부족',
  },
];