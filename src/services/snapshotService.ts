
import { supabase } from "@/integrations/supabase/client";
import { ActiveDealerData, ExpiredDealerData } from "./googleSheetsService";
import { Json } from "@/integrations/supabase/types";

export interface Snapshot {
  id: string;
  snapshot_type: 'manual' | 'auto';
  active_data: Json;
  expired_data: Json;
  total_active: number;
  total_expired: number;
  total_dealers: number;
  created_at: string;
  updated_at: string;
}

export const saveSnapshot = async (
  activeData: ActiveDealerData[],
  expiredData: ExpiredDealerData[],
  type: 'manual' | 'auto' = 'manual'
): Promise<Snapshot> => {
  console.log('Attempting to save snapshot with data:', { activeCount: activeData.length, expiredCount: expiredData.length, type });
  
  const totalActive = activeData.reduce((sum, dealer) => sum + dealer.activeUsers, 0);
  const totalExpired = expiredData.reduce((sum, dealer) => sum + dealer.expiredUsers, 0);
  const totalDealers = new Set([...activeData.map(d => d.dealer), ...expiredData.map(d => d.dealer)]).size;

  console.log('Calculated totals:', { totalActive, totalExpired, totalDealers });

  const { data, error } = await supabase
    .from('snapshots')
    .insert({
      snapshot_type: type,
      active_data: activeData as unknown as Json,
      expired_data: expiredData as unknown as Json,
      total_active: totalActive,
      total_expired: totalExpired,
      total_dealers: totalDealers,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving snapshot:', error);
    throw new Error(`Failed to save snapshot: ${error.message}`);
  }

  console.log('Snapshot saved successfully:', data);
  return data as Snapshot;
};

export const getSnapshots = async (limit: number = 10): Promise<Snapshot[]> => {
  console.log('Fetching snapshots with limit:', limit);
  
  const { data, error } = await supabase
    .from('snapshots')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching snapshots:', error);
    throw new Error(`Failed to fetch snapshots: ${error.message}`);
  }

  console.log('Fetched snapshots:', data?.length || 0);
  return (data || []) as Snapshot[];
};

export const deleteSnapshot = async (id: string): Promise<void> => {
  console.log('Deleting snapshot with id:', id);
  
  const { error } = await supabase
    .from('snapshots')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting snapshot:', error);
    throw new Error(`Failed to delete snapshot: ${error.message}`);
  }

  console.log('Snapshot deleted successfully');
};
