import { supabase } from "@/integrations/supabase/client";

export async function cleanupMimeContent() {
  try {
    const { data, error } = await supabase.functions.invoke('cleanup-mime-content', {
      body: {}
    });

    if (error) {
      console.error('Error invoking cleanup function:', error);
      throw error;
    }

    console.log('Cleanup results:', data);
    return data;
  } catch (error) {
    console.error('Failed to cleanup MIME content:', error);
    throw error;
  }
}