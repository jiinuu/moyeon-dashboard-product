
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
  당신은 모든 도메인의 데이터를 다루는 '데이터 표준화 전문가'입니다.
  입력된 Raw Data 샘플을 분석하여, 데이터베이스 적재 및 시각화를 위한 **최적의 표준화 명세서(Standardization Spec)**를 작성하세요.

  ## 입력 데이터 샘플:
  ${sample}

  ## 수행 과제:
  1. **데이터 요약(Context):** 이 데이터가 무엇에 관한 것인지 한 문장으로 정의하세요.
  2. **컬럼 분석(Column Analysis):** 각 컬럼의 의미를 파악하여 다음을 수행하세요.
     - **suggested_name:** 해당 컬럼을 DB에 저장할 때 가장 적합한 **표준 영어 변수명(snake_case)**을 제안하세요. (예: '시도명' -> 'region_name', '총 예산(원)' -> 'total_budget')
     - **semantic_role:** 컬럼의 역할을 분류하세요 (DIMENSION, METRIC, DATE, ID, UNKNOWN).
     - **cleaning_strategy:** 데이터를 깨끗하게 만들기 위한 규칙을 지정하세요.

  ## 전처리 전략 (cleaning_strategy) 가이드:
  - "NUMERIC_ONLY": 숫자와 소수점만 남기고 나머지(통화기호, 콤마, 단위) 제거. (예: "1,000원" -> 1000)
  - "DATE_FORMAT": 날짜 형식 통일 (YYYY-MM-DD). "2023.05" 처럼 월까지만 있어도 "2023-05-01" 형태로 변환 필요.
  - "KOREAN_REGION_STD": 한국 행정구역 명칭 표준화 (예: "전북" -> "전북특별자치도", "서울" -> "서울특별시").
  - "TEXT_CLEAN": 앞뒤 공백 제거 및 특수문자 제거.
  - "KEEP": 변경 없음.

  ## 출력 포맷 (JSON Only):
  {
    "dataset_summary": "이 데이터는 2024년도 지자체별 외국인 지원 예산 현황입니다.",
    "columns": [
      {
        "source_header": "원본 컬럼명",
        "suggested_name": "db_column_name",
        "label_kr": "한글 라벨명(시각화용)",
        "semantic_role": "METRIC", 
        "data_type": "INTEGER",
        "cleaning_strategy": "NUMERIC_ONLY"
      }
    ]
  }
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
