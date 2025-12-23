
import { GoogleGenAI, Type } from "@google/genai";

// 인스턴스를 함수 내부에서 생성하여 초기화 에러 방지
const getAI = () => new GoogleGenAI({ apiKey: (process as any).env.API_KEY });

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

export const analyzeUploadedData = async (data: any[], type: 'residents' | 'policies') => {
  const ai = getAI();
  const dataSummary = data.slice(0, 15).map(d => JSON.stringify(d)).join("\n");
  
  const prompt = `
    다음은 한국 지자체의 ${type === 'residents' ? '외국인 거주 현황' : '외국인 지원 정책'} 데이터 샘플입니다:
    ${dataSummary}
    
    데이터 전체 맥락을 분석하여 다음 JSON 구조로 응답하세요:
    1. insights: 데이터의 주요 특징이나 패턴 인사이트 3개.
    2. recommendations: 이 데이터로 추가 수행할 '심화 분석 방향' 3개 (id, title, description, fontawesome 아이콘 포함).
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
    console.error("AI Analysis Failed:", error);
    return null;
  }
};

export const getDeepDiveAnalysis = async (data: any[], recTitle: string, type: string): Promise<DetailedAnalysis | null> => {
  const ai = getAI();
  const dataSummary = data.slice(0, 10).map(d => JSON.stringify(d)).join("\n");

  const prompt = `
    주제: "${recTitle}"에 대한 심층 데이터 분석 리포트 생성
    데이터 타입: ${type}
    데이터 샘플: ${dataSummary}
    
    위 주제에 대해 전문가적 시각에서 상세 분석을 수행하고 다음 JSON 형식으로 응답하세요:
    {
      "reportTitle": "리포트 제목",
      "summary": "핵심 분석 요약 (300자 내외)",
      "strategicSuggestions": ["정책 제언 1", "정책 제언 2", "정책 제언 3"],
      "riskFactor": "주의해야 할 리스크 요소"
    }
  `;

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
