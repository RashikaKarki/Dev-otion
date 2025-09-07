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


// Pure local embedding function - no external dependencies or API calls
function generateLocalEmbedding(text: string): number[] {
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
  const embedding = new Array(384).fill(0);
  
  // Simple but effective word-based embedding
  words.forEach((word, index) => {
    const wordHash = hashString(word);
    for (let i = 0; i < Math.min(word.length, 10); i++) {
      const charCode = word.charCodeAt(i);
      const pos = (wordHash + i * 17) % 384;
      embedding[pos] += Math.sin(charCode * 0.1) * (1 / Math.sqrt(index + 1));
    }
  });
  
  // Character trigrams for better context
  for (let i = 0; i < text.length - 2; i++) {
    const trigram = text.slice(i, i + 3).toLowerCase();
    const trigramHash = hashString(trigram);
    const pos1 = trigramHash % 384;
    const pos2 = (trigramHash * 7) % 384;
    embedding[pos1] += 0.2;
    embedding[pos2] += 0.1;
  }
  
  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = embedding[i] / magnitude;
    }
  }
  
  return embedding;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
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

    console.log(`Note verified: "${noteData.title}" (${noteData.content.length} chars)`);

    // Delete existing embeddings for this note
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

    // Combine title and content for better context
    const fullContent = `${noteData.title}\n\n${noteData.content}`;
    console.log(`Full content length: ${fullContent.length} characters`);
    
    // Split content into overlapping chunks
    const chunks = [];
    const chunkSize = 800;
    const overlap = 200;
    
    for (let i = 0; i < fullContent.length; i += (chunkSize - overlap)) {
      const chunk = fullContent.slice(i, i + chunkSize);
      if (chunk.trim().length > 50) {
        chunks.push(chunk.trim());
      }
    }

    console.log(`Created ${chunks.length} chunks for processing`);

    // Generate embeddings using pure local algorithm (NO external dependencies!)
    console.log('Generating embeddings with local algorithm...');
    
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
      
      try {
        // Generate embedding using local algorithm only
        const embedding = generateLocalEmbedding(chunk);

        console.log(`Generated local embedding for chunk ${i}: ${embedding.length} dimensions`);

        embeddings.push({
          note_id: noteId,
          user_id: userId,
          content_chunk: chunk,
          embedding: `[${embedding.join(',')}]`,
          chunk_index: i
        });

        console.log(`Successfully processed chunk ${i + 1}`);
      } catch (error) {
        console.error(`Error generating local embedding for chunk ${i}:`, error);
      }
    }

    console.log(`Generated ${embeddings.length} embeddings out of ${chunks.length} chunks`);

    // Insert embeddings into Supabase database (FREE!)
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
      noteId: noteId,
      model: 'Local Text Embeddings (No Dependencies)'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-embeddings-hf function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});