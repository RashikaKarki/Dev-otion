import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { NoteEditor } from './NoteEditor';
import { TaskManager } from './TaskManager';
import { MindMapViewer } from './MindMapViewer';
import { CommandPalette } from './CommandPalette';
import { useToast } from '@/hooks/use-toast';

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

export const DevWorkspace = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [activeView, setActiveView] = useState<'notes' | 'tasks' | 'mindmap'>('notes');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const { toast } = useToast();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            setShowCommandPalette(true);
            break;
          case 'n':
            e.preventDefault();
            createNewNote();
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

  const createNewNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: 'Untitled Note',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    };
    setNotes(prev => [newNote, ...prev]);
    setActiveNote(newNote);
    setActiveView('notes');
    toast({
      title: "New note created",
      description: "Start typing to add content",
    });
  };

  const updateNote = (updatedNote: Note) => {
    setNotes(prev => prev.map(note => 
      note.id === updatedNote.id 
        ? { ...updatedNote, updatedAt: new Date() }
        : note
    ));
    setActiveNote(updatedNote);
  };

  const deleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(note => note.id !== noteId));
    if (activeNote?.id === noteId) {
      setActiveNote(null);
    }
    toast({
      title: "Note deleted",
      description: "The note has been removed from your workspace",
    });
  };

  const createNewTask = (title: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      priority: 'medium',
      createdAt: new Date()
    };
    setTasks(prev => [newTask, ...prev]);
    toast({
      title: "Task created",
      description: title,
    });
  };

  const toggleTask = (taskId: string) => {
    setTasks(prev => prev.map(task =>
      task.id === taskId 
        ? { ...task, completed: !task.completed }
        : task
    ));
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId));
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        notes={notes}
        tasks={tasks}
        activeNote={activeNote}
        activeView={activeView}
        onNoteSelect={setActiveNote}
        onViewChange={setActiveView}
        onNewNote={createNewNote}
        onDeleteNote={deleteNote}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeView === 'notes' && (
          <NoteEditor
            note={activeNote}
            onNoteUpdate={updateNote}
          />
        )}
        
        {activeView === 'tasks' && (
          <TaskManager
            tasks={tasks}
            onCreateTask={createNewTask}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
          />
        )}
        
        {activeView === 'mindmap' && (
          <MindMapViewer
            notes={notes}
            activeNote={activeNote}
          />
        )}
      </main>

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        notes={notes}
        onNoteSelect={(note) => {
          setActiveNote(note);
          setActiveView('notes');
          setShowCommandPalette(false);
        }}
        onNewNote={() => {
          createNewNote();
          setShowCommandPalette(false);
        }}
      />
    </div>
  );
};