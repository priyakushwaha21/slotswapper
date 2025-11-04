-- Create enum for event status
CREATE TYPE public.event_status AS ENUM ('BUSY', 'SWAPPABLE', 'SWAP_PENDING');

-- Create enum for swap request status
CREATE TYPE public.swap_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status public.event_status NOT NULL DEFAULT 'BUSY',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create swap_requests table
CREATE TABLE public.swap_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner_event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  status public.swap_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swap_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events table
-- Users can view their own events
CREATE POLICY "Users can view own events"
  ON public.events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view swappable events from others
CREATE POLICY "Users can view swappable events"
  ON public.events
  FOR SELECT
  USING (status = 'SWAPPABLE');

-- Users can create their own events
CREATE POLICY "Users can create own events"
  ON public.events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own events
CREATE POLICY "Users can update own events"
  ON public.events
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own events
CREATE POLICY "Users can delete own events"
  ON public.events
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for swap_requests table
-- Users can view swap requests they're involved in
CREATE POLICY "Users can view relevant swap requests"
  ON public.swap_requests
  FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = owner_id);

-- Users can create swap requests
CREATE POLICY "Users can create swap requests"
  ON public.swap_requests
  FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Users can update swap requests they own
CREATE POLICY "Users can update swap requests"
  ON public.swap_requests
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_swap_requests_updated_at
  BEFORE UPDATE ON public.swap_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_events_user_id ON public.events(user_id);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_swap_requests_requester_id ON public.swap_requests(requester_id);
CREATE INDEX idx_swap_requests_owner_id ON public.swap_requests(owner_id);
CREATE INDEX idx_swap_requests_status ON public.swap_requests(status);