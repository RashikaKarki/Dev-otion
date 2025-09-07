import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from './useSettings';

export function useEmbeddings() {
  const { user } = useAuth();
  const { hasGeminiApiKey } = useSettings();

  const generateEmbeddings = async (noteId: string, content: string, title: string) => {
    // No API key needed for HuggingFace embeddings, but we'll keep the check for consistency
    if (!user) {
      console.warn('Cannot generate embeddings: user not authenticated');
      return null;
    }

    console.log(`Starting embedding generation for note "${title}"`);

    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings-hf', {
        body: {
          noteId,
          content,
          title
        }
      });

      if (error) {
        console.error('Embedding generation error:', error);
        throw error;
      }

      console.log('Embedding generation successful:', data);
      return data;
    } catch (error: any) {
      console.error('Error generating embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
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