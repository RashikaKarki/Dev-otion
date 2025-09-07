import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useEmbeddings } from './useEmbeddings';

export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const { generateEmbeddings, deleteEmbeddings } = useEmbeddings();

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching notes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createNote = async (note: Partial<Note>) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([{
          title: note.title || 'Untitled Note',
          content: note.content || '',
          tags: note.tags || [],
          user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => [data, ...prev]);
      toast({
        title: "Note created",
        description: "Start typing to add content",
      });
      return data;
    } catch (error: any) {
      toast({
        title: "Error creating note",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => prev.map(note => 
        note.id === noteId ? data : note
      ));

      // Auto-generate embeddings if note content is meaningful
      if (data.content && data.content.trim().length > 50) {
        try {
          console.log('Auto-generating embeddings for updated note...');
          await generateEmbeddings(data.id, data.content, data.title);
          console.log('Embeddings generated successfully');
        } catch (error) {
          console.warn('Embedding generation failed (non-blocking):', error);
        }
      }

      return data;
    } catch (error: any) {
      toast({
        title: "Error updating note",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      // Delete embeddings first
      try {
        await deleteEmbeddings(noteId);
        console.log('Embeddings deleted for note:', noteId);
      } catch (embeddingError) {
        console.warn('Error deleting embeddings (non-blocking):', embeddingError);
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(prev => prev.filter(note => note.id !== noteId));
      toast({
        title: "Note deleted",
        description: "The note and its embeddings have been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error deleting note",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return {
    notes,
    loading,
    createNote,
    updateNote,
    deleteNote,
    refetch: fetchNotes
  };
}