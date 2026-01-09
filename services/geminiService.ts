import { GoogleGenAI } from "@google/genai";
import { Horse, RaceConditions, AnalysisResponse, RaceData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to safely parse JSON even if it contains Markdown or extra text
const cleanAndParseJSON = (text: string) => {
  try {
    // 1. Try direct parse
    return JSON.parse(text);
  } catch (e) {
    // 2. Try removing markdown code blocks (```json ... ```)
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
      try {
        return JSON.parse(markdownMatch[1]);
      } catch (e2) {
        // continue
      }
    }
    
    // 3. Try extracting the substring between the first '{' and last '}' OR first '[' and last ']'
    const firstOpenBrace = text.indexOf('{');
    const firstOpenBracket = text.indexOf('[');
    
    // Determine which starts first (handling -1 cases)
    let firstOpen = -1;
    if (firstOpenBrace !== -1 && firstOpenBracket !== -1) {
        firstOpen = Math.min(firstOpenBrace, firstOpenBracket);
    } else if (firstOpenBrace !== -1) {
        firstOpen = firstOpenBrace;
    } else {
        firstOpen = firstOpenBracket;
    }

    const lastCloseBrace = text.lastIndexOf('}');
    const lastCloseBracket = text.lastIndexOf(']');
    
    // Determine which ends last
    const lastClose = Math.max(lastCloseBrace, lastCloseBracket);

    if (firstOpen !== -1 && lastClose !== -1) {
      try {
        return JSON.parse(text.substring(firstOpen, lastClose + 1));
      } catch (e3) {
        // continue
      }
    }
    throw new Error("AI 응답에서 유효한 JSON을 추출할 수 없습니다.");
  }
};

// Updated signature to accept fileName for context
export const analyzeRaceCardPDF = async (base64File: string, fileName?: string): Promise<RaceData[]> => {
  const nowStr = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  
  const prompt = `
    현재 기준 시간: ${nowStr}
    파일명: ${fileName || '알 수 없음 (파일명에서 날짜 유추 가능하면 사용)'}

    첨부된 파일은 한국 경마(부산경남, 제주, 서울)의 출주표(Race Card) PDF입니다.
    이 문서는 여러 개의 경주(1경주, 2경주...) 정보를 포함하고 있습니다.
    
    **임무:**
    문서에 포함된 **모든 경주**의 정보를 추출하여 JSON 배열(Array)로 반환하십시오.
    
    **추출할 데이터:**
    1. **경주 번호**: '제 1경주', '1R' 등으로 표시됩니다. (숫자로 변환)
    2. **출발 시각**: 각 경주의 시작 시간. (YYYY-MM-DD HH:mm 형식으로 변환)
       - 중요: 날짜 정보가 문서나 파일명에 있다면 해당 날짜를 사용하십시오.
       - 날짜가 없다면 오늘 날짜(${nowStr})를 기준으로 하십시오.
    3. **경기 조건**: 장소, 거리(m), 주로, 날씨.
    4. **출전마 리스트**: 각 경주에 출전하는 모든 말의 정보 (번호, 마명, 기수, 나이, 중량, 최근성적).

    **주의사항:**
    - 반드시 **모든 경주**를 순서대로 추출해야 합니다.
    - 마명은 한글입니다.
    - JSON 배열 포맷을 엄격히 준수하십시오.
    
    **결과 JSON 스키마 (Array):**
    [
      {
        "conditions": {
          "raceNumber": 1,
          "raceTime": "YYYY-MM-DD HH:mm",
          "location": "서울/부산경남/제주",
          "distance": "1200", 
          "trackCondition": "건조/다습/포화 등", 
          "weather": "맑음/흐림/비"
        },
        "horses": [
          {
            "id": "1",
            "name": "마명",
            "jockey": "기수명",
            "age": "3",
            "weight": "54.5",
            "recentHistory": "1/12, 3/10",
            "notes": "기타 정보"
          }
        ]
      },
      ...
    ]
  `;

  try {
    // Switch to gemini-3-flash-preview to handle large PDF contexts (up to 1M tokens)
    // The previous model (gemini-2.5-flash-image) had a 32k limit which caused errors with large race cards.
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64File
            }
          },
          { text: prompt }
        ]
      },
    });

    if (response.text) {
      const parsedData = cleanAndParseJSON(response.text);
      
      let raceArray: any[] = [];
      if (Array.isArray(parsedData)) {
        raceArray = parsedData;
      } else if (parsedData.conditions && parsedData.horses) {
        // Single object returned, wrap in array
        raceArray = [parsedData];
      } else if (parsedData.races && Array.isArray(parsedData.races)) {
        // Wrapped in a "races" key
        raceArray = parsedData.races;
      } else {
        // If it's a list of objects but not a valid array string, we might fail.
        // But cleanAndParseJSON handles substring [ ... ].
        throw new Error("올바른 경주 데이터 배열을 찾을 수 없습니다.");
      }

      // Post-process each race
      const processedRaces: RaceData[] = raceArray.map((raceData: any, raceIdx: number) => {
        const processedHorses = (raceData.horses || []).map((h: any, horseIdx: number) => ({
          ...h,
          id: `race-${raceData.conditions?.raceNumber || raceIdx + 1}-horse-${horseIdx}-${Date.now()}`,
          age: parseInt(String(h.age).replace(/[^0-9]/g, '')) || 0,
          weight: parseFloat(String(h.weight).replace(/[^0-9.]/g, '')) || 0,
          recentHistory: h.recentHistory || '기록 없음',
          notes: h.notes || ''
        }));

        const distanceStr = String(raceData.conditions?.distance || "0").replace(/[^0-9]/g, '');
        
        return {
          conditions: {
            raceNumber: raceData.conditions?.raceNumber || (raceIdx + 1),
            raceTime: raceData.conditions?.raceTime || null,
            location: raceData.conditions?.location || "정보 없음",
            distance: parseInt(distanceStr) || 0,
            trackCondition: raceData.conditions?.trackCondition || "정보 없음",
            weather: raceData.conditions?.weather || "정보 없음"
          },
          horses: processedHorses
        };
      });
      
      // Sort by race number
      return processedRaces.sort((a, b) => a.conditions.raceNumber - b.conditions.raceNumber);
    }
  } catch (error: any) {
    console.error("Gemini PDF Analysis Error:", error);
    // Extract meaningful error message from API response if possible
    let errorMessage = "PDF 내용을 인식하는데 실패했습니다.";
    if (error.message && error.message.includes("tokens allowed")) {
       errorMessage = "PDF 파일이 너무 큽니다. 페이지 수를 줄여서 업로드해주세요.";
    } else if (error.message) {
       errorMessage += ` (${error.message})`;
    }
    throw new Error(errorMessage);
  }

  throw new Error("PDF 분석에 실패했습니다.");
};

export const analyzeRace = async (
  horses: Horse[],
  conditions: RaceConditions
): Promise<AnalysisResponse> => {
  
  const horseDataString = horses.map(h => 
    `- ${h.name} (기수: ${h.jockey}, 나이: ${h.age}, 중량: ${h.weight}kg): 최근성적 [${h.recentHistory}], 특이사항 [${h.notes}]`
  ).join('\n');

  const prompt = `
    당신은 한국마사회(KRA) 수석 경마 분석가입니다. 아래 데이터를 바탕으로 우승마를 예측하십시오.

    [경기 조건]
    ${conditions.raceNumber}경주
    장소: ${conditions.location}
    거리: ${conditions.distance}m
    날씨/주로: ${conditions.weather} / ${conditions.trackCondition}
    시간: ${conditions.raceTime || '미정'}

    [출전마 분석 데이터]
    ${horseDataString}

    **분석 지침:**
    1. 각 말의 '최근성적', '부담중량', '기수'의 역량을 종합적으로 평가하십시오.
    2. '나이'를 고려하여 전성기(3~5세)의 말에게 가산점을 주십시오.
    3. JSON 형식으로만 응답하십시오.

    **출력 JSON 형식:**
    {
      "summary": "경기 전체에 대한 전문적인 한국어 총평 (3~4문장). 예상되는 전개(선행/추입 등)와 주요 변수를 언급.",
      "predictions": [
        {
          "horseName": "마명 (입력된 이름 그대로)",
          "winProbability": 0부터 100 사이의 숫자 (정수),
          "predictedPosition": "lead"(선두) | "forward"(선입) | "midfield"(중위) | "backend"(후미),
          "reasoning": "해당 말의 승리/패배 요인에 대한 핵심 분석 (한국어 한 문장)"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", 
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    if (response.text) {
      return cleanAndParseJSON(response.text) as AnalysisResponse;
    }
  } catch (error) {
     console.error("Gemini Race Analysis Error:", error);
     throw new Error("경주 데이터 분석 중 오류가 발생했습니다.");
  }
  
  throw new Error("예측 결과를 생성하지 못했습니다.");
};