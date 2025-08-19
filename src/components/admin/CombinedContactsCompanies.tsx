import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ContactsManager } from "./ContactsManager";
import { CompaniesManager } from "./CompaniesManager";
import { Users, Building2 } from "lucide-react";

export function CombinedContactsCompanies() {
  const [activeTab, setActiveTab] = useState("contacts");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5" />
        <h2 className="text-2xl font-bold text-foreground">Contacts & Companies</h2>
        <p className="text-muted-foreground ml-2">Manage your customer relationships</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Companies
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="contacts" className="mt-6">
          <ContactsManager />
        </TabsContent>
        
        <TabsContent value="companies" className="mt-6">
          <CompaniesManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}