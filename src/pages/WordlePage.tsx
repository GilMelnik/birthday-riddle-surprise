import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { RomanticButton } from '@/components/ui/romantic-button';
import { ChevronRight, Delete, CornerDownLeft, RotateCcw } from 'lucide-react';
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

  const reverseWord = (word: string): string => Array.from(word).reverse().join('');
  const targetWord = reverseWord(puzzleData.wordle[0].word);
  const wordLength = 5;
  const maxAttempts = 6;

  const [attempts, setAttempts] = useState<LetterState[][]>([]);
  const [currentAttempt, setCurrentAttempt] = useState<string[]>(Array(wordLength).fill(''));
  const [keyboardStatus, setKeyboardStatus] = useState<Record<string, LetterStatus>>({});
  const [message, setMessage] = useState<string | null>(null);

  // --- Responsive sizing: keep the grid + keyboard within the screen ---
  const [containerWidthPx, setContainerWidthPx] = useState<number>(0);
  const [containerHeightPx, setContainerHeightPx] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setContainerWidthPx(rect.width);
      setContainerHeightPx(rect.height);
    };

    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const getScaleForViewportHeight = () => {
    // We estimate required height and downscale if it doesn't fit.
    // This keeps everything visible without vertical scrolling.
    const h = containerHeightPx || (typeof window !== 'undefined' ? window.innerHeight : 700);

    // Conservative fixed heights for header+message areas.
    const headerAndChromePx = 160;

    // Baseline sizes (roughly Tailwind defaults used here)
    const gridRows = maxAttempts;
    const gridGapY = 8; // space-y-2

    const keyboardRowGapsY = 8; // space-y-2

    const boxPx = 56;
    const keyH = 48; // h-12

    const gridHeight = gridRows * boxPx + Math.max(0, gridRows - 1) * gridGapY;
    const keyboardHeight = 3 * keyH + 2 * keyboardRowGapsY;

    // Add a bit for the bottom CTA (solved state) and breathing room.
    const baselineTotal = headerAndChromePx + gridHeight + keyboardHeight + 32;

    // Scale down only if needed.
    return clampNumber(h / baselineTotal, 0.68, 1);
  };

  const getScaledGapClass = () => {
    const s = getScaleForViewportHeight();
    return s < 0.82 ? 'gap-1' : 'gap-2';
  };

  const getScaledGridGapYClass = () => {
    const s = getScaleForViewportHeight();
    return s < 0.82 ? 'space-y-1.5' : 'space-y-2';
  };

  const getWordleBoxPx = () => {
    const scale = getScaleForViewportHeight();

    // Use a smaller gap on very small screens.
    const gapPx = scale < 0.82 ? 4 : 8;

    const maxBoxPx = Math.floor(56 * scale);
    const minBoxPx = 14;

    const safetyPx = 2;
    const availablePx = Math.max(0, (containerWidthPx || 0) - safetyPx);
    const gapsPx = Math.max(0, wordLength - 1) * gapPx;

    const rawPx = (availablePx - gapsPx) / wordLength;
    return clampNumber(Math.floor(rawPx), minBoxPx, maxBoxPx);
  };

  const getWordleLetterBoxStyle = (): React.CSSProperties => {
    const scale = getScaleForViewportHeight();
    const boxPx = getWordleBoxPx();
    const fontPx = clampNumber(Math.round(boxPx * 0.55), 10, 26);

    // Keep square look (avoid circles) even when small.
    const radiusPx = clampNumber(Math.round(boxPx * 0.16), 4, Math.max(6, Math.round(12 * scale)));

    return {
      width: `${boxPx}px`,
      height: `${boxPx}px`,
      fontSize: `${fontPx}px`,
      borderRadius: `${radiusPx}px`,
    };
  };

  const getKeyboardLayoutRowLengths = () => {
    // Row 1 includes letters plus backspace
    const row1 = HEBREW_KEYBOARD[0].length + 1;
    const row2 = HEBREW_KEYBOARD[1].length;
    const row3 = HEBREW_KEYBOARD[2].length + 1; // includes enter
    return { row1, row2, row3, max: Math.max(row1, row2, row3) };
  };

  const getKeyboardGapPx = () => {
    const scale = getScaleForViewportHeight();
    // Tailwind gap-1 ~ 4px; shrink slightly on tiny screens.
    return scale < 0.78 ? 2 : 4;
  };

  const getKeyboardKeyMinWidthPx = () => {
    // The .keyboard-key class sets min-w-[2.5rem] (40px). On very small screens
    // that can overflow horizontally for 10 keys; we override via inline minWidth.
    const { max } = getKeyboardLayoutRowLengths();
    const gapPx = getKeyboardGapPx();

    const containerPx = containerWidthPx || 0;
    const safetyPx = 2;
    const availablePx = Math.max(0, containerPx - safetyPx);
    const gapsPx = Math.max(0, max - 1) * gapPx;

    const raw = (availablePx - gapsPx) / Math.max(1, max);

    // Keep usable tap target but allow shrinking further if required.
    return clampNumber(Math.floor(raw), 22, 48);
  };

  const getKeyboardKeyStyle = (): React.CSSProperties => {
    const scale = getScaleForViewportHeight();

    const heightPx = clampNumber(Math.round(48 * scale), 30, 48);
    const fontPx = clampNumber(Math.round(18 * scale), 11, 18);
    const radiusPx = clampNumber(Math.round(12 * scale), 6, 12);

    return {
      height: `${heightPx}px`,
      minWidth: `${getKeyboardKeyMinWidthPx()}px`,
      fontSize: `${fontPx}px`,
      borderRadius: `${radiusPx}px`,
      lineHeight: 1,
      paddingLeft: scale < 0.78 ? '0.35rem' : undefined,
      paddingRight: scale < 0.78 ? '0.35rem' : undefined,
    };
  };

  const getKeyboardIconStyle = (): React.CSSProperties => {
    const scale = getScaleForViewportHeight();
    const size = clampNumber(Math.round(20 * scale), 14, 20);
    return { width: `${size}px`, height: `${size}px` };
  };

  const getKeyboardRowClassName = () => {
    // Use inline gap style for more granular control than Tailwind classes.
    return "flex justify-center flex-row-reverse";
  };

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
    if (progress.solved || progress.failed || attempts.length >= maxAttempts) return;

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
    }
  }, [currentAttempt, wordLength, progress.solved, progress.failed, attempts.length]);

  const handleBackspace = useCallback(() => {
    if (progress.solved || progress.failed) return;

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
    }
  }, [currentAttempt, wordLength, progress.solved, progress.failed]);

  const restartWordle = useCallback(() => {
    setAttempts([]);
    setCurrentAttempt(Array(wordLength).fill(''));
    setKeyboardStatus({});
    setMessage(null);

    updateWordleProgress({
      solved: false,
      failed: false,
      attempts: [],
      currentAttempt: '',
    });
  }, [updateWordleProgress, wordLength]);

  const handleSubmit = useCallback(() => {
    if (progress.solved || progress.failed) return;

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
      updateWordleProgress({ solved: true, failed: false });
      setMessage('מצוין! פיצחת את המילה! 🎉');
    } else if (newAttempts.length >= maxAttempts) {
      updateWordleProgress({ failed: true });
      setMessage('לא הצלחת הפעם. רוצה לנסות שוב?');
    }

    setCurrentAttempt(Array(wordLength).fill(''));
  }, [currentAttempt, wordLength, attempts, keyboardStatus, progress.attempts, progress.solved, progress.failed]);

  // Keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (progress.solved || progress.failed) return;

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
  }, [handleSubmit, handleBackspace, handleKeyPress, progress.solved, progress.failed]);

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
      <div
        ref={containerRef}
        className="w-full mx-auto max-w-[min(28rem,100vw-2rem)] flex-1 flex flex-col"
      >
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

        {/* Grid + Keyboard (keep together) */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Game grid */}
          <div className="mb-3">
            <div className={getScaledGridGapYClass()}>
              {Array.from({ length: maxAttempts }).map((_, rowIndex) => {
                const isCurrentRow = rowIndex === attempts.length;
                const attempt = attempts[rowIndex];
                const boxStyle = getWordleLetterBoxStyle();
                const rowGapClass = getScaledGapClass();

                return (
                  <div
                    key={rowIndex}
                    className={`flex justify-center ${rowGapClass} flex-row-reverse`}
                  >
                    {Array.from({ length: wordLength }).map((_, colIndex) => {
                      let letter = '';
                      let boxClass = 'letter-box-empty';

                      if (attempt) {
                        letter = attempt[colIndex]?.letter || '';
                        boxClass = getBoxClass(attempt[colIndex]?.status || 'default');
                      } else if (isCurrentRow && !progress.failed && !progress.solved) {
                        letter = getDisplayLetter(colIndex);
                        boxClass = letter ? 'letter-box-filled' : 'letter-box-empty';
                      }

                      return (
                        <div
                          key={colIndex}
                          className={`letter-box ${boxClass}`}
                          style={boxStyle}
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
          {!progress.solved && !progress.failed && attempts.length < maxAttempts && (
            <div className="space-y-2 pb-4">
              {/* Row 1: letters + backspace */}
              <div className={getKeyboardRowClassName()} style={{ gap: `${getKeyboardGapPx()}px` }}>
                {HEBREW_KEYBOARD[0].map((letter) => (
                  <button
                    key={letter}
                    onClick={() => handleKeyPress(letter)}
                    className={`keyboard-key ${getKeyClass(letter)}`}
                    style={getKeyboardKeyStyle()}
                  >
                    {letter}
                  </button>
                ))}
                <button
                  onClick={handleBackspace}
                  className="keyboard-key keyboard-key-default"
                  style={getKeyboardKeyStyle()}
                >
                  <Delete style={getKeyboardIconStyle()} />
                </button>
              </div>

              {/* Row 2: letters only */}
              <div className={getKeyboardRowClassName()} style={{ gap: `${getKeyboardGapPx()}px` }}>
                {HEBREW_KEYBOARD[1].map((letter) => (
                  <button
                    key={letter}
                    onClick={() => handleKeyPress(letter)}
                    className={`keyboard-key ${getKeyClass(letter)}`}
                    style={getKeyboardKeyStyle()}
                  >
                    {letter}
                  </button>
                ))}
              </div>

              {/* Row 3: letters + enter */}
              <div className={getKeyboardRowClassName()} style={{ gap: `${getKeyboardGapPx()}px` }}>
                {HEBREW_KEYBOARD[2].map((letter) => (
                  <button
                    key={letter}
                    onClick={() => handleKeyPress(letter)}
                    className={`keyboard-key ${getKeyClass(letter)}`}
                    style={getKeyboardKeyStyle()}
                  >
                    {letter}
                  </button>
                ))}
                <button
                  onClick={handleSubmit}
                  className="keyboard-key keyboard-key-default"
                  style={getKeyboardKeyStyle()}
                >
                  <CornerDownLeft style={getKeyboardIconStyle()} />
                </button>
              </div>
            </div>
          )}

          {progress.failed && !progress.solved && (
            <div className="pb-4">
              <RomanticButton
                variant="gold"
                size="default"
                className="w-full"
                onClick={restartWordle}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  נסה שוב (איפוס 5 אותיות)
                </span>
              </RomanticButton>
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
    </div>
  );
};

export default WordlePage;
