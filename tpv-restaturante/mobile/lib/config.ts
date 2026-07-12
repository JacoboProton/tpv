import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra || {};

export const API_URL: string = (extra.apiUrl as string) || 'https://tpv-sigma.vercel.app';
export const TPV_API_KEY: string = (extra.tpvApiKey as string) || process.env.EXPO_PUBLIC_TPV_API_KEY || '';
export const SUPABASE_URL: string = (extra.supabaseUrl as string) || '';
export const SUPABASE_KEY: string = (extra.supabaseKey as string) || '';
export const STRIPE_PK: string = (extra.stripePk as string) || '';
export const STRIPE_SIMULATED: boolean = extra.stripeSimulated !== false;
