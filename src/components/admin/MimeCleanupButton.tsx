import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cleanupMimeContent } from "@/utils/cleanupMimeContent";

export const MimeCleanupButton = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      const result = await cleanupMimeContent();
      toast.success(`Cleanup completed! ${result.ticketsUpdated} tickets and ${result.commentsUpdated} replies updated.`);
      console.log('Cleanup results:', result);
    } catch (error) {
      console.error('Cleanup failed:', error);
      toast.error("Failed to cleanup MIME content");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCleanup} 
      disabled={isLoading}
      variant="outline"
    >
      {isLoading ? "Cleaning..." : "Clean MIME Content"}
    </Button>
  );
};