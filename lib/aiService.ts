
import { GoogleGenAI, Type } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: (process as any).env.API_KEY });

export interface SchemaMapping {
  targetTable: 'residents' | 'policies';
  columnMap: Record<string, string>; // 원본컬럼 -> DB컬럼
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

// 1. 파일의 구조를 보고 어떤 테이블에 넣을지, 어떤 컬럼이 중요한지 판단
export const identifyDataStructure = async (sampleData: any[]): Promise<SchemaMapping> => {
  const ai = getAI();
  const sample = JSON.stringify(sampleData.slice(0, 5));
  
  const prompt = `
    다음은 업로드된 엑셀 데이터의 샘플입니다: ${sample}
    이 데이터를 분석하여 한국 외국인 정책 시스템의 어느 테이블에 적합한지 판단하고 컬럼 매핑 정보를 반환하세요.
    - 대상 테이블: 'residents' (인구/거주 현황), 'policies' (예산/정책/사업)
    - 반드시 JSON 구조로 응답하세요.
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
            targetTable: { type: Type.STRING, enum: ['residents', 'policies'] },
            columnMap: { 
              type: Type.OBJECT,
              description: "데이터의 한글 컬럼명을 DB 필드명(region, resident_count, budget, title, nationality)으로 매핑"
            },
            visualizationKey: { type: Type.STRING, description: "차트에 표시할 핵심 수치 필드명" },
            unit: { type: Type.STRING, description: "수치의 단위 (명, 원, 백만원 등)" }
          }
        }
      }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Schema Identification Failed:", error);
    // 기본값 반환
    return { targetTable: 'residents', columnMap: {}, visualizationKey: 'resident_count', unit: '명' };
  }
};

export const analyzeUploadedData = async (data: any[], type: string) => {
  const ai = getAI();
  const dataSummary = data.slice(0, 15).map(d => JSON.stringify(d)).join("\n");
  
  const prompt = `
    데이터 맥락 분석 리포트 생성 (${type}):
    ${dataSummary}
    
    인사이트 3개와 심화 분석 추천 3개를 JSON으로 생성하세요.
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
                  type: { type: Type.STRING }
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
    return null;
  }
};

export const getDeepDiveAnalysis = async (data: any[], recTitle: string, type: string): Promise<DetailedAnalysis | null> => {
  const ai = getAI();
  const dataSummary = data.slice(0, 10).map(d => JSON.stringify(d)).join("\n");

  const prompt = `주제: "${recTitle}" (${type}) 데이터 샘플: ${dataSummary} 심층 리포트 JSON 생성`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return null;
  }
};
