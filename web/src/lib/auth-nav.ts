/**
 * Auth navigation state passed from the root layout (server) into the shell.
 *
 * Only a boolean membership flag is sent to the browser. The verified user
 * id, tokens and credentials never enter navigation props (TASK-007B). The
 * pages that need the id resolve it server-side from the verified session.
 */
export interface AuthNavState {
  /** True when the request carries a provider-verified member session. */
  signedIn: boolean;
}
