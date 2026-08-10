import { useQuery } from '@tanstack/react-query';
import { platformAPI } from '../services/api';

export const LEAD_STATUSES = [
  { id: 'new', name: 'New' },
  { id: 'contacted', name: 'Contacted' },
  { id: 'converted', name: 'Converted' },
  { id: 'lost', name: 'Lost' },
];

export type Platform = {
  id: string;
  name: string;
  displayName: string;
};

export type LeadStatus = typeof LEAD_STATUSES[number];

export function usePlatforms() {
  return useQuery<Platform[]>({
    queryKey: ['platforms'],
    queryFn: async () => {
      const response = await platformAPI.getPlatforms();
      return response.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}