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

  const addContact = async (contactData: Partial<Contact>) => {
    try {
      // Get current user for created_by field
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Build the name field from first_name and last_name if provided
      const fullName = contactData.first_name && contactData.last_name 
        ? `${contactData.first_name} ${contactData.last_name}`.trim()
        : contactData.first_name || contactData.last_name || contactData.email;

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          ...contactData,
          name: fullName,
          organization_id: '00000000-0000-0000-0000-000000000001', // Default org for single tenant
          created_by: user.id,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;
      
      // Reload contacts to include the new one
      await loadContacts();
      return data;
    } catch (error) {
      console.error('Error adding contact:', error);
      throw error;
    }
  };

  const getContactByEmail = (email: string): Contact | undefined => {
    return contacts.find(contact => contact.email.toLowerCase() === email.toLowerCase());
  };

  const searchContacts = (searchTerm: string): Contact[] => {
    if (!searchTerm.trim()) return contacts;
    
    const term = searchTerm.toLowerCase();
    return contacts.filter(contact => 
      contact.first_name?.toLowerCase().includes(term) ||
      contact.last_name?.toLowerCase().includes(term) ||
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
    addContact,
    getContactByEmail,
    searchContacts
  };
}