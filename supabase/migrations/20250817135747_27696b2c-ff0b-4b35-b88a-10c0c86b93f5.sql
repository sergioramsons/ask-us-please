-- Create default assignment rule and initialize agent availability

-- Insert default round-robin assignment rule for your organization
INSERT INTO public.assignment_rules (
  organization_id,
  rule_type,
  is_active,
  priority_order
)
SELECT 
  '4fa6d426-b739-46b4-a50a-fa1d7505b423'::uuid,
  'round_robin',
  true,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM public.assignment_rules 
  WHERE organization_id = '4fa6d426-b739-46b4-a50a-fa1d7505b423'::uuid
);

-- Initialize agent availability for admin/moderator users who don't have it
INSERT INTO public.agent_availability (
  user_id,
  organization_id,
  is_available,
  current_tickets,
  max_tickets
)
SELECT DISTINCT
  ur.user_id,
  '4fa6d426-b739-46b4-a50a-fa1d7505b423'::uuid,
  true,
  0,
  10
FROM public.user_roles ur
WHERE ur.role IN ('admin', 'moderator')
  AND NOT EXISTS (
    SELECT 1 FROM public.agent_availability aa 
    WHERE aa.user_id = ur.user_id
  );