// Shared CORS headers for Edge Functions — the app.json "web" target means
// this project can also run in a browser context, where CORS actually
// matters (native RN/Expo Go requests aren't browser-CORS-governed, but
// there's no cost to including this, and it's Supabase's own standard
// function template convention).
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
