"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { postAuthJson } from "@/lib/auth-client";

/**
 * Sign-out control. Calls the server logout endpoint (which revokes
 * provider-side where possible and always clears the HttpOnly session
 * cookies), then returns the user to the signed-out home page and
 * re-renders the server-side navigation.
 *
 * Duplicate submissions are prevented two ways: the button disables while
 * the request is in flight, and a ref guard covers double-clicks that land
 * before React re-renders. If the request fails, the user stays signed in
 * and an honest error is shown — never a fake "signed out" state.
 */
export function LogoutButton({
  onLogout,
  className,
}: {
  onLogout?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false);

  async function handleLogout() {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setPending(true);
    setFailed(false);
    try {
      const result = await postAuthJson("/api/v1/auth/logout", {});
      if (result.status === 200 && result.body?.["ok"] === true) {
        if (onLogout) {
          onLogout();
        } else {
          router.push("/");
          router.refresh();
        }
        return;
      }
      setFailed(true);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <span className={className}>
      <Button
        type="button"
        variant="secondary"
        onClick={handleLogout}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {failed ? (
        <span role="alert" className="mt-1 block text-xs text-danger">
          Couldn&apos;t sign out. Check your connection and try again.
        </span>
      ) : null}
    </span>
  );
}
