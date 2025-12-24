
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
  datasetName: string;
  targetTable: string;
  mappings: { source: string; target: string; type: 'string' | 'number' | 'date' }[];
  xAxisKey: string;
  yAxisKey: string;
  yAxisLabel: string;
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
 * 1. AI 기반 자율 데이터 전처리 및 가상 스키마 정의
 */
export const identifyAndCleanSchema = async (sampleData: any[]): Promise<SchemaMapping> => {
  const ai = getAI();
  const sample = JSON.stringify(sampleData.slice(0, 10));
  
  const prompt = `
    당신은 10년차 시니어 데이터 사이언티스트입니다. 
    다음 엑셀 데이터를 분석하여 시각화 대시보드 구축을 위한 최적의 '전처리 스나이퍼' 및 '가상 스키마'를 정의하세요.
    
    데이터 샘플: ${sample}
    
    요구사항:
    1. 이 데이터셋의 성격을 가장 잘 나타내는 datasetName을 정하세요.
    2. 시각화 시 X축(주로 지역, 연도, 국적 등 라벨링)과 Y축(주로 인원수, 금액, 비율 등 수치)으로 쓸 가장 적합한 컬럼을 선정하세요.
    3. 모든 수치형 데이터는 전처리 과정에서 순수 숫자로 변환될 수 있도록 type을 명시하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            datasetName: { type: Type.STRING },
            targetTable: { type: Type.STRING, description: "통계 분류 (예: resident_stats, policy_budget, etc)" },
            mappings: { 
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  target: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['string', 'number', 'date'] }
                },
                required: ["source", "target", "type"]
              }
            },
            xAxisKey: { type: Type.STRING, description: "시각화 시 라벨로 쓸 필드명" },
            yAxisKey: { type: Type.STRING, description: "시각화 시 값으로 쓸 필드명" },
            yAxisLabel: { type: Type.STRING },
            unit: { type: Type.STRING }
          },
          required: ["datasetName", "targetTable", "mappings", "xAxisKey", "yAxisKey", "yAxisLabel", "unit"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    throw new Error(`스키마 분석 실패: ${error.message}`);
  }
};

/**
 * 2. 업로드 데이터 기반 인사이트 생성 (동적 스키마 대응)
 */
export const analyzeUploadedData = async (data: any[], schema: SchemaMapping) => {
  const ai = getAI();
  const dataSummary = data.slice(0, 20).map(d => JSON.stringify(d)).join("\n");
  
  const prompt = `
    데이터셋 명칭: ${schema.datasetName}
    데이터 요약 (X축: ${schema.xAxisKey}, Y축: ${schema.yAxisKey}):
    ${dataSummary}
    
    위 데이터를 바탕으로 시니어 분석가의 관점에서 3가지 핵심 인사이트와 심층 분석이 필요한 3가지 시나리오를 제안하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    return null;
  }
};

export const getDeepDiveAnalysis = async (data: any[], recTitle: string, schema: SchemaMapping): Promise<DetailedAnalysis | null> => {
  const ai = getAI();
  const dataSummary = data.slice(0, 15).map(d => JSON.stringify(d)).join("\n");

  const prompt = `
    주제: "${recTitle}"
    데이터셋: ${schema.datasetName}
    데이터 샘플: ${dataSummary}
    
    데이터 사이언티스트로서 전문적인 전략 리포트를 작성하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    return null;
  }
};
