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

    console.log(`Note verified: "${noteData.title}" (${noteData.content.length} chars)`);

    // Get user's Gemini API key
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .select('gemini_api_key')
      .eq('user_id', userId)
      .single();

    if (settingsError || !settingsData?.gemini_api_key) {
      console.error('API key error:', settingsError);
      throw new Error('Gemini API key not found. Please add your API key in settings.');
    }

    const geminiApiKey = settingsData.gemini_api_key;
    console.log('API key retrieved successfully');

    // First, delete existing embeddings for this note
    const { error: deleteError } = await supabase
      .from('notes_embeddings')
      .delete()
      .eq('note_id', noteId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting existing embeddings:', deleteError);
    } else {
      console.log('Existing embeddings deleted successfully');
    }

    // Combine title and content for better context - use the actual note data
    const fullContent = `${noteData.title}\n\n${noteData.content}`;
    console.log(`Full content length: ${fullContent.length} characters`);
    
    // Split content into overlapping chunks for better context retention
    const chunks = [];
    const chunkSize = 800; // Increased chunk size
    const overlap = 200;   // Add overlap between chunks
    
    for (let i = 0; i < fullContent.length; i += (chunkSize - overlap)) {
      const chunk = fullContent.slice(i, i + chunkSize);
      if (chunk.trim().length > 50) { // Only process meaningful chunks
        chunks.push(chunk.trim());
      }
    }

    console.log(`Created ${chunks.length} chunks for processing`);

    // Generate embeddings for each chunk
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
      
      try {
        // Using text-embedding-004 which is Google's latest embedding model
        const embeddingResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: "models/text-embedding-004",
              content: {
                parts: [{ text: chunk }]
              },
              taskType: "RETRIEVAL_DOCUMENT" // Optimize for document retrieval
            })
          }
        );

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          console.error(`Embedding API error for chunk ${i}:`, embeddingResponse.status, errorText);
          continue;
        }

        const embeddingData = await embeddingResponse.json();
        
        if (!embeddingData.embedding?.values) {
          console.error(`No embedding values returned for chunk ${i}`);
          continue;
        }

        const embedding = embeddingData.embedding.values;
        console.log(`Generated embedding for chunk ${i}: ${embedding.length} dimensions`);

        embeddings.push({
          note_id: noteId,
          user_id: userId,
          content_chunk: chunk,
          embedding: `[${embedding.join(',')}]`, // Store as string array format
          chunk_index: i
        });

        console.log(`Successfully processed chunk ${i + 1}`);

        // Add a delay to avoid rate limiting (100ms between requests)
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error generating embedding for chunk ${i}:`, error);
      }
    }

    console.log(`Generated ${embeddings.length} embeddings out of ${chunks.length} chunks`);

    // Insert embeddings into database in batches
    if (embeddings.length > 0) {
      console.log(`Inserting ${embeddings.length} embeddings into database`);
      
      const { data: insertData, error: insertError } = await supabase
        .from('notes_embeddings')
        .insert(embeddings)
        .select('id');

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw insertError;
      }

      console.log(`Successfully inserted ${insertData?.length || 0} embeddings`);
    } else {
      console.warn('No embeddings were generated!');
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