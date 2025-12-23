
import { createClient } from '@supabase/supabase-js';

// 주의: 아래 정보는 본인의 Supabase Project Settings -> API 메뉴에서 가져온 정보로 교체해야 합니다.
// Vercel 환경 변수(Environment Variables) 기능을 통해 관리하는 것을 권장합니다.
const supabaseUrl = window.location.hostname === 'localhost' 
  ? 'https://pieibfaeeoxwnqbhdbis.supabase.co' 
  : (import.meta.env?.VITE_SUPABASE_URL || 'https://pieibfaeeoxwnqbhdbis.supabase.co');

const supabaseAnonKey = window.location.hostname === 'localhost'
  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpZWliZmFlZW94d25xYmhkYmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NTQ2NzcsImV4cCI6MjA4MjAzMDY3N30.7dR59GHLmHqR5lIMmRUH5FgIL1xSBlu1hnqyWnPqhmk'
  : (import.meta.env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpZWliZmFlZW94d25xYmhkYmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NTQ2NzcsImV4cCI6MjA4MjAzMDY3N30.7dR59GHLmHqR5lIMmRUH5FgIL1xSBlu1hnqyWnPqhmk');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
