
-- Enable RLS on snapshots table if not already enabled
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert snapshots (since this is for system-wide snapshots, not user-specific)
CREATE POLICY "Allow public snapshot creation" 
  ON public.snapshots 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy to allow anyone to select snapshots (for viewing history)
CREATE POLICY "Allow public snapshot viewing" 
  ON public.snapshots 
  FOR SELECT 
  USING (true);

-- Create policy to allow anyone to delete snapshots (for cleanup functionality)
CREATE POLICY "Allow public snapshot deletion" 
  ON public.snapshots 
  FOR DELETE 
  USING (true);
