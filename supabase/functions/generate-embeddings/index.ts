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
  // Handle CORS preflight requests
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

    // Verify the note belongs to the authenticated user
    const { data: noteData, error: noteError } = await supabase
      .from('notes')
      .select('user_id')
      .eq('id', noteId)
      .single();

    if (noteError || !noteData || noteData.user_id !== userId) {
      throw new Error('Note not found or access denied');
    }

    // Get user's Gemini API key
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('gemini_api_key')
      .eq('user_id', userId)
      .single();

    if (settingsError || !settingsData?.gemini_api_key) {
      return new Response(JSON.stringify({ 
        error: 'Gemini API key not found. Please add your API key in settings.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiApiKey = settingsData.gemini_api_key;

    // First, delete existing embeddings for this note
    await supabase
      .from('notes_embeddings')
      .delete()
      .eq('note_id', noteId)
      .eq('user_id', userId);

    // Combine title and content for better context
    const fullContent = `${title}\n\n${content}`;
    
    // Split content into chunks (roughly 500 characters each to stay within token limits)
    const chunks = [];
    const chunkSize = 500;
    
    for (let i = 0; i < fullContent.length; i += chunkSize) {
      const chunk = fullContent.slice(i, i + chunkSize);
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }

    // Generate embeddings for each chunk
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        const embeddingResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: "models/text-embedding-004",
              content: {
                parts: [{ text: chunk }]
              }
            })
          }
        );

        if (!embeddingResponse.ok) {
          console.error(`Embedding API error for chunk ${i}:`, embeddingResponse.statusText);
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.embedding.values;

        embeddings.push({
          note_id: noteId,
          user_id: userId,
          content_chunk: chunk,
          embedding: `[${embedding.join(',')}]`,
          chunk_index: i
        });

        // Add a small delay to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error generating embedding for chunk ${i}:`, error);
      }
    }

    // Insert embeddings into database
    if (embeddings.length > 0) {
      const { error: insertError } = await supabase
        .from('notes_embeddings')
        .insert(embeddings);

      if (insertError) {
        throw insertError;
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      chunksProcessed: embeddings.length,
      totalChunks: chunks.length
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