
import { GoogleGenAI, Type } from "@google/genai";

// 호출 시점에 최신 API Key를 가져오도록 함수형으로 선언
const getAI = () => {
  const apiKey = (process as any).env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key가 설정되지 않았습니다. 상단 'API KEY 설정' 버튼을 눌러주세요.");
  }
  return new GoogleGenAI({ apiKey });
};

export interface SchemaMapping {
  targetTable: 'residents' | 'policies';
  columnMap: Record<string, string>; 
  visualizationKey: string;
  unit: string;
}

export interface AIInsight {
  title: string;
  content: string;
  type: 'trend' | 'alert' | 'opportunity';
}

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export interface DetailedAnalysis {
  reportTitle: string;
  summary: string;
  strategicSuggestions: string[];
  riskFactor: string;
}

/**
 * 1. AI 기반 자율 스케마 매핑
 * 어떤 형태의 엑셀이 들어와도 DB 컬럼과 매칭되는 지도를 생성합니다.
 */
export const identifyDataStructure = async (sampleData: any[]): Promise<SchemaMapping> => {
  const ai = getAI();
  const sample = JSON.stringify(sampleData.slice(0, 5));
  
  const prompt = `
    당신은 세계 최고의 데이터 엔지니어입니다. 다음 엑셀 샘플 데이터를 분석하여 시스템 스키마에 매핑하세요.
    데이터 샘플: ${sample}
    
    1. 대상 테이블 판단:
       - 'residents': 지역별 외국인 수, 국적, 비자 정보가 포함된 경우
       - 'policies': 지자체 사업명, 예산, 정책 내용이 포함된 경우
       
    2. 컬럼 매핑:
       - 'region': 지역(서울, 경기 등)
       - 'resident_count': 인원수/거주자수
       - 'budget': 예산/금액
       - 'title': 사업명/정책명
       - 'nationality': 국적
       - 'visa_type': 비자종류
       
    반드시 유효한 JSON만 응답하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // 더 강력한 추론 모델 사용
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            targetTable: { type: Type.STRING, enum: ['residents', 'policies'] },
            columnMap: { 
              type: Type.OBJECT,
              description: "원본 컬럼명을 key로, DB 필드명을 value로 하는 매핑 객체"
            },
            visualizationKey: { type: Type.STRING },
            unit: { type: Type.STRING }
          },
          required: ["targetTable", "columnMap", "visualizationKey", "unit"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Schema Mapping Error:", error);
    throw new Error(error.message || "AI 엔진이 데이터를 해석하지 못했습니다.");
  }
};

/**
 * 2. LLM 스타일의 자율 데이터 분석
 */
export const analyzeUploadedData = async (data: any[], type: string) => {
  const ai = getAI();
  const dataSummary = data.slice(0, 20).map(d => JSON.stringify(d)).join("\n");
  
  const prompt = `
    데이터 성격: ${type === 'residents' ? '대한민국 지역별 외국인 인구 현황' : '지자체별 외국인 지원 정책 및 예산'}
    데이터 요약:
    ${dataSummary}
    
    이 데이터를 바탕으로 정책 결정권자가 즉시 참고할 수 있는 3가지 핵심 인사이트와 3가지 심화 분석 주제를 제안하세요.
    반드시 JSON 형식으로 작성하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['trend', 'alert', 'opportunity'] }
                }
              }
            },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  icon: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Analysis Error:", error);
    return null;
  }
};

/**
 * 3. 클릭 시 생성되는 심층 분석 리포트
 */
export const getDeepDiveAnalysis = async (data: any[], recTitle: string, type: string): Promise<DetailedAnalysis | null> => {
  const ai = getAI();
  const dataSummary = data.slice(0, 15).map(d => JSON.stringify(d)).join("\n");

  const prompt = `
    분석 주제: "${recTitle}"
    데이터 컨텍스트: ${type}
    데이터 샘플: ${dataSummary}
    
    위 주제에 대해 데이터를 근거로 한 상세 전략 리포트를 작성하세요. 
    1. 요약 2. 실행 가능한 4가지 전략 제언 3. 잠재적 리스크 요인을 포함해야 합니다.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reportTitle: { type: Type.STRING },
            summary: { type: Type.STRING },
            strategicSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskFactor: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return null;
  }
};
