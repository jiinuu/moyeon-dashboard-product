
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
  dataType: 'residents' | 'policies' | 'general';
  // 물리 DB 컬럼에 맞춘 표준 매핑
  mappings: { 
    source: string; 
    target: 'region' | 'resident_count' | 'budget' | 'title' | 'category' | 'nationality' | 'visa_type'; 
    type: 'string' | 'number'
  }[];
  xAxisLabel: string;
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
 * AI 기반 자율 데이터 정규화 및 가상 스키마 정의
 */
export const identifyAndCleanSchema = async (sampleData: any[]): Promise<SchemaMapping> => {
  const ai = getAI();
  const sample = JSON.stringify(sampleData.slice(0, 10));
  
  const prompt = `
    당신은 10년차 시니어 데이터 엔지니어입니다. 
    다음 엑셀 데이터를 분석하여 시스템 DB의 표준 필드로 정규화(Normalization) 하세요.
    
    데이터 샘플: ${sample}
    
    [중요] 반드시 다음 허용된 target 필드 중 하나로만 매핑하세요:
    - 'region': 지역명, 국가명, 장소 등 (X축 후보)
    - 'resident_count': 인원수, 수량, 횟수 등 (수치)
    - 'budget': 금액, 예산, 비용 등 (수치)
    - 'title': 제목, 사업명, 항목명 등
    - 'category': 분류, 유형 등
    - 'nationality': 국적
    - 'visa_type': 비자유형
    
    요구사항:
    1. 이 데이터셋의 성격을 가장 잘 나타내는 datasetName을 정하세요.
    2. 시각화 시 X축과 Y축으로 쓸 가장 적합한 라벨(xAxisLabel, yAxisLabel)을 정하세요.
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
            dataType: { type: Type.STRING, enum: ['residents', 'policies', 'general'] },
            mappings: { 
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  target: { type: Type.STRING, enum: ['region', 'resident_count', 'budget', 'title', 'category', 'nationality', 'visa_type'] },
                  type: { type: Type.STRING, enum: ['string', 'number'] }
                },
                required: ["source", "target", "type"]
              }
            },
            xAxisLabel: { type: Type.STRING },
            yAxisLabel: { type: Type.STRING },
            unit: { type: Type.STRING }
          },
          required: ["datasetName", "dataType", "mappings", "xAxisLabel", "yAxisLabel", "unit"]
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    throw new Error(`스키마 분석 실패: ${error.message}`);
  }
};

export const analyzeUploadedData = async (data: any[], schema: SchemaMapping) => {
  const ai = getAI();
  const dataSummary = data.slice(0, 20).map(d => JSON.stringify(d)).join("\n");
  
  const prompt = `
    데이터셋: ${schema.datasetName}
    데이터 요약: ${dataSummary}
    시니어 분석가로서 3가지 핵심 인사이트와 3가지 심층 시나리오를 제안하세요.
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

  const prompt = `분석 주제: "${recTitle}"\n데이터셋: ${schema.datasetName}\n샘플: ${dataSummary}\n전문적인 전략 리포트를 작성하세요.`;

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
