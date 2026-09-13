import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSessionContext } from "@/lib/platform/workspace.functions";

export type SessionContext = Awaited<ReturnType<typeof getSessionContext>>;

export const sessionQueryKey = ["session-context"] as const;

export function useSession() {
  const fetchSession = useServerFn(getSessionContext);

  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: () => fetchSession(),
    staleTime: 60_000,
    retry: false,
  });
}
