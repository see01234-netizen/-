
import { GoogleGenAI, Type } from "@google/genai";
import { Horse, RaceConditions, AnalysisResponse, RaceData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const cleanAndParseJSON = (text: string) => {
  let jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(jsonText);
  } catch (e) {}
  const firstOpenBrace = jsonText.indexOf('{');
  const lastCloseBrace = jsonText.lastIndexOf('}');
  if (firstOpenBrace !== -1 && lastCloseBrace !== -1 && lastCloseBrace > firstOpenBrace) {
      try {
        return JSON.parse(jsonText.substring(firstOpenBrace, lastCloseBrace + 1));
      } catch (e) {}
  }
  throw new Error("AI 응답에서 유효한 JSON을 추출할 수 없습니다.");
};

export const analyzeRaceCardPDF = async (base64File: string, fileName?: string): Promise<RaceData[]> => {
  const prompt = `
    첨부된 한국 경마 전체 출주표 PDF에서 모든 지역의 경주 데이터를 추출하십시오.
    데이터 누락 없이 '마명', '기수', '부담중량', '최근기록', '조교특이사항'을 상세히 파싱하십시오.
    오직 JSON 데이터(Array)만 반환하십시오.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: { parts: [{ inlineData: { mimeType: "application/pdf", data: base64File } }, { text: prompt }] },
      config: { temperature: 0, responseMimeType: "application/json" }
    });
    if (response.text) {
      const parsedData = cleanAndParseJSON(response.text);
      let raceArray = Array.isArray(parsedData) ? parsedData : (parsedData.races || [parsedData]);
      return raceArray.map((raceData: any, raceIdx: number) => ({
        conditions: {
          raceNumber: raceData.conditions?.raceNumber || (raceIdx + 1),
          raceTime: raceData.conditions?.raceTime || null,
          location: raceData.conditions?.location || "정보 없음",
          distance: parseInt(String(raceData.conditions?.distance).replace(/[^0-9]/g, '')) || 0,
          trackCondition: raceData.conditions?.trackCondition || "정보 없음",
          weather: raceData.conditions?.weather || "정보 없음"
        },
        horses: (raceData.horses || []).map((h: any, horseIdx: number) => ({
          ...h,
          id: `h-${Date.now()}-${horseIdx}`,
          age: parseInt(String(h.age).replace(/[^0-9]/g, '')) || 0,
          weight: parseFloat(String(h.weight).replace(/[^0-9.]/g, '')) || 0,
          recentHistory: h.recentHistory || '기록 없음',
          notes: h.notes || ''
        }))
      })).sort((a: any, b: any) => (new Date(a.conditions.raceTime).getTime() || 0) - (new Date(b.conditions.raceTime).getTime() || 0));
    }
  } catch (error) { throw error; }
  throw new Error("분석 실패");
};

export const analyzeRace = async (
  horses: Horse[],
  conditions: RaceConditions,
  realTimeWeather?: string,
  trackConditionOverride?: string
): Promise<AnalysisResponse> => {
  const horseDataWithGate = horses.map((h, i) => 
    `[${i + 1}번 게이트] ${h.name} (기수: ${h.jockey}, 중량: ${h.weight}kg): 최근성적 [${h.recentHistory}], 특이사항 [${h.notes}]`
  ).join('\n');

  const weatherToUse = realTimeWeather || conditions.weather;
  const trackToUse = trackConditionOverride || conditions.trackCondition;
  
  const biasMap = {
    'lead': '오늘의 흐름: 선행마(앞에서 뛰는 말)가 절대적으로 유리함',
    'closer': '오늘의 흐름: 추입마(뒤에서 스퍼트하는 말)가 유리함',
    'inside': '오늘의 흐름: 안쪽 게이트(1~4번)의 기록이 매우 좋음',
    'outside': '오늘의 흐름: 바깥쪽 게이트가 모래를 덜 맞아 유리함',
    'neutral': '오늘의 흐름: 편향 없음(평이함)'
  };
  const biasInfo = conditions.trackBias ? biasMap[conditions.trackBias] : "정보 없음";

  const prompt = `
    당신은 세계 최고의 경마 데이터 분석가이자 전설적인 핸디캡퍼입니다.
    다음 데이터를 바탕으로 **가상 레이스 시뮬레이션을 10,000회 실시**한 결과를 도출하십시오.

    [핵심 변수]
    - 장소/거리: ${conditions.location} / ${conditions.distance}m
    - 환경: ${weatherToUse} (주로: ${trackToUse})
    - **${biasInfo}** (이 흐름은 다른 모든 지표보다 우선하여 가중치를 부여하십시오)

    [출전마 데이터]
    ${horseDataWithGate}

    **[정밀 분석 가이드라인]**
    1. **부중 변화의 경제학**: 이전 경주 대비 부담중량이 늘어난 말과 줄어든 말의 '거리 대비 피로도'를 계산하십시오.
    2. **기수 역량**: 단순히 승수가 아닌, 해당 기수가 이 말과 이 거리에서 어떤 성적을 냈는지 유추(데이터 기반) 하십시오.
    3. **페이스 시나리오**: 초반 200m(S1F) 지점의 선두 싸움을 예측하여 외곽 게이트의 선행마가 진입할 수 있을지 판별하십시오.
    4. **신뢰도 산출**: 데이터가 충분한지, 혹은 이변 가능성이 큰 경주인지 0-100점으로 산출하십시오.

    JSON 포맷으로 응답하되, confidenceScore(숫자)와 keyVariable(이번 경주 승패를 결정지을 단 하나의 요소)를 포함하십시오.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 32768 }, // Enable deep reasoning
        maxOutputTokens: 10000,
        tools: [{ googleSearch: {} }], 
        responseMimeType: "application/json",
        temperature: 0.2,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            appliedWeather: { type: Type.STRING },
            appliedTrackCondition: { type: Type.STRING },
            confidenceScore: { type: Type.INTEGER },
            keyVariable: { type: Type.STRING },
            summary: { type: Type.STRING },
            paceAnalysis: { type: Type.STRING },
            bettingRecommendations: {
              type: Type.OBJECT,
              properties: {
                topFiveNames: { type: Type.ARRAY, items: { type: Type.STRING } },
                quinella: { type: Type.ARRAY, items: { type: Type.STRING } },
                trio: { type: Type.ARRAY, items: { type: Type.STRING } },
                strategyNote: { type: Type.STRING }
              },
              required: ["topFiveNames", "quinella", "trio", "strategyNote"]
            },
            predictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  horseName: { type: Type.STRING },
                  winProbability: { type: Type.INTEGER },
                  reasoning: { type: Type.STRING },
                  starRating: { type: Type.INTEGER },
                  keyFactor: { type: Type.STRING },
                  riskFactor: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      return cleanAndParseJSON(response.text) as AnalysisResponse;
    }
  } catch (error) { throw error; }
  throw new Error("분석 생성 실패");
};
