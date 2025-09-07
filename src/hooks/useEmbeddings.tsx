import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from './useSettings';

export function useEmbeddings() {
  const { user } = useAuth();
  const { hasGeminiApiKey } = useSettings();

  const generateEmbeddings = async (noteId: string, content: string, title: string) => {
    if (!user || !hasGeminiApiKey()) {
      throw new Error('User not authenticated or Gemini API key not configured');
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings', {
        body: {
          noteId,
          userId: user.id,
          content,
          title
        }
      });

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  };

  const deleteEmbeddings = async (noteId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notes_embeddings')
        .delete()
        .eq('note_id', noteId)
        .eq('user_id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting embeddings:', error);
      throw error;
    }
  };

  return {
    generateEmbeddings,
    deleteEmbeddings,
    hasGeminiApiKey
  };
}