import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useSettings } from './useSettings';

export function useEmbeddings() {
  const { user } = useAuth();
  const { hasCohereApiKey } = useSettings();

  const generateEmbeddings = async (noteId: string, content: string, title: string) => {
    if (!user || !hasCohereApiKey()) {
      console.warn('Cannot generate embeddings: user not authenticated or API key missing');
      return null;
    }

    console.log(`Starting embedding generation for note "${title}"`);

    try {
      const { data, error } = await supabase.functions.invoke('generate-embeddings-cohere', {
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
    // With Chroma, embeddings are automatically deleted when new ones are generated
    // for the same note, so we don't need to explicitly delete them
    console.log(`Embeddings for note ${noteId} will be replaced automatically`);
  };

  return {
    generateEmbeddings,
    deleteEmbeddings,
    hasCohereApiKey
  };
}