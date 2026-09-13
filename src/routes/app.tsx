import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppLayout } from "@/components/platform/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Icon } from "@/components/Icon";

export const Route = createFileRoute("/app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AppRoute,
});

function AppRoute() {
  const navigate = useNavigate();
  const { data, isPending } = useSession();

  useEffect(() => {
    if (!isPending && data && !data.workspace) {
      navigate({ to: "/onboarding", replace: true });
    }
  }, [isPending, data, navigate]);

  if (isPending || (data && !data.workspace)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Icon name="progress_activity" size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
