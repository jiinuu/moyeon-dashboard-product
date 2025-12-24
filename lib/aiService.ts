
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
  tableName: string; // 새로 생성될 물리 테이블 이름
  sqlColumns: string; // CREATE TABLE에 들어갈 컬럼 정의 SQL
  mappings: { 
    source: string; 
    target: string; 
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
 * AI 기반 동적 테이블 스키마 생성 엔진
 */
export const analyzeUploadedData = async (data: any[], schema: SchemaMapping): Promise<AnalysisResult | null> => {
  const ai = getAI();
  const dataSummary = data.slice(0, 30).map(d => JSON.stringify(d)).join("\n");
  
  // 프롬프트: 분석 + 시각화 데이터 생성 요청
  const prompt = `
    ${ANALYST_PERSONA}

    [Task]
    Analyze the data and provide:
    1. Key Insights & Recommendations (Korean)
    2. **Visualization Configuration** (JSON for Recharts)

    [Context]
    - Table: ${schema.tableName}
    - Title: ${schema.datasetName}
    - Data Summary: 
    ${dataSummary}

    [Visualization Instructions]
    - Analyze the data patterns and select the **best chart type** (Bar, Line, Pie, or Area).
    - **Trend/Time-series** -> Line or Area chart.
    - **Comparison** -> Bar chart.
    - **Distribution** -> Pie chart.
    - Provide 'data' array optimized for the chart.
    - 'xAxisKey' should be the category column (e.g., date, region).
    - 'seriesKeys' should be the numeric value columns to display.
    - **Chart Title MUST be in Korean.**

    [Language]
    - Insights/Recommendations: **KOREAN**
    - Chart Title/Series Names: **KOREAN**
    - Keys/Types: English (for code compatibility)
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            // 1. 기존 인사이트 영역
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
            // 2. 기존 추천 영역
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
            },
            // 3. ★ 시각화 설정 영역 (Chart.js / Recharts 호환)
            recommendedChart: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['bar', 'line', 'pie', 'area'], description: "Best chart type" },
                title: { type: Type.STRING, description: "Chart title in Korean" },
                xAxisKey: { type: Type.STRING, description: "Key name for X-axis (e.g., 'month')" },
                seriesKeys: { 
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      key: { type: Type.STRING, description: "Key name for data value" },
                      name: { type: Type.STRING, description: "Legend name in Korean" },
                      color: { type: Type.STRING, description: "Hex color code (e.g. #8884d8)" }
                    },
                    required: ["key", "name", "color"]
                  }
                },
                data: {
                  type: Type.ARRAY,
                  description: "Simplified data array for the chart",
                  items: { type: Type.OBJECT } // 유연한 객체 허용
                }
              },
              required: ["type", "title", "data", "xAxisKey", "seriesKeys"]
            }
          },
          required: ["insights", "recommendations", "recommendedChart"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("분석 실패:", error);
    return null;
  }
};