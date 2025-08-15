import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserProfileManager } from "@/components/account/UserProfileManager";
import { AccountSettings } from "@/components/account/AccountSettings";
import { UserRoleManager } from "@/components/admin/UserRoleManager";
import { useUserRoles } from "@/hooks/useUserRoles";
import { User, Settings, Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AccountDashboardProps {
  onBack?: () => void;
}

export function AccountDashboard({ onBack }: AccountDashboardProps) {
  const { isAdmin } = useUserRoles();

  return (
    <div className="space-y-6">
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
      )}
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Account Management</h1>
        <p className="text-muted-foreground">Manage your profile, settings, and account preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className={`grid w-full ${isAdmin() ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
          {isAdmin() && (
            <TabsTrigger value="user-management" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              User Management
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          <UserProfileManager />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-4">
          <AccountSettings />
        </TabsContent>
        
        {isAdmin() && (
          <TabsContent value="user-management" className="space-y-4">
            <UserRoleManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}