import Constants from 'expo-constants';

// Prioridad: variables de entorno > app.json extra > valores por defecto
const extra = Constants.expoConfig?.extra || {};

export const API_URL: string = process.env.EXPO_PUBLIC_API_URL || (extra.apiUrl as string) || 'https://tpv-sigma.vercel.app';
export const TPV_API_KEY: string = process.env.EXPO_PUBLIC_TPV_API_KEY || (extra.tpvApiKey as string) || '';
export const SUPABASE_URL: string = process.env.EXPO_PUBLIC_SUPABASE_URL || (extra.supabaseUrl as string) || '';
export const SUPABASE_KEY: string = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || (extra.supabaseKey as string) || '';
export const STRIPE_PK: string = process.env.EXPO_PUBLIC_STRIPE_PK || (extra.stripePk as string) || '';
export const STRIPE_SIMULATED: boolean = process.env.EXPO_PUBLIC_STRIPE_SIMULATED === 'true' || extra.stripeSimulated !== false;
