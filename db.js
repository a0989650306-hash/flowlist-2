import { createClient } from '@supabase/supabase-js';
export function db() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase 環境變數未設定');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false, autoRefreshToken:false}});
}
export function checked(result) { if(result.error) throw new Error(result.error.message); return result.data; }
