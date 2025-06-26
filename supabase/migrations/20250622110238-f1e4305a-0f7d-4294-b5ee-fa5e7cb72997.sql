
-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'User' CHECK (role IN ('Admin', 'User')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create visit_reports table
CREATE TABLE public.visit_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  area TEXT NOT NULL,
  number_of_users INTEGER NOT NULL CHECK (number_of_users >= 0),
  comments TEXT,
  photo_url TEXT,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_reports ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
  ON public.profiles FOR SELECT 
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin');

-- Visit reports policies
CREATE POLICY "Users can view their own reports" 
  ON public.visit_reports FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports" 
  ON public.visit_reports FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports" 
  ON public.visit_reports FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reports" 
  ON public.visit_reports FOR SELECT 
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin');

CREATE POLICY "Admins can delete any report" 
  ON public.visit_reports FOR DELETE 
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'Admin');

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    'User'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to update updated_at on visit_reports
CREATE TRIGGER handle_visit_reports_updated_at
  BEFORE UPDATE ON public.visit_reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
