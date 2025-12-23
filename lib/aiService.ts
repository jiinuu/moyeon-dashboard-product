
import { GoogleGenAI, Type } from "@google/genai";

const getApiKey = (): string | null => {
  const manualKey = localStorage.getItem('GEMINI_API_KEY');
  if (manualKey) return manualKey;
  const envKey = (process as any).env.API_KEY;
  if (envKey && envKey !== "undefined" && envKey !== "") return envKey;
  return null;
};

const getAI = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API Key가 설정되지 않았습니다. 상단 'API 키 설정' 버튼을 눌러주세요.");
  }
  return new GoogleGenAI({ apiKey });
};

export interface SchemaMapping {
  targetTable: 'residents' | 'policies';
  mappings: { source: string; target: string }[];
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
 * 1. AI 기반 자율 스케마 매핑 (Flash 모델 사용 - 속도 및 할당량 우선)
 */
export const identifyDataStructure = async (sampleData: any[]): Promise<SchemaMapping> => {
  const ai = getAI();
  const sample = JSON.stringify(sampleData.slice(0, 5));
  
  const prompt = `
    당신은 10년차 시니어 데이터 엔지니어입니다. 다음 엑셀 샘플 데이터를 분석하여 시스템 DB 스키마에 최적화된 매핑을 수행하세요.
    데이터 샘플: ${sample}
    
    1. 대상 테이블 판단: 'residents'(인구수/국적 관련) 또는 'policies'(지자체 사업/예산 관련)
    2. 매핑 리스트 작성: 원본 컬럼명(source)과 DB 필드명(target)을 짝지으세요.
       - 필드명 가이드: 'region', 'resident_count', 'budget', 'title', 'nationality', 'visa_type'
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // 할당량이 넉넉한 Flash 모델로 변경
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            targetTable: { type: Type.STRING, enum: ['residents', 'policies'] },
            mappings: { 
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  target: { type: Type.STRING }
                },
                required: ["source", "target"]
              }
            },
            visualizationKey: { type: Type.STRING },
            unit: { type: Type.STRING }
          },
          required: ["targetTable", "mappings", "visualizationKey", "unit"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    if (error.message?.includes('429')) {
      throw new Error("AI 할당량이 소진되었습니다. 1분 후 다시 시도하거나 유료 계정 키를 사용해주세요.");
    }
    throw error;
  }
};

/**
 * 2. 업로드 데이터 기반 초기 인사이트 생성 (Flash 모델 사용)
 */
export const analyzeUploadedData = async (data: any[], type: string) => {
  const ai = getAI();
  const dataSummary = data.slice(0, 25).map(d => JSON.stringify(d)).join("\n");
  
  const prompt = `
    데이터 성격: ${type === 'residents' ? '대한민국 지역별 외국인 인구 현황' : '지자체별 외국인 지원 정책 및 예산'}
    데이터 샘플: ${dataSummary}
    
    데이터 시니어 분석가로서, 이 데이터셋에서 발견된 3가지 핵심 인사이트와 
    사용자가 클릭하여 심층 분석해볼 만한 3가지 구체적인 시나리오를 제안하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // Flash 모델 사용
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
                },
                required: ["title", "content", "type"]
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
                },
                required: ["id", "title", "description", "icon"]
              }
            }
          },
          required: ["insights", "recommendations"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Analysis Error:", error);
    return null;
  }
};

/**
 * 3. 심층 분석 리포트 (Pro 모델 사용 - 사용자가 클릭했을 때만 실행)
 */
export const getDeepDiveAnalysis = async (data: any[], recTitle: string, type: string): Promise<DetailedAnalysis | null> => {
  const ai = getAI();
  const dataSummary = data.slice(0, 15).map(d => JSON.stringify(d)).join("\n");

  const prompt = `
    심층 분석 주제: "${recTitle}"
    데이터 컨텍스트: ${type}
    데이터 샘플: ${dataSummary}
    
    데이터 사이언티스트의 관점에서 위 주제에 대해 전문적인 전략 리포트를 작성하세요.
    반드시 데이터 수치적 근거를 포함해야 합니다.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // 심층 분석에만 Pro 모델 사용
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
          },
          required: ["reportTitle", "summary", "strategicSuggestions", "riskFactor"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    // Pro 모델이 여전히 429라면 Flash로 자동 폴백(Fallback)
    console.warn("Pro model exhausted, falling back to Flash...");
    return null;
  }
};
