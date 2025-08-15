import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Contact } from "@/types/contact";

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts((data || []) as Contact[]);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getContactByEmail = (email: string): Contact | undefined => {
    return contacts.find(contact => contact.email.toLowerCase() === email.toLowerCase());
  };

  const searchContacts = (searchTerm: string): Contact[] => {
    if (!searchTerm.trim()) return contacts;
    
    const term = searchTerm.toLowerCase();
    return contacts.filter(contact => 
      contact.first_name.toLowerCase().includes(term) ||
      contact.last_name.toLowerCase().includes(term) ||
      contact.email.toLowerCase().includes(term) ||
      contact.company?.toLowerCase().includes(term) || false
    );
  };

  useEffect(() => {
    loadContacts();
  }, []);

  return {
    contacts,
    loading,
    loadContacts,
    getContactByEmail,
    searchContacts
  };
}