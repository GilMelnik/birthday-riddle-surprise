import React, { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import { RomanticButton } from '@/components/ui/romantic-button';
import { ChevronRight, Delete, CornerDownLeft } from 'lucide-react';
import puzzleData from '@/data/puzzles.json';

type LetterStatus = 'default' | 'correct' | 'wrong-place' | 'wrong';

interface LetterState {
  letter: string;
  status: LetterStatus;
}

// Final form mappings
const FINAL_FORMS: Record<string, string> = {
  'מ': 'ם',
  'נ': 'ן',
  'צ': 'ץ',
  'פ': 'ף',
  'כ': 'ך',
};

const REGULAR_FORMS: Record<string, string> = {
  'ם': 'מ',
  'ן': 'נ',
  'ץ': 'צ',
  'ף': 'פ',
  'ך': 'כ',
};

// Keyboard layout - NO final letters, RTL display order
const HEBREW_KEYBOARD = [
  ['ק', 'ר', 'א', 'ט', 'ו', 'פ'],
  ['ש', 'ד', 'ג', 'כ', 'ע', 'י', 'ח', 'ל'],
  ['ז', 'ס', 'ב', 'ה', 'נ', 'מ', 'צ', 'ת'],
];

const WordlePage: React.FC = () => {
  const { state, setCurrentPage, updateWordleProgress } = useGame();
  const { wordle: progress } = state.progress;
  
  const targetWord = puzzleData.wordle[0].word;
  const wordLength = 5;
  const maxAttempts = 6;

  const [attempts, setAttempts] = useState<LetterState[][]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<string[]>(Array(wordLength).fill(''));
  const [cursorPosition, setCursorPosition] = useState(wordLength - 1); // Start at rightmost
  const [keyboardStatus, setKeyboardStatus] = useState<Record<string, LetterStatus>>({});
  const [message, setMessage] = useState<string | null>(null);

  // Normalize word for comparison (convert final forms to regular)
  const normalizeWord = (word: string): string => {
    return word.split('').map(letter => REGULAR_FORMS[letter] || letter).join('');
  };

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
          const normalLetter = REGULAR_FORMS[letter] || letter;
          const current = newKeyboardStatus[normalLetter];
          if (!current || getPriority(status) > getPriority(current)) {
            newKeyboardStatus[normalLetter] = status;
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
    const normalizedTarget = normalizeWord(targetWord);
    const normalizedWord = normalizeWord(word);
    const targetLetters = normalizedTarget.split('');
    const usedIndices = new Set<number>();

    // First pass: find exact matches
    normalizedWord.split('').forEach((letter, i) => {
      if (letter === targetLetters[i]) {
        result[i] = { letter: word[i], status: 'correct' };
        usedIndices.add(i);
      }
    });

    // Second pass: find wrong positions
    normalizedWord.split('').forEach((letter, i) => {
      if (result[i]) return;
      
      const targetIndex = targetLetters.findIndex((t, j) => 
        t === letter && !usedIndices.has(j)
      );
      
      if (targetIndex !== -1) {
        result[i] = { letter: word[i], status: 'wrong-place' };
        usedIndices.add(targetIndex);
      } else {
        result[i] = { letter: word[i], status: 'wrong' };
      }
    });

    return result;
  };

  // Apply final forms ONLY to the LAST FILLED position (not just index 4)
  const applyFinalForms = (letters: string[]): string => {
    // Find the last filled position (leftmost visually in RTL, which is lowest index with content)
    let lastFilledIndex = -1;
    for (let i = 0; i < letters.length; i++) {
      if (letters[i]) {
        lastFilledIndex = i;
        break; // First filled from left (index 0) is the last letter visually in RTL
      }
    }
    
    return letters.map((letter, i) => {
      // Apply final form only to the last filled position (index 0 when full in RTL fill order)
      if (i === lastFilledIndex && FINAL_FORMS[letter]) {
        return FINAL_FORMS[letter];
      }
      return letter;
    }).join('');
  };

  const handleKeyPress = useCallback((letter: string) => {
    if (progress.solved || attempts.length >= maxAttempts) return;
    
    // Find rightmost empty cell
    let insertPos = -1;
    for (let i = wordLength - 1; i >= 0; i--) {
      if (!currentAttempt[i]) {
        insertPos = i;
        break;
      }
    }
    
    if (insertPos !== -1) {
      const newAttempt = [...currentAttempt];
      newAttempt[insertPos] = letter;
      setCurrentAttempt(newAttempt);
      setCursorPosition(insertPos - 1);
    }
  }, [currentAttempt, wordLength, progress.solved, attempts.length]);

  const handleBackspace = useCallback(() => {
    // Find leftmost filled cell (most recently entered in RTL)
    let removePos = -1;
    for (let i = 0; i < wordLength; i++) {
      if (currentAttempt[i]) {
        removePos = i;
        break;
      }
    }
    
    if (removePos !== -1) {
      const newAttempt = [...currentAttempt];
      newAttempt[removePos] = '';
      setCurrentAttempt(newAttempt);
      setCursorPosition(removePos);
    }
  }, [currentAttempt, wordLength]);

  const handleSubmit = useCallback(() => {
    const filledCount = currentAttempt.filter(l => l).length;
    if (filledCount !== wordLength) {
      setMessage('הכנס מילה בת ' + wordLength + ' אותיות');
      setTimeout(() => setMessage(null), 1500);
      return;
    }

    const wordWithFinals = applyFinalForms(currentAttempt);
    const evaluated = evaluateWord(wordWithFinals);
    const newAttempts = [...attempts, evaluated];
    setAttempts(newAttempts);

    // Update keyboard status
    const newKeyboardStatus = { ...keyboardStatus };
    evaluated.forEach(({ letter, status }) => {
      const normalLetter = REGULAR_FORMS[letter] || letter;
      const current = newKeyboardStatus[normalLetter];
      if (!current || getPriority(status) > getPriority(current)) {
        newKeyboardStatus[normalLetter] = status;
      }
    });
    setKeyboardStatus(newKeyboardStatus);

    // Save to progress
    updateWordleProgress({
      attempts: [...progress.attempts, wordWithFinals],
    });

    // Check win condition - direct comparison, NO reversal
    // Normalize both to handle final/regular form differences
    if (normalizeWord(wordWithFinals) === normalizeWord(targetWord)) {
      updateWordleProgress({ solved: true });
      setMessage('מצוין! פיצחת את המילה! 🎉');
    } else if (newAttempts.length >= maxAttempts) {
      setMessage(`המילה הייתה: ${targetWord}`);
    }

    setCurrentAttempt(Array(wordLength).fill(''));
    setCursorPosition(wordLength - 1);
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
        // Convert final forms to regular when typing
        const normalLetter = REGULAR_FORMS[e.key] || e.key;
        handleKeyPress(normalLetter);
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

  // Get display letter with final form for the LAST filled position only (when row is full)
  const getDisplayLetter = (index: number): string => {
    const letter = currentAttempt[index];
    if (!letter) return '';
    
    const filledCount = currentAttempt.filter(l => l).length;
    // Only apply final form when row is completely full, and only to index 0 (last letter in RTL)
    if (filledCount === wordLength && index === 0 && FINAL_FORMS[letter]) {
      return FINAL_FORMS[letter];
    }
    return letter;
  };

  return (
    <div className="min-h-screen romantic-gradient px-4 py-6 flex flex-col">
      <div className="max-w-md mx-auto flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentPage('hub')}
            className="flex items-center gap-1 text-primary"
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
          <div className="text-center p-3 rounded-lg mb-4 bg-card border border-border">
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
                  className="flex justify-center gap-2 flex-row-reverse"
                >
                  {Array.from({ length: wordLength }).map((_, colIndex) => {
                    let letter = '';
                    let boxClass = 'letter-box-empty';
                    
                    if (attempt) {
                      letter = attempt[colIndex]?.letter || '';
                      boxClass = getBoxClass(attempt[colIndex]?.status || 'default');
                    } else if (isCurrentRow) {
                      letter = getDisplayLetter(colIndex);
                      boxClass = letter ? 'letter-box-filled' : 'letter-box-empty';
                    }
                    
                    return (
                      <div
                        key={colIndex}
                        className={`letter-box ${boxClass}`}
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
            {/* Row 1: letters + backspace */}
            <div className="flex justify-center gap-1 flex-row-reverse">
              {HEBREW_KEYBOARD[0].map((letter) => (
                <button
                  key={letter}
                  onClick={() => handleKeyPress(letter)}
                  className={`keyboard-key ${getKeyClass(letter)}`}
                >
                  {letter}
                </button>
              ))}
              <button
                onClick={handleBackspace}
                className="keyboard-key keyboard-key-default px-3"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
            
            {/* Row 2: letters only */}
            <div className="flex justify-center gap-1 flex-row-reverse">
              {HEBREW_KEYBOARD[1].map((letter) => (
                <button
                  key={letter}
                  onClick={() => handleKeyPress(letter)}
                  className={`keyboard-key ${getKeyClass(letter)}`}
                >
                  {letter}
                </button>
              ))}
            </div>
            
            {/* Row 3: letters + enter */}
            <div className="flex justify-center gap-1 flex-row-reverse">
              {HEBREW_KEYBOARD[2].map((letter) => (
                <button
                  key={letter}
                  onClick={() => handleKeyPress(letter)}
                  className={`keyboard-key ${getKeyClass(letter)}`}
                >
                  {letter}
                </button>
              ))}
              <button
                onClick={handleSubmit}
                className="keyboard-key keyboard-key-default px-3"
              >
                <CornerDownLeft className="w-5 h-5" />
              </button>
            </div>
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
