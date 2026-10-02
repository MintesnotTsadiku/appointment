import { useEffect, useState } from "react";
import { useSession } from "@/context/session";

export interface EntryLinks {
  authenticated: boolean;
  workspace: string;
  start: string;
  startLabel: string;
}

/**
 * Where the landing page hands visitors off. Signed-in people go to the
 * workspace the server chose for them; guests go to sign-up only when the
 * platform currently accepts self sign-up.
 */
export function useEntryLinks(): EntryLinks {
  const { session } = useSession();
  const signupOpen = useSignupOpen();
  const landing = session?.landing;
  return {
    authenticated: Boolean(session?.authenticated),
    workspace: isLocalPath(landing) ? landing : "/home",
    start: signupOpen ? "/signup" : "/login",
    startLabel: signupOpen ? "world.nav.start" : "world.nav.signIn",
  };
}

function useSignupOpen(): boolean {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    let active = true;
    fetch("/api/method/appointment.scheduler.registration.public_settings", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (active && body?.message) setOpen(Boolean(body.message.signup_enabled));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return open;
}

function isLocalPath(path: string | undefined): path is string {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//") && !path.includes("://"));
}
