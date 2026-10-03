const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
let documentStore = []; // will hold { text, embedding } objects
function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    chunks.push(text.slice(start, end));
    start = end - overlap; // overlap keeps context continuous between chunks
  }

  return chunks.filter((chunk) => chunk.trim().length > 0);
}
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
const axios = require('axios');
async function askClaude(question, context) {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Answer the question using only the context below. If the answer isn't in the context, say so.

Context:
${context}

Question: ${question}`,
        },
      ],
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.content[0].text;
}

async function getEmbedding(text) {
  const response = await axios.post(
    'https://api.voyageai.com/v1/embeddings',
    {
      input: [text],
      model: 'voyage-3-lite',
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.data[0].embedding;
}
app.post('/api/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const data = await pdfParse(req.file.buffer);
    const text = data.text;
    const chunks = chunkText(text);

    // Clear previous document's chunks (single-document version for now)
    documentStore = [];

    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk);
      documentStore.push({ text: chunk, embedding });
    }

    res.json({
      filename: req.file.originalname,
      textLength: text.length,
      numChunks: chunks.length,
      message: 'Document processed and embedded successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

app.post('/api/ask', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'No question provided' });
    }

    if (documentStore.length === 0) {
      return res.status(400).json({ error: 'No document uploaded yet' });
    }

    // 1. Embed the question
    const questionEmbedding = await getEmbedding(question);

    // 2. Find the most similar chunks (retrieval)
    const scored = documentStore.map((item) => ({
      ...item,
      score: cosineSimilarity(questionEmbedding, item.embedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    const topChunks = scored.slice(0, 3);

    // 3. Build context from top chunks
    const context = topChunks.map((c) => c.text).join('\n\n---\n\n');

    // 4. Ask Claude (generation)
    const answer = await askClaude(question, context);

    res.json({
      answer,
      sources: topChunks.map((c) => ({ text: c.text, score: c.score })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to answer question' });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));