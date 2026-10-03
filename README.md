# Ask Your Documents

🔗 **Live demo**: [https://ask-your-documents-vert.vercel.app](https://ask-your-documents-vert.vercel.app)

A Retrieval-Augmented Generation (RAG) app — upload a PDF, ask questions about it, and get answers grounded in the document's actual content, with source citations.

## Why I built this

Built to gain hands-on experience with Claude's API and core RAG/agentic-AI concepts (embeddings, semantic retrieval, grounded generation) ahead of applying for AI-focused engineering roles — using Anthropic's own recommended stack (Claude + Voyage AI).

## Features

- Upload a PDF, extract and chunk its text
- Generate embeddings for each chunk via Voyage AI
- Ask natural-language questions — retrieves the most relevant chunks via cosine similarity
- Claude API generates answers grounded strictly in the retrieved context
- Returns source citations with relevance scores, so answers are verifiable

## Tech Stack

**Frontend:** React (Vite)
**Backend:** Node.js, Express
**Embeddings:** Voyage AI (`voyage-3-lite`)
**Generation:** Claude API (`claude-sonnet-4-5`)
**File handling:** Multer (upload), pdf-parse (text extraction)

## Architecture
Client (React) → Express API → [Voyage AI: embeddings]
↓
In-memory vector store
↓
[Cosine similarity retrieval] → Claude API → grounded answer

**Pipeline**: PDF uploaded → text extracted → split into overlapping chunks → each chunk embedded via Voyage AI → stored in memory → on a question, the question is embedded too → compared against all stored chunks via cosine similarity → top 3 most relevant chunks sent to Claude along with the question → Claude generates an answer using only that context.

## Key Engineering Decisions

- **Claude + Voyage AI** — Anthropic doesn't offer an embeddings endpoint, so Voyage AI (Anthropic's recommended embeddings partner) was used for the retrieval half of the pipeline, with Claude handling generation.
- **In-memory vector store** — chosen for speed of development at this project's scale, over setting up a dedicated vector database. This means document data resets on server restart and only one document is held at a time — a known, deliberate tradeoff. The natural next step would be persisting chunks/embeddings in Postgres with the `pgvector` extension for durability and scale.
- **Chunking with overlap** — 500-character chunks with 50-character overlap, so context isn't lost at chunk boundaries.
- **Grounded prompting** — the prompt explicitly instructs Claude to answer only from the provided context and say so if the answer isn't present, reducing hallucination risk.

## Running Locally

### Prerequisites
- Node.js installed
- A Claude API key ([console.anthropic.com](https://console.anthropic.com))
- A Voyage AI API key ([voyageai.com](https://www.voyageai.com))

### Backend setup
```bash
cd server
npm install
```
Create a `.env` file in `server/` with:

Start the server:
```bash
npm run dev
```
Runs on `http://localhost:5001`

### Frontend setup
```bash
cd client
npm install
```
Create a `.env` file in `client/` with:
Start the dev server:
```bash
npm run dev
```
Runs on `http://localhost:5173`

> **Note**: The backend is hosted on Render's free tier, which spins down after inactivity. The first request after idle time may take 30-60 seconds to respond.

## Possible Future Improvements

- Persist chunks/embeddings with `pgvector` instead of in-memory storage
- Support multiple documents at once, with per-document filtering
- Streaming responses from Claude for a more responsive UI
- Support more file types (.docx, .txt)
- Highlight the exact retrieved passage within the source document

