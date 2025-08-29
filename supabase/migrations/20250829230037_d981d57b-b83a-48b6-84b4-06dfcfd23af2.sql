-- Create a function to clean up existing MIME content in tickets
CREATE OR REPLACE FUNCTION public.cleanup_mime_ticket_content()
RETURNS TABLE(ticket_id uuid, old_content text, new_content text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ticket_record record;
  clean_content text;
  boundary_pattern text;
  text_part text;
BEGIN
  FOR ticket_record IN 
    SELECT id, description, ticket_number
    FROM public.tickets 
    WHERE description LIKE '%This is a multipart message in MIME format%'
       OR description LIKE '%Content-Type: text/plain%'
  LOOP
    -- Extract text content from MIME format
    clean_content := ticket_record.description;
    
    -- Find text/plain boundary
    IF clean_content ~ '------=_NextPart_[^-]+\s*Content-Type: text/plain' THEN
      -- Extract content between text/plain section and next boundary
      text_part := regexp_replace(
        clean_content,
        '.*?Content-Type: text/plain[^-]*?Content-Transfer-Encoding: [^\r\n]*[\r\n]+([^-]*?)------=_NextPart_.*',
        '\1',
        'ns'
      );
      
      -- Clean up extra whitespace and formatting
      clean_content := trim(regexp_replace(text_part, '\s+', ' ', 'g'));
      
      -- If we got something meaningful, use it
      IF length(clean_content) > 10 AND clean_content != ticket_record.description THEN
        UPDATE public.tickets 
        SET description = clean_content,
            updated_at = now()
        WHERE id = ticket_record.id;
        
        -- Return the changes for logging
        ticket_id := ticket_record.id;
        old_content := left(ticket_record.description, 100) || '...';
        new_content := clean_content;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Clean up existing MIME content in ticket comments as well
CREATE OR REPLACE FUNCTION public.cleanup_mime_comment_content()
RETURNS TABLE(comment_id uuid, old_content text, new_content text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  comment_record record;
  clean_content text;
  text_part text;
BEGIN
  FOR comment_record IN 
    SELECT id, content
    FROM public.ticket_comments 
    WHERE content LIKE '%This is a multipart message in MIME format%'
       OR content LIKE '%Content-Type: text/plain%'
  LOOP
    -- Extract text content from MIME format
    clean_content := comment_record.content;
    
    -- Find text/plain boundary
    IF clean_content ~ '------=_NextPart_[^-]+\s*Content-Type: text/plain' THEN
      -- Extract content between text/plain section and next boundary
      text_part := regexp_replace(
        clean_content,
        '.*?Content-Type: text/plain[^-]*?Content-Transfer-Encoding: [^\r\n]*[\r\n]+([^-]*?)------=_NextPart_.*',
        '\1',
        'ns'
      );
      
      -- Clean up extra whitespace and formatting
      clean_content := trim(regexp_replace(text_part, '\s+', ' ', 'g'));
      
      -- If we got something meaningful, use it
      IF length(clean_content) > 10 AND clean_content != comment_record.content THEN
        UPDATE public.ticket_comments 
        SET content = clean_content
        WHERE id = comment_record.id;
        
        -- Return the changes for logging
        comment_id := comment_record.id;
        old_content := left(comment_record.content, 100) || '...';
        new_content := clean_content;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;