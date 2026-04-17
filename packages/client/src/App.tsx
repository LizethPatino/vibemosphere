import { useState } from 'react'
import type { MoodResponse } from '@vibemosphere/shared';

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<MoodResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const analyzeVibe = async () => {
    if (!image) return;
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error al conectar con el cerebro:", error);
      alert("Hubo un problema con la conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Vibemosphere 📸</h1>
      
      <input type="file" accept="image/*" onChange={handleImageChange} />
      
      {image && (
        <div style={{ marginTop: '1rem' }}>
          <img src={image} alt="Preview" style={{ maxWidth: '300px', borderRadius: '8px' }} />
          <br />
          <button onClick={analyzeVibe} disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Analizando vibra...' : 'Generar Estampilla'}
          </button>
        </div>
      )}

      {result && (
        <div style={{ marginTop: '2rem', border: `2px solid ${result.hexColor}`, padding: '1rem', borderRadius: '12px' }}>
          <h2 style={{ color: result.hexColor }}>{result.vibe.label}</h2>
          <p><i>"{result.quote.text}"</i></p>
          <p>— {result.quote.author} ({result.quote.source})</p>
          <hr />
          <p><strong>Búsqueda musical:</strong> {result.musicSearchQuery}</p>
        </div>
      )}
    </div>
  )
}

export default App