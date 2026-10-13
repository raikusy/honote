import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useSyncExternalStore } from "react";

import { ModeToggle } from "@/components/mode-toggle";
import { clearSession, sessionKindSnapshot, subscribeSession } from "@/lib/session";
import { orpc, queryClient } from "@/utils/orpc";

export default function Header() {
  const kind = useSyncExternalStore(subscribeSession, sessionKindSnapshot, () => null);
  const navigate = useNavigate();
  const profile = useQuery({
    ...orpc.profile.get.queryOptions(),
    enabled: kind === "access",
  });

  if (kind === "password_change") {
    return (
      <header className="honote-header">
        <Link to="/" className="honote-mark">
          <span className="honote-mark-kicker">Session locked</span>
          <span className="honote-mark-name">Honote</span>
        </Link>
      </header>
    );
  }

  return (
    <header className="honote-header">
      <Link to="/" className="honote-mark">
        <span className="honote-mark-kicker">Field notes</span>
        <span className="honote-mark-name">Honote</span>
      </Link>
      <div className="flex items-center gap-2">
        <nav className="honote-nav" aria-label="Primary">
          <Link to="/" activeOptions={{ exact: true }} activeProps={{ className: "is-active" }}>
            Posts
          </Link>
          {kind === "access" ? (
            <>
              <Link to="/notes" activeProps={{ className: "is-active" }}>
                Notes
              </Link>
              <Link to="/my-posts" activeProps={{ className: "is-active" }}>
                My posts
              </Link>
              <Link to="/profile" activeProps={{ className: "is-active" }}>
                Profile
              </Link>
              {profile.data?.role === "admin" ? (
                <>
                  <Link to="/admin/users" activeProps={{ className: "is-active" }}>
                    Users
                  </Link>
                  <Link to="/admin/notes" activeProps={{ className: "is-active" }}>
                    All notes
                  </Link>
                  <Link to="/admin/interests" activeProps={{ className: "is-active" }}>
                    Interests
                  </Link>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  clearSession();
                  queryClient.clear();
                  void navigate({ to: "/" });
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" activeProps={{ className: "is-active" }}>
                Log in
              </Link>
              <Link to="/register" activeProps={{ className: "is-active" }}>
                Register
              </Link>
            </>
          )}
        </nav>
        <ModeToggle />
      </div>
    </header>
  );
}
