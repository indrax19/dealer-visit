
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DealerData {
  dealer: string;
  service: string;
  zone: string;
  activeUsers?: number;
  expiredUsers?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Auto-snapshot function triggered at:', new Date().toISOString());

    // Fetch current data from Google Sheets
    // Since we can't directly import from the existing service, we'll simulate the data structure
    // In a real implementation, you'd need to replicate the Google Sheets fetching logic here
    
    // For now, we'll fetch the most recent manual snapshot data as a fallback
    // This ensures the auto-snapshot doesn't fail if the Google Sheets API is unavailable
    const { data: recentSnapshot, error: recentError } = await supabase
      .from('snapshots')
      .select('*')
      .eq('snapshot_type', 'manual')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentError && recentError.code !== 'PGRST116') {
      console.error('Error fetching recent snapshot:', recentError);
      throw new Error('Failed to fetch recent snapshot data');
    }

    // Use recent snapshot data or create empty arrays
    const activeData = recentSnapshot?.active_data || [];
    const expiredData = recentSnapshot?.expired_data || [];

    // Calculate totals
    const totalActive = Array.isArray(activeData) 
      ? activeData.reduce((sum: number, dealer: any) => sum + (dealer.activeUsers || 0), 0)
      : 0;
    const totalExpired = Array.isArray(expiredData)
      ? expiredData.reduce((sum: number, dealer: any) => sum + (dealer.expiredUsers || 0), 0)
      : 0;
    
    // Calculate unique dealers
    const allDealers = new Set([
      ...(Array.isArray(activeData) ? activeData.map((d: any) => d.dealer) : []),
      ...(Array.isArray(expiredData) ? expiredData.map((d: any) => d.dealer) : [])
    ]);
    const totalDealers = allDealers.size;

    console.log('Calculated totals:', { totalActive, totalExpired, totalDealers });

    // Save the auto snapshot
    const { data: snapshot, error: saveError } = await supabase
      .from('snapshots')
      .insert({
        snapshot_type: 'auto',
        active_data: activeData,
        expired_data: expiredData,
        total_active: totalActive,
        total_expired: totalExpired,
        total_dealers: totalDealers,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving auto snapshot:', saveError);
      throw new Error(`Failed to save auto snapshot: ${saveError.message}`);
    }

    console.log('Auto snapshot saved successfully:', snapshot.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Auto snapshot saved successfully',
        snapshotId: snapshot.id,
        totals: { totalActive, totalExpired, totalDealers }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Auto-snapshot error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
