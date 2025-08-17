-- Enable realtime on ticket_comments so new comments appear instantly
ALTER TABLE public.ticket_comments REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_comments;