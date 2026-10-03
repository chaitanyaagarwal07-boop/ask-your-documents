import { useState } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setUploadStatus('Processing...');
    const formData = new FormData();
    formData.append('document', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Upload failed');

      setUploadStatus(`✅ ${data.filename} processed (${data.numChunks} chunks)`);
    } catch (err) {
      console.error(err);
      setUploadStatus('❌ Upload failed');
    }
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question) return;

    setLoading(true);
    setAnswer('');
    setSources([]);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to get answer');

      setAnswer(data.answer);
      setSources(data.sources);
    } catch (err) {
      console.error(err);
      setAnswer('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', fontFamily: 'sans-serif' }}>
      <h1>Ask Your Documents</h1>

      <form onSubmit={handleUpload} style={{ marginBottom: '20px' }}>
        <h2>1. Upload a PDF</h2>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button type="submit" style={{ marginLeft: '10px' }}>Upload</button>
        <p>{uploadStatus}</p>
      </form>

      <form onSubmit={handleAsk} style={{ marginBottom: '30px' }}>
        <h2>2. Ask a Question</h2>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What would you like to know?"
          style={{ width: '70%', padding: '8px' }}
          required
        />
        <button type="submit" disabled={loading} style={{ marginLeft: '10px' }}>
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {answer && (
        <div style={{ marginBottom: '20px' }}>
          <h2>Answer</h2>
          <p style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px' }}>
            {answer}
          </p>
        </div>
      )}

      {sources.length > 0 && (
        <div>
          <h3>Sources</h3>
          {sources.map((s, i) => (
            <div
              key={i}
              style={{
                fontSize: '13px',
                color: '#555',
                backgroundColor: '#fafafa',
                padding: '10px',
                marginBottom: '8px',
                borderRadius: '6px',
              }}
            >
              <strong>Relevance: {(s.score * 100).toFixed(1)}%</strong>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;