-- Create auto dialer campaigns table
CREATE TABLE public.auto_dialer_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  organization_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'paused', 'completed', 'cancelled')),
  agent_extension TEXT NOT NULL,
  delay_seconds INTEGER NOT NULL DEFAULT 5,
  phone_numbers TEXT[] NOT NULL,
  current_index INTEGER NOT NULL DEFAULT 0,
  successful_calls INTEGER NOT NULL DEFAULT 0,
  failed_calls INTEGER NOT NULL DEFAULT 0,
  total_calls INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Create call results table
CREATE TABLE public.auto_dialer_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.auto_dialer_campaigns(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('dialing', 'connected', 'busy', 'no_answer', 'failed', 'cancelled')),
  call_duration INTEGER, -- in seconds
  call_id TEXT,
  agent_extension TEXT,
  error_message TEXT,
  dialed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  connected_at TIMESTAMP WITH TIME ZONE,
  disconnected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auto_dialer_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_dialer_results ENABLE ROW LEVEL SECURITY;

-- Create policies for campaigns
CREATE POLICY "Users can view campaigns from their organization" 
ON public.auto_dialer_campaigns 
FOR SELECT 
USING (organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create campaigns in their organization" 
ON public.auto_dialer_campaigns 
FOR INSERT 
WITH CHECK (
  organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Users can update campaigns they created" 
ON public.auto_dialer_campaigns 
FOR UPDATE 
USING (created_by = auth.uid());

-- Create policies for results
CREATE POLICY "Users can view results from their organization campaigns" 
ON public.auto_dialer_results 
FOR SELECT 
USING (
  campaign_id IN (
    SELECT id FROM public.auto_dialer_campaigns 
    WHERE organization_id = (SELECT organization_id FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "System can insert call results" 
ON public.auto_dialer_results 
FOR INSERT 
WITH CHECK (true); -- Allow system/call flow to insert results

-- Create indexes for performance
CREATE INDEX idx_auto_dialer_campaigns_org_status ON public.auto_dialer_campaigns(organization_id, status);
CREATE INDEX idx_auto_dialer_campaigns_created_by ON public.auto_dialer_campaigns(created_by);
CREATE INDEX idx_auto_dialer_results_campaign_id ON public.auto_dialer_results(campaign_id);
CREATE INDEX idx_auto_dialer_results_status ON public.auto_dialer_results(status);

-- Create updated_at trigger for campaigns
CREATE TRIGGER update_auto_dialer_campaigns_updated_at
BEFORE UPDATE ON public.auto_dialer_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_dialer_campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_dialer_results;