
-- Create snapshots table to store manual and auto snapshots
CREATE TABLE public.snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_type TEXT NOT NULL CHECK (snapshot_type IN ('manual', 'auto')),
  active_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  expired_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_active INTEGER NOT NULL DEFAULT 0,
  total_expired INTEGER NOT NULL DEFAULT 0,
  total_dealers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for snapshots table
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all users to read snapshots (dashboard data is not user-specific)
CREATE POLICY "Anyone can view snapshots" 
  ON public.snapshots 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Create policy to allow all authenticated users to create snapshots
CREATE POLICY "Authenticated users can create snapshots" 
  ON public.snapshots 
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);

-- Create policy to allow all authenticated users to delete old snapshots (for cleanup)
CREATE POLICY "Authenticated users can delete snapshots" 
  ON public.snapshots 
  FOR DELETE 
  TO authenticated
  USING (true);

-- Create index for faster queries by snapshot type and date
CREATE INDEX idx_snapshots_type_created ON public.snapshots (snapshot_type, created_at DESC);

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_snapshots_updated_at
  BEFORE UPDATE ON public.snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
