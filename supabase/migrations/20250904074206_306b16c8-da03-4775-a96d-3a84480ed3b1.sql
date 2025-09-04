-- Update the auto_assign_ticket function with advanced assignment strategies
CREATE OR REPLACE FUNCTION public.auto_assign_ticket(ticket_id_param uuid, org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  assigned_agent_id uuid;
  assigned_agent_name text;
  ticket_priority text;
  ticket_category text;
  ticket_skills text[];
  assignment_method text;
  dept_id uuid;
  agent_record record;
  tracking_record record;
  available_agents cursor FOR
    SELECT 
      p.user_id,
      p.display_name,
      ur.role,
      COALESCE(aa.is_available, true) as is_available,
      COALESCE(aa.max_tickets, 10) as max_tickets,
      COALESCE(ticket_counts.current_tickets, 0) as current_tickets,
      p.created_at
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.user_id
    LEFT JOIN agent_availability aa ON aa.user_id = p.user_id AND aa.organization_id = org_id
    LEFT JOIN (
      SELECT 
        assigned_to,
        COUNT(*) as current_tickets
      FROM tickets 
      WHERE assigned_to IS NOT NULL 
        AND status IN ('open', 'in_progress', 'pending')
        AND organization_id = org_id
      GROUP BY assigned_to
    ) ticket_counts ON ticket_counts.assigned_to = p.user_id
    WHERE p.organization_id = org_id
      AND ur.organization_id = org_id
      AND ur.role IN ('admin', 'moderator', 'agent')
      AND COALESCE(aa.is_available, true) = true
      AND COALESCE(ticket_counts.current_tickets, 0) < COALESCE(aa.max_tickets, 10)
    ORDER BY 
      CASE WHEN ur.role = 'admin' THEN 1
           WHEN ur.role = 'moderator' THEN 2
           ELSE 3 END,
      COALESCE(ticket_counts.current_tickets, 0) ASC,
      p.created_at ASC;
BEGIN
  -- Get ticket details
  SELECT priority, category, department_id, required_skills 
  INTO ticket_priority, ticket_category, dept_id, ticket_skills
  FROM tickets 
  WHERE id = ticket_id_param;
  
  -- Get organization assignment settings
  SELECT COALESCE(assignment_settings->>'method', 'round_robin')
  INTO assignment_method
  FROM organizations 
  WHERE id = org_id;
  
  -- Handle different assignment methods
  IF assignment_method = 'skill_based' AND ticket_skills IS NOT NULL AND array_length(ticket_skills, 1) > 0 THEN
    -- Skill-based assignment
    FOR agent_record IN
      SELECT DISTINCT
        p.user_id,
        p.display_name,
        ur.role,
        COALESCE(aa.is_available, true) as is_available,
        COALESCE(aa.max_tickets, 10) as max_tickets,
        COALESCE(ticket_counts.current_tickets, 0) as current_tickets,
        COUNT(CASE WHEN ask.skill_name = ANY(ticket_skills) THEN 1 END) as matching_skills
      FROM profiles p
      JOIN user_roles ur ON ur.user_id = p.user_id
      LEFT JOIN agent_availability aa ON aa.user_id = p.user_id AND aa.organization_id = org_id
      LEFT JOIN agent_skills ask ON ask.user_id = p.user_id AND ask.organization_id = org_id
      LEFT JOIN (
        SELECT 
          assigned_to,
          COUNT(*) as current_tickets
        FROM tickets 
        WHERE assigned_to IS NOT NULL 
          AND status IN ('open', 'in_progress', 'pending')
          AND organization_id = org_id
        GROUP BY assigned_to
      ) ticket_counts ON ticket_counts.assigned_to = p.user_id
      WHERE p.organization_id = org_id
        AND ur.organization_id = org_id
        AND ur.role IN ('admin', 'moderator', 'agent')
        AND COALESCE(aa.is_available, true) = true
        AND COALESCE(ticket_counts.current_tickets, 0) < COALESCE(aa.max_tickets, 10)
      GROUP BY p.user_id, p.display_name, ur.role, aa.is_available, aa.max_tickets, ticket_counts.current_tickets
      HAVING COUNT(CASE WHEN ask.skill_name = ANY(ticket_skills) THEN 1 END) > 0
      ORDER BY 
        COUNT(CASE WHEN ask.skill_name = ANY(ticket_skills) THEN 1 END) DESC,
        CASE WHEN ur.role = 'admin' THEN 1
             WHEN ur.role = 'moderator' THEN 2
             ELSE 3 END,
        COALESCE(ticket_counts.current_tickets, 0) ASC
      LIMIT 1
    LOOP
      assigned_agent_id := agent_record.user_id;
      assigned_agent_name := COALESCE(agent_record.display_name, 'Agent');
      EXIT;
    END LOOP;
    
  ELSIF assignment_method = 'round_robin' THEN
    -- Round-robin assignment
    -- Get the last assigned agent for this department/organization
    SELECT last_assigned_user_id INTO tracking_record
    FROM assignment_tracking 
    WHERE organization_id = org_id 
      AND (department_id = dept_id OR (department_id IS NULL AND dept_id IS NULL));
    
    -- Find the next agent in round-robin order
    FOR agent_record IN available_agents LOOP
      -- If no previous assignment or we found the agent after the last assigned one
      IF tracking_record IS NULL OR 
         (tracking_record IS NOT NULL AND agent_record.user_id > tracking_record) THEN
        assigned_agent_id := agent_record.user_id;
        assigned_agent_name := COALESCE(agent_record.display_name, 'Agent');
        EXIT;
      END IF;
    END LOOP;
    
    -- If no agent found after the last assigned, start from the beginning
    IF assigned_agent_id IS NULL THEN
      FOR agent_record IN available_agents LOOP
        assigned_agent_id := agent_record.user_id;
        assigned_agent_name := COALESCE(agent_record.display_name, 'Agent');
        EXIT;
      END LOOP;
    END IF;
    
    -- Update tracking
    INSERT INTO assignment_tracking (organization_id, department_id, last_assigned_user_id, assignment_method)
    VALUES (org_id, dept_id, assigned_agent_id, 'round_robin')
    ON CONFLICT (organization_id, department_id, group_id) 
    DO UPDATE SET 
      last_assigned_user_id = assigned_agent_id,
      updated_at = now();
      
  ELSE
    -- Load-balanced assignment (default)
    FOR agent_record IN available_agents LOOP
      assigned_agent_id := agent_record.user_id;
      assigned_agent_name := COALESCE(agent_record.display_name, 'Agent');
      EXIT;
    END LOOP;
  END IF;
  
  -- If we found an agent, assign the ticket
  IF assigned_agent_id IS NOT NULL THEN
    UPDATE tickets 
    SET assigned_to = assigned_agent_id,
        updated_at = now()
    WHERE id = ticket_id_param;
    
    RETURN assigned_agent_name;
  ELSE
    -- No available agents found
    RETURN NULL;
  END IF;
END;
$function$;