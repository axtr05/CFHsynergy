import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "../lib/axios";

/**
 * Custom hook to fetch the authenticated user's data
 * This centralizes the auth user query logic for consistent use across components
 */
export const useAuthUser = () => {
  return useQuery({
    queryKey: ["authUser"],
    queryFn: () => axiosInstance.get('/auth/me').then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}; 