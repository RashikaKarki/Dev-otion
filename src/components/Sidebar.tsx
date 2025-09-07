import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  CheckSquare, 
  Brain, 
  Plus, 
  Search, 
  Trash2,
  Hash,
  Calendar
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

interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
}

interface SidebarProps {
  notes: Note[];
  tasks: Task[];
  activeNote: Note | null;
  activeView: 'notes' | 'tasks' | 'mindmap';
  onNoteSelect: (note: Note) => void;
  onViewChange: (view: 'notes' | 'tasks' | 'mindmap') => void;
  onNewNote: () => void;
  onDeleteNote: (noteId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  tasks,
  activeNote,
  activeView,
  onNoteSelect,
  onViewChange,
  onNewNote,
  onDeleteNote
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'secondary';
    }
  };

  const completedTasks = tasks.filter(task => task.completed).length;

  return (
    <div className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Hash className="h-4 w-4 text-primary-foreground font-bold" />
          </div>
          <h1 className="text-lg font-semibold gradient-text">DevNotes</h1>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search notes... (⌘K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-sidebar-accent border-sidebar-border"
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="space-y-2">
          <Button
            variant={activeView === 'notes' ? 'default' : 'ghost'}
            className={cn(
              "w-full justify-start",
              activeView === 'notes' && "bg-sidebar-primary text-sidebar-primary-foreground"
            )}
            onClick={() => onViewChange('notes')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Notes
            <Badge variant="secondary" className="ml-auto">
              {notes.length}
            </Badge>
          </Button>
          
          <Button
            variant={activeView === 'tasks' ? 'default' : 'ghost'}
            className={cn(
              "w-full justify-start",
              activeView === 'tasks' && "bg-sidebar-primary text-sidebar-primary-foreground"
            )}
            onClick={() => onViewChange('tasks')}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Tasks
            <Badge variant="secondary" className="ml-auto">
              {completedTasks}/{tasks.length}
            </Badge>
          </Button>
          
          <Button
            variant={activeView === 'mindmap' ? 'default' : 'ghost'}
            className={cn(
              "w-full justify-start",
              activeView === 'mindmap' && "bg-sidebar-primary text-sidebar-primary-foreground"
            )}
            onClick={() => onViewChange('mindmap')}
          >
            <Brain className="h-4 w-4 mr-2" />
            Mind Map
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'notes' && (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-sidebar-border">
              <Button
                onClick={onNewNote}
                className="w-full bg-sidebar-primary hover:bg-sidebar-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Note (⌘N)
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2">
                {filteredNotes.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notes found</p>
                    <p className="text-xs">Create your first note</p>
                  </div>
                ) : (
                  filteredNotes.map((note) => (
                    <div
                      key={note.id}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer transition-smooth hover:bg-sidebar-accent group mb-2",
                        activeNote?.id === note.id && "bg-sidebar-accent border border-sidebar-primary"
                      )}
                      onClick={() => onNoteSelect(note)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">
                            {note.title || 'Untitled'}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {note.content || 'No content'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {formatDate(note.updatedAt)}
                            </span>
                          </div>
                          {note.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {note.tags.slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-xs px-1 py-0"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {note.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  +{note.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-fast h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteNote(note.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {activeView === 'tasks' && (
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="text-center text-muted-foreground py-8">
                <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Task details shown in main view</p>
              </div>
            </div>
          </ScrollArea>
        )}

        {activeView === 'mindmap' && (
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="text-center text-muted-foreground py-8">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Mind map visualization</p>
                <p className="text-xs">Generated from your notes</p>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>⌘K - Command palette</div>
          <div>⌘N - New note</div>
          <div>⌘1/2/3 - Switch views</div>
        </div>
      </div>
    </div>
  );
};