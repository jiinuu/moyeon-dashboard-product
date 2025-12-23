
import { createClient } from '@supabase/supabase-js';

// 실제 배포 시에는 환경 변수로 관리해야 합니다.
const supabaseUrl = 'https://your-project-url.supabase.co'; 
const supabaseAnonKey = 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
