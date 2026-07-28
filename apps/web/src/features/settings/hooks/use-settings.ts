"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/query-keys";
import { getUserProfile, updateUserProfile } from "@/features/settings/api/settings.api";

export function useUserProfileQuery() {
  return useQuery({
    queryKey: [...QUERY_KEYS.SETTINGS, "profile"],
    queryFn: getUserProfile,
  });
}

export function useUpdateUserProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserProfile,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SETTINGS }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AUTH_ME }),
      ]);
    },
  });
}
