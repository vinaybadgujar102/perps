import { useQuery } from "@tanstack/react-query";
import { getFillsApi } from "#/api/fills.api";
import { useUser } from "#/context/user-context";
import { queryKeys } from "#/lib/query-keys";

export function useFills() {
  const { isAuthenticated } = useUser();

  return useQuery({
    queryKey: queryKeys.fills(),
    queryFn: getFillsApi,
    enabled: isAuthenticated,
  });
}
