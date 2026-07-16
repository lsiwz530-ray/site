import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,

  beforeLoad: async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });

      const data = await res.json();

      if (!data.user) {
        throw redirect({ to: "/auth" });
      }

      return {
        user: data.user,
      };

    } catch (e) {
      throw redirect({ to: "/auth" });
    }
  },

  component: () => <Outlet />,
});
