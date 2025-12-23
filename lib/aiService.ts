
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
 * 1. AI 기반 자율 스케마 매핑 및 전처리 규칙 생성
 */
export const identifyDataStructure = async (sampleData: any[]): Promise<SchemaMapping> => {
  const ai = getAI();
  const sample = JSON.stringify(sampleData.slice(0, 5));
  
  const prompt = `
    당신은 10년차 시니어 데이터 엔지니어입니다. 다음 엑셀 샘플 데이터를 분석하여 시스템 DB 스키마에 최적화된 매핑을 수행하세요.
    데이터 샘플: ${sample}
    
    규칙:
    1. 대상 테이블 판단: 'residents'(인구수/국적 관련) 또는 'policies'(지자체 사업/예산 관련)
    2. 매핑 리스트 작성: 원본 컬럼명(source)과 DB 필드명(target)을 짝지으세요.
       - DB 필드명 가이드: 'region', 'resident_count', 'budget', 'title', 'nationality', 'visa_type'
    
    반드시 유효한 JSON만 응답하세요.
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
            targetTable: { type: Type.STRING, enum: ['residents', 'policies'] },
            mappings: { 
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING, description: "원본 파일의 컬럼명" },
                  target: { type: Type.STRING, description: "매핑될 DB 필드명" }
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
    console.error("Schema Mapping Error:", error);
    throw new Error(`AI 엔진 매핑 오류: ${error.message}`);
  }
};

/**
 * 2. 업로드 데이터 기반 인사이트 및 분석 시나리오 추천
 */
export const analyzeUploadedData = async (data: any[], type: string) => {
  const ai = getAI();
  const dataSummary = data.slice(0, 30).map(d => JSON.stringify(d)).join("\n");
  
  const prompt = `
    데이터 성격: ${type === 'residents' ? '대한민국 지역별 외국인 인구 현황' : '지자체별 외국인 지원 정책 및 예산'}
    데이터 요약:
    ${dataSummary}
    
    데이터 시니어 분석가로서, 이 데이터셋에서 발견된 3가지 핵심 인사이트와 
    사용자가 클릭하여 심층 분석해볼 만한 3가지 분석 시나리오(recommendations)를 제안하세요.
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
                  icon: { type: Type.STRING, description: "font-awesome icon class (e.g., fa-solid fa-chart-line)" }
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
  } catch (error) {
    console.error("Analysis Error:", error);
    return null;
  }
};

export const getDeepDiveAnalysis = async (data: any[], recTitle: string, type: string): Promise<DetailedAnalysis | null> => {
  const ai = getAI();
  const dataSummary = data.slice(0, 20).map(d => JSON.stringify(d)).join("\n");

  const prompt = `
    심층 분석 주제: "${recTitle}"
    데이터 컨텍스트: ${type}
    데이터 샘플: ${dataSummary}
    
    데이터 사이언티스트의 관점에서 위 주제에 대해 전문적인 전략 리포트를 작성하세요.
    수치적 근거(데이터 요약 참고)를 바탕으로 구체적인 제언을 포함하세요.
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
          },
          required: ["reportTitle", "summary", "strategicSuggestions", "riskFactor"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return null;
  }
};
