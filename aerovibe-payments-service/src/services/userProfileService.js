import { env } from '../lib/env.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { HttpError } from '../lib/httpError.js';

const USER_PROFILES_TABLE = env.USER_PROFILES_TABLE;

export async function getUserProfileLocation(userId) {
  const { data, error } = await supabaseAdmin
    .from(USER_PROFILES_TABLE)
    .select('country, city')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, 'PROFILE_FETCH_ERROR', error.message);
  }

  return {
    country: typeof data?.country === 'string' ? data.country.trim() : '',
    city: typeof data?.city === 'string' ? data.city.trim() : '',
  };
}
