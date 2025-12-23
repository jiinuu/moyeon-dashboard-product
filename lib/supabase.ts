
import { createClient } from '@supabase/supabase-js';

// 브라우저 호환성을 위해 안전하게 환경 변수 및 설정을 확인합니다.
const getSupabaseConfig = () => {
  const defaultUrl = 'https://pieibfaeeoxwnqbhdbis.supabase.co';
  const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpZWliZmFlZW94d25xYmhkYmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NTQ2NzcsImV4cCI6MjA4MjAzMDY3N30.7dR59GHLmHqR5lIMmRUH5FgIL1xSBlu1hnqyWnPqhmk';

  // import.meta.env가 없을 경우를 대비한 안전한 접근
  try {
    const env = (import.meta as any).env;
    return {
      url: env?.VITE_SUPABASE_URL || defaultUrl,
      key: env?.VITE_SUPABASE_ANON_KEY || defaultKey
    };
  } catch (e) {
    return { url: defaultUrl, key: defaultKey };
  }
};

const { url, key } = getSupabaseConfig();
export const supabase = createClient(url, key);
