import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmbeddingRequest {
  noteId: string;
  content: string;
  title: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { noteId, content, title }: EmbeddingRequest = await req.json();
    
    if (!noteId || !content) {
      throw new Error('noteId and content are required');
    }

    // Create Supabase client with auth context
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    
    if (userError || !user) {
      throw new Error('Invalid authentication token');
    }

    const userId = user.id;
    console.log(`Starting embedding generation for note ${noteId}, user ${userId}`);

    // Verify the note belongs to the authenticated user
    const { data: noteData, error: noteError } = await supabase
      .from('notes')
      .select('user_id, title, content')
      .eq('id', noteId)
      .single();

    if (noteError || !noteData || noteData.user_id !== userId) {
      console.error('Note verification failed:', noteError || 'Access denied');
      throw new Error('Note not found or access denied');
    }

    // Get user's Cohere API key
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('cohere_api_key')
      .eq('user_id', userId)
      .single();

    if (settingsError || !settingsData?.cohere_api_key) {
      throw new Error('Cohere API key not found. Please add your API key in settings.');
    }

    const cohereApiKey = settingsData.cohere_api_key;
    console.log('Cohere API key retrieved successfully');

    // Combine title and content for better context
    const fullContent = `${noteData.title}\n\n${noteData.content}`;
    console.log(`Full content length: ${fullContent.length} characters`);
    
    // Split content into chunks with overlap for better context retention
    const chunks = [];
    const chunkSize = 1000; // Cohere can handle larger chunks
    const overlap = 200;
    
    for (let i = 0; i < fullContent.length; i += (chunkSize - overlap)) {
      const chunk = fullContent.slice(i, i + chunkSize);
      if (chunk.trim().length > 50) {
        chunks.push(chunk.trim());
      }
    }

    console.log(`Created ${chunks.length} chunks for processing`);

    // Generate embeddings using Cohere
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
      
      try {
        const embeddingResponse = await fetch('https://api.cohere.ai/v1/embed', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${cohereApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            texts: [chunk],
            model: 'embed-english-v3.0', // Latest Cohere embedding model
            input_type: 'search_document',
            embedding_types: ['float']
          })
        });

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          console.error(`Cohere API error for chunk ${i}:`, embeddingResponse.status, errorText);
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        
        if (!embeddingData.embeddings?.float?.[0]) {
          console.error(`No embedding returned for chunk ${i}`);
          continue;
        }

        const embedding = embeddingData.embeddings.float[0];
        console.log(`Generated embedding for chunk ${i}: ${embedding.length} dimensions`);

        embeddings.push({
          id: `${noteId}_chunk_${i}`,
          embedding: embedding,
          metadata: {
            noteId: noteId,
            userId: userId,
            chunkIndex: i,
            noteTitle: noteData.title,
            content: chunk
          }
        });

        // Small delay to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error generating embedding for chunk ${i}:`, error);
      }
    }

    console.log(`Generated ${embeddings.length} embeddings out of ${chunks.length} chunks`);

    // Store embeddings in Chroma
    if (embeddings.length > 0) {
      const chromaUrl = Deno.env.get('CHROMA_URL') || 'http://localhost:8000';
      const collectionName = 'notes_embeddings';
      
      // First, try to get or create the collection
      try {
        await fetch(`${chromaUrl}/api/v1/collections/${collectionName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: collectionName,
            metadata: { description: 'Note embeddings for RAG' }
          })
        });
      } catch (error) {
        console.log('Collection might already exist, continuing...');
      }

      // Delete existing embeddings for this note
      try {
        await fetch(`${chromaUrl}/api/v1/collections/${collectionName}/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            where: { noteId: noteId }
          })
        });
      } catch (error) {
        console.log('No existing embeddings to delete');
      }

      // Add new embeddings
      const chromaResponse = await fetch(`${chromaUrl}/api/v1/collections/${collectionName}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: embeddings.map(e => e.id),
          embeddings: embeddings.map(e => e.embedding),
          metadatas: embeddings.map(e => e.metadata),
          documents: embeddings.map(e => e.metadata.content)
        })
      });

      if (!chromaResponse.ok) {
        const errorText = await chromaResponse.text();
        console.error('Chroma storage error:', errorText);
        throw new Error(`Failed to store embeddings in Chroma: ${errorText}`);
      }

      console.log(`Successfully stored ${embeddings.length} embeddings in Chroma`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      chunksProcessed: embeddings.length,
      totalChunks: chunks.length,
      noteTitle: noteData.title,
      noteId: noteId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-embeddings function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});