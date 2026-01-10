import { GoogleGenAI, Type } from "@google/genai";
import { Horse, RaceConditions, AnalysisResponse, RaceData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to safely parse JSON even if it contains Markdown or extra text
const cleanAndParseJSON = (text: string) => {
  // 1. Remove markdown code blocks (```json ... ```) first
  let jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();

  // 2. Try direct parse
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    // Continue to heuristics
  }

  // 3. Extract substring between first '[' and last ']'
  const firstOpenBracket = jsonText.indexOf('[');
  const lastCloseBracket = jsonText.lastIndexOf(']');
  
  if (firstOpenBracket !== -1 && lastCloseBracket !== -1 && lastCloseBracket > firstOpenBracket) {
    try {
      return JSON.parse(jsonText.substring(firstOpenBracket, lastCloseBracket + 1));
    } catch (e) {
      // Extraction failed, fall through to repair
    }
  }

  // 4. Extract substring between first '{' and last '}' (for single objects)
  const firstOpenBrace = jsonText.indexOf('{');
  const lastCloseBrace = jsonText.lastIndexOf('}');
  
  if (firstOpenBrace !== -1 && lastCloseBrace !== -1 && lastCloseBrace > firstOpenBrace) {
      try {
        const potentialObj = JSON.parse(jsonText.substring(firstOpenBrace, lastCloseBrace + 1));
        // If we expected an array but got an object, wrap it (handled in caller usually, but good for parsing)
        return potentialObj; 
      } catch (e) {
         // Continue
      }
  }

  // 5. Truncation Repair (Aggressive)
  // If it starts with '[', it's likely a list that got cut off.
  // We iterate backwards looking for the last successfully closed object '}'.
  if (firstOpenBracket !== -1) {
       console.warn("Attempting to repair truncated JSON array...");
       let currentEndIndex = jsonText.lastIndexOf('}');
       
       // Try up to 50 times to find a valid closing point to prevent infinite loops on weird text
       let attempts = 0;
       while (currentEndIndex > firstOpenBracket && attempts < 50) {
           const attemptStr = jsonText.substring(firstOpenBracket, currentEndIndex + 1) + ']';
           try {
               const result = JSON.parse(attemptStr);
               console.log(`Successfully repaired JSON after ${attempts + 1} attempts.`);
               return result;
           } catch (e) {
               // The '}' might be inside a string or nested object. Find the previous '}'.
               currentEndIndex = jsonText.lastIndexOf('}', currentEndIndex - 1);
               attempts++;
           }
       }
  }
  
  console.error("Failed to parse JSON text:", text.substring(0, 200) + "...");
  throw new Error("AI 응답에서 유효한 JSON을 추출할 수 없습니다.");
};

// Updated signature to accept fileName for context
export const analyzeRaceCardPDF = async (base64File: string, fileName?: string): Promise<RaceData[]> => {
  const nowStr = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  const prompt = `
    현재 기준 시간: ${nowStr}
    파일명: ${fileName || '알 수 없음'}

    첨부된 파일은 한국 경마(서울, 제주, 부산경남)의 **전체 출주표** PDF입니다.
    이 파일에는 **여러 지역(Location)의 경주들이 섞여** 있습니다.

    **[치명적 요구사항 - 누락 금지 및 상세 데이터 보존]**
    1. 문서의 **첫 페이지부터 마지막 페이지까지** 꼼꼼히 스캔하십시오.
    2. **'서울', '제주', '부산(부경)' 등 파일에 포함된 모든 지역의 모든 경주를 추출해야 합니다.** (중간에 멈추지 마십시오.)
    3. 경주 번호가 순차적으로 이어지는지 확인하십시오. (예: 서울 1~11R, 제주 1~7R 등 모두 포함되어야 함)
    4. **[중요] 데이터의 품질을 높이십시오.** 말(Horse)의 'recentHistory'(최근 성적/기록)와 'notes'(특이사항/조교상태 등) 정보를 **요약하지 말고 가능한 원본 텍스트의 핵심 내용을 그대로 포함**하십시오. 분석의 정확도는 이 데이터의 디테일에 달려 있습니다.
    
    **데이터 포맷 (JSON Array):**
    [
      {
        "conditions": {
          "raceNumber": 1, 
          "raceTime": "YYYY-MM-DD HH:mm", 
          "location": "서울", 
          "distance": 1200, 
          "trackCondition": "건조(5%)", 
          "weather": "맑음"
        },
        "horses": [
          { "name": "마명", "jockey": "기수", "age": 3, "weight": 54, "recentHistory": "최근 3회 성적 및 기록 상세", "notes": "조교 상태, 장구 변경 등 상세 내용" }
        ]
      }
    ]

    **시간/날짜 처리:**
    - raceTime은 반드시 "YYYY-MM-DD HH:mm" 포맷이어야 합니다.
    - 문서에 날짜가 없고 시간(예: "10:35")만 있다면, 오늘 날짜("${todayDate}")와 결합하여 절대적인 시간값으로 만드십시오.

    오직 JSON 데이터만 반환하십시오.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Still use PRO for context window
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
      config: {
        temperature: 0,
        seed: 42,
        responseMimeType: "application/json" 
      }
    });

    if (response.text) {
      const parsedData = cleanAndParseJSON(response.text);
      
      let raceArray: any[] = [];
      if (Array.isArray(parsedData)) {
        raceArray = parsedData;
      } else if (parsedData.conditions && parsedData.horses) {
        raceArray = [parsedData];
      } else if (parsedData.races && Array.isArray(parsedData.races)) {
        raceArray = parsedData.races;
      } else {
        const keys = Object.keys(parsedData);
        const likelyArray = keys.find(k => Array.isArray(parsedData[k]));
        if (likelyArray) {
            raceArray = parsedData[likelyArray];
        } else {
            console.warn("Unexpected JSON structure:", parsedData);
            throw new Error("올바른 경주 데이터 배열을 찾을 수 없습니다.");
        }
      }

      // Post-process each race
      const processedRaces: RaceData[] = raceArray.map((raceData: any, raceIdx: number) => {
        const processedHorses = (raceData.horses || []).map((h: any, horseIdx: number) => ({
          ...h,
          id: `race-${raceData.conditions?.raceNumber || raceIdx + 1}-horse-${horseIdx}-${Date.now()}`,
          age: typeof h.age === 'number' ? h.age : parseInt(String(h.age).replace(/[^0-9]/g, '')) || 0,
          weight: typeof h.weight === 'number' ? h.weight : parseFloat(String(h.weight).replace(/[^0-9.]/g, '')) || 0,
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
      
      // SORT BY TIME (Chronological Order)
      return processedRaces.sort((a, b) => {
        const dateA = a.conditions.raceTime ? new Date(a.conditions.raceTime) : new Date(0);
        const dateB = b.conditions.raceTime ? new Date(b.conditions.raceTime) : new Date(0);
        
        const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
        const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();

        if (timeA > 0 && timeB > 0) {
            return timeA - timeB;
        }
        if (a.conditions.raceNumber !== b.conditions.raceNumber) {
            return a.conditions.raceNumber - b.conditions.raceNumber;
        }
        return (a.conditions.location || "").localeCompare(b.conditions.location || "");
      });
    }
  } catch (error: any) {
    console.error("Gemini PDF Analysis Error:", error);
    let errorMessage = "PDF 내용을 인식하는데 실패했습니다.";
    if (error.message && error.message.includes("JSON")) {
       errorMessage += " (AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.)";
    } else if (error.message && error.message.includes("tokens")) {
       errorMessage = "PDF 파일이 너무 큽니다. 페이지 수를 줄여주세요.";
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
    당신은 **30년 경력의 전설적인 경마 예상가(Legendary Handicapper)**입니다. 
    제공된 출주표 데이터, 주로 상태, 날씨, 부담중량, 기수 역량, 최근 추세를 종합하여 **가장 정교하고 날카로운 분석**을 내놓아야 합니다.

    [경기 조건]
    ${conditions.raceNumber}경주 | 장소: ${conditions.location}
    거리: ${conditions.distance}m | 날씨/주로: ${conditions.weather} / ${conditions.trackCondition}

    [출전마 데이터 상세]
    ${horseDataString}

    **[심층 분석 가이드라인]**
    1. **경주 전개 시나리오 (Pace Scenario)**:
       - 이번 경주 거리(${conditions.distance}m)에서 누가 선행을 나설 것인가? 
       - 선행 싸움이 치열하여 무너질 것인가(H-pace), 아니면 단독 선행으로 버틸 것인가(S-pace)?
       - '전개상 이점'을 가진 말을 찾아내십시오.
    
    2. **숨겨진 가치 찾기 (Hidden Value)**:
       - 단순 기록뿐만 아니라, **부담중량의 변화**, **기수 교체**(특히 감량 기수나 리딩 자키로의 교체), **승급전 여부**를 체크하십시오.
       - 최근 성적이 좋지 않더라도, 불리한 전개나 방해로 인해 능력을 발휘하지 못한 '복병마'를 찾아내십시오.
    
    3. **리스크 요인 검증**:
       - 인기마(Top Favorite)라도 위험 요소(높은 부담중량, 외곽 게이트, 공백기 등)가 있다면 과감하게 지적하십시오.

    **[출력 요구사항]**
    - **summary**: 경기 전체의 흐름을 3문장으로 요약. (예: "초반 빠른 흐름이 예상되며, XX가 선행을 주도하겠지만 막판 XX의 추입이 매서울 것이다.")
    - **paceAnalysis**: 전개 예상 (선행형/추입형 유리 여부).
    - **predictions**: 각 말에 대한 분석 결과.
      - **winProbability**: 우승 확률 (%). 합계가 100%가 되도록 하지는 않아도 되지만, 상대적 강약을 명확히 구분하십시오.
      - **reasoning**: 해당 순위로 예측한 **결정적이고 구체적인 이유** (예: "감량 기수 기용으로 3kg 감량 효과, 선행 나설 시 버티기 가능").
      - **starRating**: 1~5점.
      - **keyFactor**: 승리를 위한 핵심 열쇠 (예: "단독 선행", "인코스 이점").
      - **riskFactor**: 불안 요소 (예: "체중 과다", "늦발끼 있음").
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2, // Slightly increased for more insightful/creative reasoning
        seed: 42,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            paceAnalysis: { type: Type.STRING },
            predictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  horseName: { type: Type.STRING },
                  winProbability: { type: Type.INTEGER },
                  predictedPosition: { type: Type.STRING }, 
                  reasoning: { type: Type.STRING },
                  starRating: { type: Type.INTEGER },
                  keyFactor: { type: Type.STRING },
                  riskFactor: { type: Type.STRING }
                },
                required: ["horseName", "winProbability", "reasoning", "starRating"]
              }
            }
          },
          required: ["summary", "paceAnalysis", "predictions"]
        }
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