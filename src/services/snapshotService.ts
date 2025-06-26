
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

// Type guards for validating snapshot data
export const isValidActiveData = (data: unknown): data is ActiveDealerData[] => {
  if (!Array.isArray(data)) return false;
  return data.every(item => 
    typeof item === 'object' && 
    item !== null &&
    'dealer' in item &&
    'service' in item &&
    'zone' in item &&
    'activeUsers' in item &&
    typeof item.dealer === 'string' &&
    typeof item.service === 'string' &&
    typeof item.zone === 'string' &&
    typeof item.activeUsers === 'number'
  );
};

export const isValidExpiredData = (data: unknown): data is ExpiredDealerData[] => {
  if (!Array.isArray(data)) return false;
  return data.every(item => 
    typeof item === 'object' && 
    item !== null &&
    'dealer' in item &&
    'service' in item &&
    'zone' in item &&
    'expiredUsers' in item &&
    typeof item.dealer === 'string' &&
    typeof item.service === 'string' &&
    typeof item.zone === 'string' &&
    typeof item.expiredUsers === 'number'
  );
};

export const saveSnapshot = async (
  activeData: ActiveDealerData[],
  expiredData: ExpiredDealerData[],
  type: 'manual' | 'auto' = 'manual'
): Promise<Snapshot> => {
  console.log('Attempting to save snapshot with data:', { activeCount: activeData.length, expiredCount: expiredData.length, type });
  
  // Validate input data
  if (!Array.isArray(activeData) || !Array.isArray(expiredData)) {
    throw new Error('Invalid data format: activeData and expiredData must be arrays');
  }

  const totalActive = activeData.reduce((sum, dealer) => sum + (dealer.activeUsers || 0), 0);
  const totalExpired = expiredData.reduce((sum, dealer) => sum + (dealer.expiredUsers || 0), 0);
  const totalDealers = new Set([...activeData.map(d => d.dealer), ...expiredData.map(d => d.dealer)]).size;

  console.log('Calculated totals:', { totalActive, totalExpired, totalDealers });

  // Ensure data is properly serializable
  const sanitizedActiveData = activeData.map(dealer => ({
    dealer: dealer.dealer || '',
    service: dealer.service || '',
    zone: dealer.zone || '',
    activeUsers: dealer.activeUsers || 0
  }));

  const sanitizedExpiredData = expiredData.map(dealer => ({
    dealer: dealer.dealer || '',
    service: dealer.service || '',
    zone: dealer.zone || '',
    expiredUsers: dealer.expiredUsers || 0
  }));

  const { data, error } = await supabase
    .from('snapshots')
    .insert({
      snapshot_type: type,
      active_data: sanitizedActiveData as unknown as Json,
      expired_data: sanitizedExpiredData as unknown as Json,
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
  
  // Validate fetched data
  const validatedSnapshots = (data || []).filter(snapshot => {
    const hasValidStructure = snapshot && 
      typeof snapshot.id === 'string' &&
      typeof snapshot.snapshot_type === 'string' &&
      typeof snapshot.total_active === 'number' &&
      typeof snapshot.total_expired === 'number' &&
      typeof snapshot.total_dealers === 'number' &&
      typeof snapshot.created_at === 'string';
    
    if (!hasValidStructure) {
      console.warn('Invalid snapshot structure detected, skipping:', snapshot);
      return false;
    }
    
    return true;
  });

  return validatedSnapshots as Snapshot[];
};

export const deleteSnapshot = async (id: string): Promise<void> => {
  console.log('Deleting snapshot with id:', id);
  
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid snapshot ID');
  }
  
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
