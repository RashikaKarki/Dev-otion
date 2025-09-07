import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Edit3, 
  Calendar, 
  Clock, 
  Tag,
  ArrowLeft,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

interface NoteViewerProps {
  note: Note;
  onEdit: () => void;
  onBack: () => void;
}

export function NoteViewer({ note, onEdit, onBack }: NoteViewerProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatContent = (content: string) => {
    if (!content) return 'No content';
    
    // Simple markdown-like formatting for display
    return content
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mb-4 mt-6 first:mt-0">{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-semibold mb-3 mt-5 first:mt-0">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-medium mb-2 mt-4 first:mt-0">{line.slice(4)}</h3>;
        }
        
        // Code blocks
        if (line.startsWith('```')) {
          return <div key={index} className="bg-muted p-3 rounded-md font-mono text-sm my-3">{line}</div>;
        }
        
        // Lists
        if (line.match(/^[\s]*[-*+]\s/)) {
          return <li key={index} className="ml-4 mb-1">{line.replace(/^[\s]*[-*+]\s/, '')}</li>;
        }
        if (line.match(/^[\s]*\d+\.\s/)) {
          return <li key={index} className="ml-4 mb-1 list-decimal">{line.replace(/^[\s]*\d+\.\s/, '')}</li>;
        }
        
        // Quotes
        if (line.startsWith('> ')) {
          return <blockquote key={index} className="border-l-4 border-muted pl-4 italic my-3 text-muted-foreground">{line.slice(2)}</blockquote>;
        }
        
        // Empty lines
        if (line.trim() === '') {
          return <br key={index} />;
        }
        
        // Regular paragraphs
        return <p key={index} className="mb-3 leading-relaxed">{line}</p>;
      });
  };

  return (
    <div className="flex-1 bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Notes
              </Button>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <h1 className="text-xl font-semibold">
                  {note.title || 'Untitled Note'}
                </h1>
              </div>
            </div>
            <Button onClick={onEdit} className="bg-primary hover:bg-primary/90">
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Note
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 py-6 max-w-4xl mx-auto">
          {/* Note metadata */}
          <div className="mb-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Created {formatDate(note.createdAt)}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Updated {formatDate(note.updatedAt)}</span>
              </div>
              {note.tags.length > 0 && (
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4" />
                  <div className="flex flex-wrap gap-1">
                    {note.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <Separator className="mb-6" />

          {/* Note content */}
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            {note.content ? (
              <div className="text-foreground leading-relaxed">
                {formatContent(note.content)}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">This note is empty</p>
                <p className="text-sm">Click "Edit Note" to add content</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}