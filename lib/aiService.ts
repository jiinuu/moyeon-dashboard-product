
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: (process as any).env.API_KEY });

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

export const analyzeUploadedData = async (data: any[], type: 'residents' | 'policies') => {
  const dataSummary = data.slice(0, 10).map(d => JSON.stringify(d)).join("\n");
  
  const prompt = `
    다음은 한국 지자체의 ${type === 'residents' ? '외국인 거주 현황' : '외국인 지원 정책'} 데이터 샘플입니다:
    ${dataSummary}
    
    이 데이터를 바탕으로 다음을 수행하세요:
    1. 데이터의 주요 특징이나 패턴에 대한 인사이트 3개를 작성하세요.
    2. 이 데이터로 추가로 분석하면 좋을만한 '심화 분석 방향' 3개를 추천하세요.
    
    응답은 반드시 JSON 형식이어야 합니다.
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
                  type: { type: Type.STRING, description: "trend, alert, opportunity 중 하나" }
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
                  icon: { type: Type.STRING, description: "fontawesome 아이콘 클래스명" }
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
    console.error("AI Analysis Failed:", error);
    return null;
  }
};
