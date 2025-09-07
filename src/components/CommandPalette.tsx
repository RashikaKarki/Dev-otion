import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  FileText, 
  Plus, 
  CheckSquare, 
  Brain, 
  Calendar,
  Hash,
  Command
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

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  onNoteSelect: (note: Note) => void;
  onNewNote: () => void;
}

interface Command {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  group: 'actions' | 'notes';
  keywords?: string[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  notes,
  onNoteSelect,
  onNewNote
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Command[] = [
    {
      id: 'new-note',
      title: 'New Note',
      description: 'Create a new note',
      icon: <Plus className="h-4 w-4" />,
      action: onNewNote,
      group: 'actions',
      keywords: ['create', 'add', 'new']
    },
    {
      id: 'view-tasks',
      title: 'View Tasks',
      description: 'Switch to task manager',
      icon: <CheckSquare className="h-4 w-4" />,
      action: () => {
        // This would be handled by the parent component
        onClose();
      },
      group: 'actions',
      keywords: ['tasks', 'todo', 'manage']
    },
    {
      id: 'view-mindmap',
      title: 'View Mind Map',
      description: 'Switch to mind map view',
      icon: <Brain className="h-4 w-4" />,
      action: () => {
        // This would be handled by the parent component
        onClose();
      },
      group: 'actions',
      keywords: ['mindmap', 'visual', 'connections']
    }
  ];

  const noteCommands: Command[] = notes.map(note => ({
    id: note.id,
    title: note.title || 'Untitled',
    description: note.content.substring(0, 100) + (note.content.length > 100 ? '...' : ''),
    icon: <FileText className="h-4 w-4" />,
    action: () => onNoteSelect(note),
    group: 'notes',
    keywords: [note.title, note.content, ...note.tags].filter(Boolean)
  }));

  const allCommands = [...commands, ...noteCommands];

  const filteredCommands = allCommands.filter(command => {
    if (!query) return true;
    
    const searchText = query.toLowerCase();
    return (
      command.title.toLowerCase().includes(searchText) ||
      command.description.toLowerCase().includes(searchText) ||
      command.keywords?.some(keyword => 
        keyword.toLowerCase().includes(searchText)
      )
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  };

  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.group]) {
      acc[command.group] = [];
    }
    acc[command.group].push(command);
    return acc;
  }, {} as Record<string, Command[]>);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-card border-border">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Command className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search notes, commands..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-none bg-transparent p-0 text-lg focus-visible:ring-0"
              autoFocus
            />
          </div>
        </div>

        <ScrollArea className="max-h-96">
          <div className="p-2">
            {Object.entries(groupedCommands).map(([group, commands]) => (
              <div key={group} className="mb-4 last:mb-0">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {group === 'actions' ? 'Actions' : 'Notes'}
                </div>
                <div className="space-y-1">
                  {commands.map((command, index) => {
                    const globalIndex = allCommands.findIndex(c => c.id === command.id);
                    const isSelected = globalIndex === selectedIndex;
                    
                    return (
                      <div
                        key={command.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-fast",
                          isSelected 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-accent hover:text-accent-foreground"
                        )}
                        onClick={() => {
                          command.action();
                          onClose();
                        }}
                      >
                        <div className={cn(
                          "flex-shrink-0",
                          isSelected ? "text-primary-foreground" : "text-muted-foreground"
                        )}>
                          {command.icon}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {command.title}
                          </div>
                          <div className={cn(
                            "text-xs truncate",
                            isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                          )}>
                            {command.description}
                          </div>
                        </div>

                        {command.group === 'notes' && (
                          <div className="flex-shrink-0 flex items-center gap-2">
                            {notes.find(n => n.id === command.id)?.tags.slice(0, 2).map(tag => (
                              <Badge 
                                key={tag} 
                                variant="outline" 
                                className={cn(
                                  "text-xs px-1 py-0",
                                  isSelected && "border-primary-foreground/30 text-primary-foreground/70"
                                )}
                              >
                                #{tag}
                              </Badge>
                            ))}
                            <div className={cn(
                              "flex items-center gap-1 text-xs",
                              isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}>
                              <Calendar className="h-3 w-3" />
                              {formatDate(notes.find(n => n.id === command.id)?.updatedAt || new Date())}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredCommands.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No results found</p>
                <p className="text-xs">Try searching for something else</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-3 bg-muted/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-background border border-border rounded">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-background border border-border rounded">Enter</kbd>
                <span>Select</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-xs font-mono bg-background border border-border rounded">Esc</kbd>
                <span>Close</span>
              </div>
            </div>
            <div>{filteredCommands.length} results</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};