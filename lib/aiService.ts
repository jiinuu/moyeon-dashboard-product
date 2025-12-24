
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
  if (!apiKey) throw new Error("API Key가 설정되지 않았습니다.");
  return new GoogleGenAI({ apiKey });
};

export interface SchemaMapping {
  datasetName: string;
  tableName: string;
  sqlColumns: string;
  mappings: { source: string; target: string; type: 'string' | 'number' }[];
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'area' | 'pie';
  title: string;
  xAxisKey: string;
  yAxisKey: string;
  color: string;
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
}

export interface AnalysisResponse {
  summary: string;
  charts: ChartConfig[];
  insights: AIInsight[];
  recommendations: AIRecommendation[];
}

export const identifyAndCreateDynamicSchema = async (sampleData: any[]): Promise<SchemaMapping> => {
  const ai = getAI();
  const sample = JSON.stringify(sampleData.slice(0, 5));
  
  const prompt = `
    당신은 10년차 시니어 데이터 엔지니어입니다. 제공된 데이터 샘플을 바탕으로 PostgreSQL 테이블 스키마를 설계하세요.
    데이터 샘플: ${sample}
    
    [단계별 사고 과정]
    1. 데이터 성격 파악 (예산, 인구, 매출 등)
    2. 데이터 타입 정의 (수치형 데이터는 NUMERIC, 문자열은 TEXT 사용)
    3. 영문 컬럼명 매핑 (공백 없는 소문자/언더바)
    
    [중요: sqlColumns 작성 규칙]
    - 반드시 "컬럼명 타입, 컬럼명 타입" 형식의 목록만 작성하세요.
    - 예: "id SERIAL PRIMARY KEY, region TEXT, amount NUMERIC"
    - **절대 세미콜론(;)이나 감싸는 괄호(())를 포함하지 마세요.**
    - **마지막 컬럼 뒤에 쉼표(,)를 붙이지 마세요.**
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          datasetName: { type: Type.STRING },
          tableName: { type: Type.STRING },
          sqlColumns: { type: Type.STRING },
          mappings: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                source: { type: Type.STRING },
                target: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['string', 'number'] }
              },
              required: ["source", "target", "type"]
            }
          }
        },
        required: ["datasetName", "tableName", "sqlColumns", "mappings"]
      }
    }
  });
  return JSON.parse(response.text || "{}");
};

export const analyzeUploadedData = async (data: any[], schema: SchemaMapping): Promise<AnalysisResponse | null> => {
  const ai = getAI();
  const dataSummary = JSON.stringify(data.slice(0, 30));
  
  const prompt = `
    [시스템 역할] 전문 데이터 분석가 및 전략 컨설턴트
    [데이터셋 정보] 제목: ${schema.datasetName}, 테이블명: ${schema.tableName}
    [데이터 샘플] ${dataSummary}

    [분석 가이드라인 (Thought Trace)]
    1. **Investigating**: 데이터의 핵심 변수와 측정 단위를 파악하십시오.
    2. **Planning**: 데이터에서 유의미한 상관관계나 트렌드를 찾기 위한 분석 전략을 세우십시오.
    3. **Exploring**: 지역별/카테고리별 차이, 전년 대비 변화, 이상치 등을 탐색하십시오.
    4. **Summarizing**: 발견된 사실을 바탕으로 비즈니스 인사이트와 시각화 방향을 결정하십시오.

    [시각화 규칙]
    - 데이터의 성격에 맞는 차트 타입(bar, line, area, pie)을 선택하십시오.
    - xAxisKey와 yAxisKey는 반드시 제공된 매핑 테이블의 'target' 컬럼명 중 하나여야 합니다.

    [출력 언어] 반드시 한국어로 답변하십시오.
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
            summary: { type: Type.STRING },
            charts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['bar', 'line', 'area', 'pie'] },
                  title: { type: Type.STRING },
                  xAxisKey: { type: Type.STRING },
                  yAxisKey: { type: Type.STRING },
                  color: { type: Type.STRING }
                },
                required: ["type", "title", "xAxisKey", "yAxisKey", "color"]
              }
            },
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
                  description: { type: Type.STRING }
                },
                required: ["id", "title", "description"]
              }
            }
          },
          required: ["summary", "charts", "insights", "recommendations"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Analysis Error:", error);
    return null;
  }
};

export const getDeepDiveAnalysis = async (data: any[], recTitle: string, schema: SchemaMapping) => {
  const ai = getAI();
  const prompt = `주제: ${recTitle}\n데이터: ${JSON.stringify(data.slice(0, 15))}\n위 주제에 대한 심층 전략 리포트를 작성하세요.`;
  
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
};
