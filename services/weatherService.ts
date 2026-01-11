
// Coordinates for Korean Race Tracks (LetsRun Park)
const LOCATIONS: Record<string, { lat: number; lng: number; name: string }> = {
  '서울': { lat: 37.4439, lng: 127.0043, name: '서울(과천)' }, // Gwacheon
  '부산': { lat: 35.1558, lng: 128.8787, name: '부산경남' },   // Busan-Gyeongnam
  '부경': { lat: 35.1558, lng: 128.8787, name: '부산경남' },
  '제주': { lat: 33.4216, lng: 126.4764, name: '제주' },       // Jeju
};

const getWeatherDescription = (code: number): string => {
  // WMO Weather interpretation codes
  if (code === 0) return '맑음';
  if (code === 1) return '대체로 맑음';
  if (code === 2) return '구름 조금';
  if (code === 3) return '흐림';
  if (code === 45 || code === 48) return '안개';
  if (code >= 51 && code <= 55) return '이슬비';
  if (code >= 61 && code <= 65) return '비';
  if (code >= 66 && code <= 67) return '어는 비';
  if (code >= 71 && code <= 77) return '눈';
  if (code >= 80 && code <= 82) return '소나기';
  if (code >= 85 && code <= 86) return '눈보라';
  if (code >= 95) return '뇌우';
  return '정보 없음';
};

export const fetchRealTimeWeather = async (locationName: string): Promise<string> => {
  // Determine coordinates based on location name
  let coords = LOCATIONS['서울']; // Default to Seoul
  
  const cleanLoc = locationName.replace(/경마공원|LetsRun|Park/gi, '').trim();

  if (cleanLoc.includes('부산') || cleanLoc.includes('부경')) {
    coords = LOCATIONS['부산'];
  } else if (cleanLoc.includes('제주')) {
    coords = LOCATIONS['제주'];
  } else if (cleanLoc.includes('서울')) {
    coords = LOCATIONS['서울'];
  }

  try {
    // Open-Meteo API (Free, no key required)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FSeoul`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather API Error');
    
    const data = await response.json();
    if (!data.current) return '';

    const { temperature_2m, relative_humidity_2m, weather_code, wind_speed_10m } = data.current;
    const description = getWeatherDescription(weather_code);

    // Returns a formatted string for the AI to read
    return `${coords.name} 현재 날씨: ${description}, 기온 ${temperature_2m}°C, 습도 ${relative_humidity_2m}%, 풍속 ${wind_speed_10m}m/s`;
  } catch (error) {
    console.error("Failed to fetch weather:", error);
    return ''; // Return empty string on failure to allow fallback
  }
};
