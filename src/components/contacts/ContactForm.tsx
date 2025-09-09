import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { TagsInput } from '@/components/ui/tags-input';

interface ContactFormProps {
  onSubmit: (contactData: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export function ContactForm({ onSubmit, onCancel, initialData }: ContactFormProps) {
  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    company: initialData?.company || '',
    job_title: initialData?.job_title || '',
    notes: initialData?.notes || '',
    tags: initialData?.tags || [],
    ...initialData
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.first_name || !formData.email) {
      toast({
        title: "Validation Error",
        description: "First name and email are required fields.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      toast({
        title: "Success",
        description: "Contact added successfully!"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add contact. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Add New Contact</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                placeholder="John"
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                placeholder="Acme Corp"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="job_title">Job Title</Label>
            <Input
              id="job_title"
              name="job_title"
              value={formData.job_title}
              onChange={handleChange}
              placeholder="Software Engineer"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes about this contact..."
              rows={3}
            />
          </div>

          <div>
            <Label>Tags</Label>
            <TagsInput
              tags={formData.tags}
              onTagsChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
              placeholder="Add tags for better organization"
              maxTags={6}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Contact'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}