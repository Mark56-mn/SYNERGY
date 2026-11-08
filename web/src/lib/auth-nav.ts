/**
 * Auth navigation state passed from the root layout (server) into the shell.
 *
 * `userId` is the PROVIDER-VERIFIED Supabase Auth user id, or `null` when
 * signed out. It is safe to render (it is the signed-in user's own id, which
 * the app already treats as public-to-self); no token or credential ever
 * travels in this value. Client-safe by design.
 */
export interface AuthNavState {
  userId: string | null;
}
