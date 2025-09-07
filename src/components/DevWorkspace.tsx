import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { EnhancedNoteEditor } from './EnhancedNoteEditor';
import { TaskManager } from './TaskManager';
import { MindMapViewer } from './MindMapViewer';
import { CommandPalette } from './CommandPalette';
import { useAuth } from '@/hooks/useAuth';
import { useNotes, Note as SupabaseNote } from '@/hooks/useNotes';
import { useTasks, Task as SupabaseTask } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Legacy interfaces for compatibility with existing components
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
  linkedNoteId?: string;
}

export const DevWorkspace = () => {
  const { user, signOut } = useAuth();
  const { notes: supabaseNotes, createNote, updateNote: updateSupabaseNote, deleteNote: deleteSupabaseNote } = useNotes();
  const { tasks: supabaseTasks, createTask: createSupabaseTask, updateTask: updateSupabaseTask, deleteTask: deleteSupabaseTask, toggleTask: toggleSupabaseTask } = useTasks();
  
  const [activeNote, setActiveNote] = useState<SupabaseNote | null>(null);
  const [activeView, setActiveView] = useState<'notes' | 'tasks' | 'mindmap'>('notes');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const { toast } = useToast();

  // Convert Supabase data to legacy format for compatibility with existing components
  const notes: Note[] = supabaseNotes.map(note => ({
    id: note.id,
    title: note.title,
    content: note.content,
    tags: note.tags,
    createdAt: new Date(note.created_at),
    updatedAt: new Date(note.updated_at)
  }));

  const tasks: Task[] = supabaseTasks.map(task => ({
    id: task.id,
    title: task.title,
    completed: task.completed,
    priority: task.priority,
    createdAt: new Date(task.created_at),
    linkedNoteId: task.linked_note_id
  }));

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            setShowCommandPalette(true);
            break;
          case 'n':
            e.preventDefault();
            handleCreateNewNote();
            break;
          case '1':
            e.preventDefault();
            setActiveView('notes');
            break;
          case '2':
            e.preventDefault();
            setActiveView('tasks');
            break;
          case '3':
            e.preventDefault();
            setActiveView('mindmap');
            break;
        }
      }
      
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCreateNewNote = async () => {
    const newNote = await createNote({
      title: 'Untitled Note',
      content: '',
      tags: []
    });
    
    if (newNote) {
      setActiveNote(newNote);
      setActiveView('notes');
    }
  };

  const handleUpdateNote = async (updatedNote: Note) => {
    const supabaseNote = await updateSupabaseNote(updatedNote.id, {
      title: updatedNote.title,
      content: updatedNote.content,
      tags: updatedNote.tags
    });
    
    if (supabaseNote) {
      setActiveNote(supabaseNote);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    await deleteSupabaseNote(noteId);
    if (activeNote?.id === noteId) {
      setActiveNote(null);
    }
  };

  const handleCreateNewTask = async (title: string, priority: 'low' | 'medium' | 'high' = 'medium') => {
    await createSupabaseTask({
      title,
      priority
    });
  };

  const handleToggleTask = async (taskId: string) => {
    await toggleSupabaseTask(taskId);
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteSupabaseTask(taskId);
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<Task>) => {
    await updateSupabaseTask(taskId, {
      title: updates.title,
      completed: updates.completed,
      priority: updates.priority
    });
  };

  const handleReorderTasks = async (reorderedTasks: Task[]) => {
    // For now, we'll just update each task with a new priority or order field
    // In a real app, you'd want to add an order field to the database
    console.log('Reordering tasks:', reorderedTasks.map(t => t.title));
  };

  const handleTaskClick = (noteId: string) => {
    const note = supabaseNotes.find(n => n.id === noteId);
    if (note) {
      setActiveNote(note);
      setActiveView('notes');
    }
  };

  const handleCreateTaskFromNote = async (title: string, priority: 'low' | 'medium' | 'high', linkedNoteId?: string, completed: boolean = false) => {
    await createSupabaseTask({
      title,
      priority,
      linked_note_id: linkedNoteId,
      completed
    });
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        notes={notes}
        tasks={tasks}
        activeNote={activeNote ? {
          id: activeNote.id,
          title: activeNote.title,
          content: activeNote.content,
          tags: activeNote.tags,
          createdAt: new Date(activeNote.created_at),
          updatedAt: new Date(activeNote.updated_at)
        } : null}
        activeView={activeView}
        onNoteSelect={(note) => {
          const supabaseNote = supabaseNotes.find(n => n.id === note.id);
          setActiveNote(supabaseNote || null);
        }}
        onViewChange={setActiveView}
        onNewNote={handleCreateNewNote}
        onDeleteNote={handleDeleteNote}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header with user info and logout */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold">Dev-otion</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {activeView === 'notes' && (
          <EnhancedNoteEditor
            note={activeNote ? {
              id: activeNote.id,
              title: activeNote.title,
              content: activeNote.content,
              tags: activeNote.tags,
              createdAt: new Date(activeNote.created_at),
              updatedAt: new Date(activeNote.updated_at)
            } : null}
            onNoteUpdate={handleUpdateNote}
            onToggleTask={handleToggleTask}
            linkedTasks={activeNote ? tasks.filter(task => task.linkedNoteId === activeNote.id) : []}
          />
        )}
        
        {activeView === 'tasks' && (
          <TaskManager
            tasks={tasks}
            onCreateTask={handleCreateNewTask}
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onUpdateTask={handleUpdateTask}
            onTaskClick={handleTaskClick}
            onReorderTasks={handleReorderTasks}
          />
        )}
        
        {activeView === 'mindmap' && (
          <MindMapViewer
            notes={notes}
            activeNote={activeNote ? {
              id: activeNote.id,
              title: activeNote.title,
              content: activeNote.content,
              tags: activeNote.tags,
              createdAt: new Date(activeNote.created_at),
              updatedAt: new Date(activeNote.updated_at)
            } : null}
          />
        )}
      </main>

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        notes={notes}
        onNoteSelect={(note) => {
          const supabaseNote = supabaseNotes.find(n => n.id === note.id);
          setActiveNote(supabaseNote || null);
          setActiveView('notes');
          setShowCommandPalette(false);
        }}
        onNewNote={() => {
          handleCreateNewNote();
          setShowCommandPalette(false);
        }}
      />
    </div>
  );
};