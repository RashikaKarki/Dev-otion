# RAG Pipeline Migration: Gemini + Supabase → Cohere + Chroma

## Architecture Changes

✅ **Completed:**
- Removed pgvector tables and functions from Supabase
- Updated user settings to use Cohere API keys
- Created new edge functions for Cohere + Chroma integration
- Updated frontend components to work with new architecture

## Required Setup

### 1. Chroma Vector Database

You need to set up Chroma vector database. Options:

**Option A: Local Development**
```bash
# Install Chroma locally
pip install chromadb
# Or use Docker
docker run -p 8000:8000 chromadb/chroma
```

**Option B: Cloud Hosted**
- Use a hosted Chroma service
- Set the `CHROMA_URL` environment variable to your hosted instance

### 2. Environment Variables

Add these to your Supabase Edge Function secrets:

```bash
# Chroma database URL
CHROMA_URL=http://localhost:8000  # or your hosted Chroma URL
```

### 3. User API Keys

Users need to:
1. Get a Cohere API key from https://dashboard.cohere.ai
2. Add it in Settings page
3. The key is stored securely in Supabase user_settings table

## New Architecture Benefits

🚀 **Improved Performance:**
- Cohere's embed-english-v3.0 model (1024 dimensions)
- Better chunk processing with overlap
- Optimized query vs document embeddings

🎯 **Better Context:**
- Larger chunk sizes (1000 chars vs 500)
- Smarter relevance scoring
- More accurate search results

🔒 **Enhanced Security:**
- User-specific vector isolation in Chroma
- Automatic embedding cleanup
- JWT-protected endpoints

## Functions Overview

- `generate-embeddings-cohere`: Creates embeddings using Cohere and stores in Chroma
- `cohere-chat`: Searches Chroma and generates responses using Cohere

## Next Steps

1. Set up Chroma database (local or hosted)
2. Configure CHROMA_URL environment variable
3. Users can add Cohere API keys in Settings
4. Test the improved RAG pipeline!

The new implementation should provide much better context awareness and more accurate responses.