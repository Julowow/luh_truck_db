import { QueryClient } from "@tanstack/react-query"

import { supabase } from "#/lib/supabase/client"

export const queryClient = new QueryClient()

// Luh Trucks: what a user sees (schemas, tables, buttons) depends on the role in their JWT.
// Answers cached under a previous user or role must never be shown: when the signed-in user
// or their role changes (sign-out, sign-in, role granted by an admin and picked up at token
// refresh), every cached query except the auth user is reset and refetched.
function jwtRole(token: string): string {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
    return (JSON.parse(atob(payload)) as { role?: string }).role ?? ""
  } catch {
    return ""
  }
}

let identity: string | undefined

supabase.auth.onAuthStateChange((_event, session) => {
  const next = session
    ? `${session.user.id}:${jwtRole(session.access_token)}`
    : ""
  const changed = identity !== undefined && next !== identity
  identity = next
  if (changed) {
    // outside the auth callback: supabase-js must not be re-entered from inside it
    setTimeout(() => {
      void queryClient.resetQueries({
        predicate: (query) => query.queryKey[0] !== "auth",
      })
    }, 0)
  }
})
