/**
 * The browser's Supabase client, loaded when something first needs it. The library is about 70 kB
 * of script: pages that only use it on a press or a submit should not make every reader download it
 * before the page is usable. Only call it when AUTH_ENABLED.
 */
export const supabaseLater = () => import('./client').then((m) => m.supabase());
