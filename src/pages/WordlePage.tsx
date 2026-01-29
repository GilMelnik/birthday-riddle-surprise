import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import { RomanticButton } from '@/components/ui/romantic-button';
import { ChevronRight, Delete } from 'lucide-react';
import puzzleData from '@/data/puzzles.json';

type LetterStatus = 'default' | 'correct' | 'wrong-place' | 'wrong';

interface LetterState {
  letter: string;
  status: LetterStatus;
}

const HEBREW_KEYBOARD = [
  ['ק', 'ר', 'א', 'ט', 'ו', 'ן', 'ם', 'פ'],
  ['ש', 'ד', 'ג', 'כ', 'ע', 'י', 'ח', 'ל', 'ך', 'ף'],
  ['ז', 'ס', 'ב', 'ה', 'נ', 'מ', 'צ', 'ת', 'ץ'],
];

const WordlePage: React.FC = () => {
  const { state, setCurrentPage, updateWordleProgress } = useGame();
  const { wordle: progress } = state.progress;
  
  const targetWord = puzzleData.wordle[0].word;
  const wordLength = targetWord.length;
  const maxAttempts = 6;

  const [attempts, setAttempts] = useState<LetterState[][]>([]);
  const [currentAttempt, setCurrentAttempt] = useState('');
  const [keyboardStatus, setKeyboardStatus] = useState<Record<string, LetterStatus>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    // Restore state from progress
    if (progress.attempts.length > 0) {
      const restoredAttempts = progress.attempts.map(word => 
        evaluateWord(word)
      );
      setAttempts(restoredAttempts);
      
      // Rebuild keyboard status
      const newKeyboardStatus: Record<string, LetterStatus> = {};
      progress.attempts.forEach(word => {
        const evaluated = evaluateWord(word);
        evaluated.forEach(({ letter, status }) => {
          const current = newKeyboardStatus[letter];
          if (!current || getPriority(status) > getPriority(current)) {
            newKeyboardStatus[letter] = status;
          }
        });
      });
      setKeyboardStatus(newKeyboardStatus);
    }
  }, []);

  const getPriority = (status: LetterStatus): number => {
    switch (status) {
      case 'correct': return 3;
      case 'wrong-place': return 2;
      case 'wrong': return 1;
      default: return 0;
    }
  };

  const evaluateWord = (word: string): LetterState[] => {
    const result: LetterState[] = [];
    const targetLetters = targetWord.split('');
    const usedIndices = new Set<number>();

    // First pass: find exact matches
    word.split('').forEach((letter, i) => {
      if (letter === targetLetters[i]) {
        result[i] = { letter, status: 'correct' };
        usedIndices.add(i);
      }
    });

    // Second pass: find wrong positions
    word.split('').forEach((letter, i) => {
      if (result[i]) return;
      
      const targetIndex = targetLetters.findIndex((t, j) => 
        t === letter && !usedIndices.has(j)
      );
      
      if (targetIndex !== -1) {
        result[i] = { letter, status: 'wrong-place' };
        usedIndices.add(targetIndex);
      } else {
        result[i] = { letter, status: 'wrong' };
      }
    });

    return result;
  };

  const handleKeyPress = useCallback((letter: string) => {
    if (progress.solved || attempts.length >= maxAttempts) return;
    
    if (currentAttempt.length < wordLength) {
      setCurrentAttempt(prev => prev + letter);
    }
  }, [currentAttempt, wordLength, progress.solved, attempts.length]);

  const handleBackspace = useCallback(() => {
    setCurrentAttempt(prev => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(() => {
    if (currentAttempt.length !== wordLength) {
      setMessage('הכנס מילה בת ' + wordLength + ' אותיות');
      setShake(true);
      setTimeout(() => {
        setMessage(null);
        setShake(false);
      }, 1500);
      return;
    }

    const evaluated = evaluateWord(currentAttempt);
    const newAttempts = [...attempts, evaluated];
    setAttempts(newAttempts);

    // Update keyboard status
    const newKeyboardStatus = { ...keyboardStatus };
    evaluated.forEach(({ letter, status }) => {
      const current = newKeyboardStatus[letter];
      if (!current || getPriority(status) > getPriority(current)) {
        newKeyboardStatus[letter] = status;
      }
    });
    setKeyboardStatus(newKeyboardStatus);

    // Save to progress
    updateWordleProgress({
      attempts: [...progress.attempts, currentAttempt],
    });

    // Check win condition
    if (currentAttempt === targetWord) {
      updateWordleProgress({ solved: true });
      setMessage('מצוין! פיצחת את המילה! 🎉');
    } else if (newAttempts.length >= maxAttempts) {
      setMessage(`המילה הייתה: ${targetWord}`);
    }

    setCurrentAttempt('');
  }, [currentAttempt, wordLength, attempts, keyboardStatus, progress.attempts]);

  // Keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (progress.solved) return;
      
      if (e.key === 'Enter') {
        handleSubmit();
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (/^[\u0590-\u05FF]$/.test(e.key)) {
        handleKeyPress(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, handleBackspace, handleKeyPress, progress.solved]);

  const getBoxClass = (status: LetterStatus) => {
    switch (status) {
      case 'correct': return 'letter-box-correct';
      case 'wrong-place': return 'letter-box-wrong-place';
      case 'wrong': return 'letter-box-wrong';
      default: return 'letter-box-empty';
    }
  };

  const getKeyClass = (letter: string) => {
    const status = keyboardStatus[letter];
    switch (status) {
      case 'correct': return 'keyboard-key-correct';
      case 'wrong-place': return 'keyboard-key-wrong-place';
      case 'wrong': return 'keyboard-key-wrong';
      default: return 'keyboard-key-default';
    }
  };

  return (
    <div className="min-h-screen romantic-gradient px-4 py-6 flex flex-col">
      <div className="max-w-md mx-auto flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentPage('hub')}
            className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
            חזרה
          </button>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            📝 5 אותיות
          </h1>
          <div className="w-16" />
        </div>

        {/* Message */}
        {message && (
          <div className="text-center p-3 rounded-lg mb-4 bg-card border border-border animate-scale-in">
            {message}
          </div>
        )}

        {/* Game grid */}
        <div className="flex-1 flex flex-col justify-center mb-4">
          <div className="space-y-2">
            {Array.from({ length: maxAttempts }).map((_, rowIndex) => {
              const isCurrentRow = rowIndex === attempts.length;
              const attempt = attempts[rowIndex];
              
              return (
                <div
                  key={rowIndex}
                  className={`flex justify-center gap-2 flex-row-reverse ${
                    isCurrentRow && shake ? 'shake' : ''
                  }`}
                >
                  {Array.from({ length: wordLength }).map((_, colIndex) => {
                    let letter = '';
                    let boxClass = 'letter-box-empty';
                    
                    if (attempt) {
                      letter = attempt[colIndex].letter;
                      boxClass = getBoxClass(attempt[colIndex].status);
                    } else if (isCurrentRow && currentAttempt[colIndex]) {
                      letter = currentAttempt[colIndex];
                      boxClass = 'letter-box-filled';
                    }
                    
                    return (
                      <div
                        key={colIndex}
                        className={`letter-box ${boxClass} ${
                          attempt ? 'animate-scale-in' : ''
                        }`}
                        style={{ animationDelay: `${colIndex * 0.1}s` }}
                      >
                        {letter}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Keyboard */}
        {!progress.solved && attempts.length < maxAttempts && (
          <div className="space-y-2 pb-4">
            {HEBREW_KEYBOARD.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-1">
                {rowIndex === 2 && (
                  <button
                    onClick={handleSubmit}
                    className="keyboard-key keyboard-key-default px-3 text-sm"
                  >
                    אישור
                  </button>
                )}
                {row.map((letter) => (
                  <button
                    key={letter}
                    onClick={() => handleKeyPress(letter)}
                    className={`keyboard-key ${getKeyClass(letter)}`}
                  >
                    {letter}
                  </button>
                ))}
                {rowIndex === 2 && (
                  <button
                    onClick={handleBackspace}
                    className="keyboard-key keyboard-key-default px-3"
                  >
                    <Delete className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {progress.solved && (
          <div className="pb-4">
            <RomanticButton
              variant="gold"
              size="default"
              className="w-full"
              onClick={() => setCurrentPage('hub')}
            >
              הושלם! חזרה למרכז 🎉
            </RomanticButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default WordlePage;
