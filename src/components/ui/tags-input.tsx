import React, { useState, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagsInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

export function TagsInput({ 
  tags, 
  onTagsChange, 
  placeholder = "Add tags...", 
  maxTags = 10,
  className 
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !tags.includes(trimmedValue) && tags.length < maxTags) {
      onTagsChange([...tags, trimmedValue]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={tags.length >= maxTags}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={addTag}
          size="sm"
          variant="outline"
          disabled={!inputValue.trim() || tags.includes(inputValue.trim()) || tags.length >= maxTags}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1"
            >
              <span className="text-xs">{tag}</span>
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-destructive transition-colors"
                aria-label={`Remove ${tag} tag`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      
      {tags.length >= maxTags && (
        <p className="text-xs text-muted-foreground">
          Maximum of {maxTags} tags allowed
        </p>
      )}
    </div>
  );
}