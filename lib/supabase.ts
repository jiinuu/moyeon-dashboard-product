
import { createClient } from '@supabase/supabase-js';

// 주의: 아래 정보는 본인의 Supabase Project Settings -> API 메뉴에서 가져온 정보로 교체해야 합니다.
// Vercel 환경 변수(Environment Variables) 기능을 통해 관리하는 것을 권장합니다.
const supabaseUrl = window.location.hostname === 'localhost' 
  ? 'https://your-project-url.supabase.co' 
  : (import.meta.env?.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co');

const supabaseAnonKey = window.location.hostname === 'localhost'
  ? 'your-anon-key'
  : (import.meta.env?.VITE_SUPABASE_ANON_KEY || 'your-anon-key');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
