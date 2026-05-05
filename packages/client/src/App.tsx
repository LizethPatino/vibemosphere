import { useState } from 'react';
import type { MoodResponse } from '@vibemosphere/shared';
import musicTexture from './assets/music-texture.png';
import nightTexture from './assets/night-texture.png';
import { UploadScreen } from './screens/UploadScreen';
import { ResultScreen } from './screens/ResultScreen';
import { FeedbackScreen } from './screens/FeedbackScreen';

function formatJournalDate(now: Date) {
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = String(now.getFullYear());
  const iso = `${yyyy}-${mm}-${dd}`;
  const dmy = `${dd}/${mm}/${yyyy}`;
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(now);
  return { iso, dmy, weekday };
}

function getSessionId(): string {
  let sessionId = localStorage.getItem('vibe_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('vibe_session_id', sessionId);
  }
  return sessionId;
}

function App() {
  const [screen, setScreen] = useState<'upload' | 'result' | 'feedback'>('upload');
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<MoodResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refinementInput, setRefinementInput] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setScreen('upload');
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
      setScreen('result');
    } catch (error) {
      console.error("Connection error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async (
    feedbackType: 'yes' | 'refined' | 'own',
    note: string,
    ownTitle: string,
    refineInput: string
  ): Promise<void> => {
    if (!image || !result) return;
    const sessionId = getSessionId();
    try {
      await fetch('http://localhost:3001/api/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
        },
        body: JSON.stringify({
          image,
          vibeData: result,
          feedback: {
            type: feedbackType,
            note,
            ownTitle,
            refineInput: refineInput || refinementInput,
          },
        }),
      });
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleGoToFeedback = () => setScreen('feedback');

  const handleRefined = (newResult: MoodResponse, input: string) => {
    setResult(newResult);
    setRefinementInput(input);
    setScreen('result');
  };

  const handleRestart = () => {
    setScreen('upload');
    setImage(null);
    setResult(null);
    setRefinementInput('');
  };

  const { iso, dmy, weekday } = formatJournalDate(new Date());

  if (screen === 'result' && image && result) {
    return (
      <ResultScreen
        iso={iso}
        dmy={dmy}
        weekday={weekday}
        nightTexture={nightTexture}
        musicTexture={musicTexture}
        image={image}
        result={result}
        onGoToFeedback={handleGoToFeedback}
      />
    );
  }

  if (screen === 'feedback' && image && result) {
    return (
      <FeedbackScreen
        iso={iso}
        dmy={dmy}
        weekday={weekday}
        nightTexture={nightTexture}
        musicTexture={musicTexture}
        image={image}
        result={result}
        onRestart={handleRestart}
        onSave={saveEntry}
        onRefined={handleRefined}
        refinementInput={refinementInput}
      />
    );
  }

  return (
    <UploadScreen
      iso={iso}
      dmy={dmy}
      weekday={weekday}
      nightTexture={nightTexture}
      musicTexture={musicTexture}
      image={image}
      loading={loading}
      onImageChange={handleImageChange}
      onAnalyze={analyzeVibe}
    />
  );
}

export default App