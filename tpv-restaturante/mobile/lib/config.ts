import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const API_URL: string = (extra.apiUrl as string) || 'http://192.168.1.132:3001';
export const SUPABASE_URL: string = (extra.supabaseUrl as string) || '';
export const SUPABASE_KEY: string = (extra.supabaseKey as string) || '';
