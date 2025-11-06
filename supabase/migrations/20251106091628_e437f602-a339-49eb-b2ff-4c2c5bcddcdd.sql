-- Enable realtime for swap_requests table
ALTER TABLE public.swap_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.swap_requests;

-- Enable realtime for events table  
ALTER TABLE public.events REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;