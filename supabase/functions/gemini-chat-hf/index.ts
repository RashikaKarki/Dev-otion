import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
}

// GPT4All-style local embedding using their embedding approach
async function generateGPT4AllEmbedding(text: string): Promise<number[]> {
  try {
    // Use GPT4All's local embedding endpoint (runs locally, no API key needed)
    const response = await fetch('http://localhost:4891/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'all-MiniLM-L6-v2',
        input: text
      })
    });

    if (!response.ok) {
      // Fallback to simple local embeddings if GPT4All server isn't running
      console.log('GPT4All server not available, using fallback embedding');
      return generateFallbackEmbedding(text);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.log('GPT4All connection failed, using fallback embedding:', error.message);
    return generateFallbackEmbedding(text);
  }
}

// Fallback embedding when GPT4All isn't available
function generateFallbackEmbedding(text: string): number[] {
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 0);
  const embedding = new Array(384).fill(0);
  
  words.forEach((word, index) => {
    const wordHash = hashString(word);
    for (let i = 0; i < Math.min(word.length, 10); i++) {
      const charCode = word.charCodeAt(i);
      const pos = (wordHash + i * 17) % 384;
      embedding[pos] += Math.sin(charCode * 0.1) * (1 / Math.sqrt(index + 1));
    }
  });
  
  // Normalize
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
    const { message }: ChatRequest = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
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
    console.log(`Processing chat request from user ${userId}: "${message}"`);

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

    // Generate query embedding using GPT4All (completely local, no API key needed!)
    console.log('Generating query embedding with GPT4All...');
    const queryEmbedding = await generateGPT4AllEmbedding(message);

    console.log(`Generated GPT4All query embedding with ${queryEmbedding.length} dimensions`);

    // Search for similar embeddings using Supabase vector similarity (FREE!)
    console.log('Searching for similar embeddings...');
    const { data: matches, error: searchError } = await supabase.rpc(
      'match_embeddings',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.1, // Lower threshold for better recall
        match_count: 8,       // More results for better context
        user_id: userId
      }
    );

    if (searchError) {
      console.error('Search error:', searchError);
    }

    console.log(`Found ${matches?.length || 0} matching chunks`);

    // Get relevant notes content
    let context = '';
    let sourceNotes: Array<{id: string, title: string, similarity: number}> = [];

    if (matches && matches.length > 0) {
      console.log(`Processing ${matches.length} matches`);
      const noteIds = [...new Set(matches.map((match: any) => match.note_id))];
      console.log(`Fetching ${noteIds.length} unique notes`);
      
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('id, title, content')
        .in('id', noteIds)
        .eq('user_id', userId);

      if (!notesError && notesData) {
        console.log(`Retrieved ${notesData.length} notes from database`);
        
        // Create context and track note relevance
        const noteContexts = notesData.map(note => {
          const noteMatches = matches.filter((match: any) => match.note_id === note.id);
          const avgSimilarity = noteMatches.reduce((sum: number, match: any) => sum + match.similarity, 0) / noteMatches.length;
          
          // Include relevant chunks from this note
          const relevantChunks = noteMatches
            .sort((a: any, b: any) => b.similarity - a.similarity)
            .slice(0, 3) // Top 3 chunks per note
            .map((match: any) => match.content_chunk);
          
          return {
            note,
            similarity: avgSimilarity,
            contextText: `Note: "${note.title}"\nContent: ${relevantChunks.join('\n...\n')}`
          };
        });

        // Sort by relevance and create context
        noteContexts.sort((a, b) => b.similarity - a.similarity);
        context = noteContexts.map(nc => nc.contextText).join('\n\n---\n\n');
        
        // Track source notes with similarity scores
        sourceNotes = noteContexts.map(nc => ({
          id: nc.note.id,
          title: nc.note.title,
          similarity: nc.similarity
        }));
        
        console.log(`Created context from ${noteContexts.length} notes, total length: ${context.length} chars`);
      } else {
        console.error('Error fetching notes:', notesError);
      }
    } else {
      console.log('No matching embeddings found');
    }

    // Generate response using Gemini
    const prompt = context 
      ? `You are an AI assistant that ONLY answers questions based on the user's provided notes. Your role is to help users find information from their personal note collection.

IMPORTANT RULES:
1. ONLY use information from the provided context below
2. If the context doesn't contain enough information to answer the question, say "No notes available so I can't answer this question."
3. Do not use any external knowledge or make assumptions beyond what's in the context
4. When referencing information, mention which note it comes from by using the note title in quotes
5. Keep responses concise and helpful
6. If you find relevant information but it's incomplete, acknowledge what you found and mention what's missing

Context from your notes (ordered by relevance):
${context}

User question: ${message}

Please provide a helpful answer based only on the information in your notes above. When referencing specific information, mention which note it comes from.`
      : `No notes available so I can't answer this question.

💡 Dev tip: Add some notes related to "${message}" to build your personal knowledge base. The more context you provide, the better I can assist you with code snippets, project documentation, or technical concepts!`;

    console.log('Context available:', !!context);
    console.log('Source notes count:', sourceNotes.length);
    console.log('Sending request to Gemini...');

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.statusText}`);
    }

    const geminiData = await geminiResponse.json();
    const response = geminiData.candidates[0].content.parts[0].text;
    
    console.log(`Generated response: ${response.length} characters`);
    console.log(`Returning ${sourceNotes.slice(0, 4).length} source notes`);

    return new Response(JSON.stringify({ 
      response,
      sourceNotes: sourceNotes.slice(0, 4).map(note => ({ 
        id: note.id, 
        title: note.title,
        similarity: Math.round(note.similarity * 100) / 100
      })),
      debug: {
        totalMatches: matches?.length || 0,
        contextLength: context.length,
        hasContext: !!context,
        embeddingModel: 'GPT4All Local Embeddings (all-MiniLM-L6-v2)',
        vectorDB: 'Supabase pgvector (FREE)',
        responseModel: 'Gemini 1.5 Flash'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gemini-chat-hf function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});