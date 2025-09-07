import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { EnhancedNoteEditor } from './EnhancedNoteEditor';
import { NoteViewer } from './NoteViewer';
import { TaskManager } from './TaskManager';
import { MindMapViewer } from './MindMapViewer';
import { NotesListView } from './NotesListView';
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
  const [noteMode, setNoteMode] = useState<'view' | 'edit'>('view');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [taskOrder, setTaskOrder] = useState<string[]>([]);
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

  // Sort tasks based on custom order, falling back to creation date
  const sortedSupabaseTasks = React.useMemo(() => {
    if (taskOrder.length === 0) {
      return supabaseTasks;
    }
    
    const taskMap = new Map(supabaseTasks.map(task => [task.id, task]));
    const orderedTasks: typeof supabaseTasks = [];
    const unorderedTasks: typeof supabaseTasks = [];
    
    // Add tasks in the specified order
    taskOrder.forEach(taskId => {
      const task = taskMap.get(taskId);
      if (task) {
        orderedTasks.push(task);
        taskMap.delete(taskId);
      }
    });
    
    // Add any remaining tasks that weren't in the order
    taskMap.forEach(task => unorderedTasks.push(task));
    
    return [...orderedTasks, ...unorderedTasks];
  }, [supabaseTasks, taskOrder]);

  const tasks: Task[] = sortedSupabaseTasks.map(task => ({
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

  // Initialize task order when tasks are loaded
  React.useEffect(() => {
    if (supabaseTasks.length > 0 && taskOrder.length === 0) {
      setTaskOrder(supabaseTasks.map(task => task.id));
    }
  }, [supabaseTasks, taskOrder.length]);

  const handleCreateNewNote = async () => {
    const newNote = await createNote({
      title: 'Untitled Note',
      content: '',
      tags: []
    });
    
    if (newNote) {
      setActiveNote(newNote);
      setActiveView('notes');
      setNoteMode('edit'); // New notes start in edit mode
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
    // Update the task order immediately in the UI
    const newOrder = reorderedTasks.map(task => task.id);
    setTaskOrder(newOrder);
    
    // Store the order in localStorage for persistence across sessions
    localStorage.setItem('task-order', JSON.stringify(newOrder));
    
    toast({
      title: "Tasks reordered",
      description: "Task order has been updated",
    });
  };

  // Load task order from localStorage on mount
  React.useEffect(() => {
    const savedOrder = localStorage.getItem('task-order');
    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        if (Array.isArray(order)) {
          setTaskOrder(order);
        }
      } catch (error) {
        console.error('Failed to parse saved task order:', error);
      }
    }
  }, []);

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
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
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

        {activeView === 'notes' && !activeNote && (
          <NotesListView
            onNoteSelect={(note) => {
              setActiveNote(note);
              setNoteMode('view'); // Notes open in view mode by default
            }}
            onNewNote={handleCreateNewNote}
          />
        )}

        {activeView === 'notes' && activeNote && noteMode === 'view' && (
          <NoteViewer
            note={{
              id: activeNote.id,
              title: activeNote.title,
              content: activeNote.content,
              tags: activeNote.tags,
              createdAt: new Date(activeNote.created_at),
              updatedAt: new Date(activeNote.updated_at)
            }}
            onEdit={() => setNoteMode('edit')}
            onBack={() => setActiveNote(null)}
            onDelete={handleDeleteNote}
          />
        )}

        {activeView === 'notes' && activeNote && noteMode === 'edit' && (
          <EnhancedNoteEditor
            note={{
              id: activeNote.id,
              title: activeNote.title,
              content: activeNote.content,
              tags: activeNote.tags,
              createdAt: new Date(activeNote.created_at),
              updatedAt: new Date(activeNote.updated_at)
            }}
            onNoteUpdate={handleUpdateNote}
            onToggleTask={handleToggleTask}
            linkedTasks={tasks.filter(task => task.linkedNoteId === activeNote.id)}
            onBack={() => setActiveNote(null)}
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
          setNoteMode('view'); // Command palette opens notes in view mode
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