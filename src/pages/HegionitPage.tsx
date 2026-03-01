import { useState, useEffect, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { RomanticButton } from '@/components/ui/romantic-button';
import { ArrowRight, ArrowLeft, ChevronRight, Lightbulb, Check, X } from 'lucide-react';
import puzzleData from '@/data/puzzles.json';

const reverseString = (value: string) => value.split('').reverse().join('');

const HegionitPage: React.FC = () => {
  const { state, setCurrentPage, updateHegionitProgress } = useGame();
  const { hegionit: progress } = state.progress;
  
  const riddles = puzzleData.hegionit;
  const currentRiddleIndex = progress.currentRiddle;
  const currentRiddle = riddles[currentRiddleIndex];
  const normalizedAnswer = reverseString(currentRiddle.answer);

  const [inputLetters, setInputLetters] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [lockedIndices, setLockedIndices] = useState<Set<number>>(new Set());
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const didInitForRiddle = useRef<number | null>(null);

  // Persisting partially-filled answers as a raw string can lose positional empties ("holes")
  // and cause letters to shift on restore. Encode empties with a sentinel so the saved
  // string is always the correct length and round-trips safely.
  const EMPTY_SENTINEL = '\u0000';
  const encodeAnswer = (letters: string[]) => letters.map(ch => (ch && ch.length ? ch : EMPTY_SENTINEL)).join('');
  const decodeAnswer = (saved: string) => saved.split('').map(ch => (ch === EMPTY_SENTINEL ? '' : ch));

  // Helper to get answer without spaces
  const getAnswerWithoutSpaces = () => normalizedAnswer.replace(/ /g, '');

  // --- Reading-order + Hebrew final-letter helpers ---
  // Storage indices (0..N-1) correspond to the answer with spaces removed, in logical word order.
  // Reading order for navigation/hints is: word1 letters right-to-left, then word2 letters right-to-left, etc.
  const getLogicalWordSegments = () => {
    const words = normalizedAnswer.split(' ');
    const segments: { word: string; startIndex: number; endIndex: number }[] = [];
    let cursor = 0;
    for (const word of words) {
      const startIndex = cursor;
      const endIndex = cursor + word.length - 1;
      segments.push({ word, startIndex, endIndex });
      cursor += word.length;
    }
    return segments;
  };

  const getReadingOrderIndices = () => {
    const segments = getLogicalWordSegments();
    const indices: number[] = [];
    for (const seg of segments) {
      for (let i = seg.endIndex; i >= seg.startIndex; i--) indices.push(i);
    }
    return indices;
  };

  const isEndOfWordIndex = (index: number) => {
    const segments = getLogicalWordSegments();
    // In the UI each word is rendered RTL. The *end* of the word visually is the leftmost box,
    // which corresponds to the first character in the string => startIndex in our flat storage.
    return segments.some(seg => seg.startIndex === index);
  };

  const FINAL_FORMS: Record<string, string> = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
  const REGULAR_FORMS: Record<string, string> = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

  const normalizeHebrewFinalForm = (raw: string, index: number) => {
    const ch = raw.trim().slice(-1);
    if (!ch) return '';

    const endOfWord = isEndOfWordIndex(index);

    if (endOfWord) {
      // End of word: force final form where applicable
      if (FINAL_FORMS[ch]) return FINAL_FORMS[ch];
      return ch;
    }

    // Not end of word: force regular form (if user typed the final)
    if (REGULAR_FORMS[ch]) return REGULAR_FORMS[ch];
    return ch;
  };

  const getPrevIndexInReadingOrder = (fromIndex: number) => {
    const order = getReadingOrderIndices();
    const pos = order.indexOf(fromIndex);
    if (pos <= 0) return null;

    for (let p = pos - 1; p >= 0; p--) {
      const i = order[p];
      if (!lockedIndices.has(i)) return i;
    }

    return null;
  };

  const getCorrectIndices = (letters: string[], answerWithoutSpaces: string) => {
    const matches: number[] = [];
    for (let i = 0; i < letters.length && i < answerWithoutSpaces.length; i++) {
      if (letters[i] && letters[i] === answerWithoutSpaces[i]) {
        matches.push(i);
      }
    }
    return matches;
  };

  useEffect(() => {
    // Remove spaces from answer to get the actual input length
    const answerWithoutSpaces = getAnswerWithoutSpaces();
    const answerLength = answerWithoutSpaces.length;

    // When revisiting the same unsolved riddle, don't re-initialize on unrelated rerenders.
    // We *do* want to re-init when switching riddles, or when the puzzle becomes solved.
    const isSolved = progress.solved[currentRiddleIndex];
    if (!isSolved && didInitForRiddle.current === currentRiddleIndex) {
      return;
    }

    // If puzzle is already solved, restore the exact solved state
    if (isSolved) {
      const savedSolvedLetters = progress.solvedLetters?.[currentRiddleIndex];
      if (savedSolvedLetters && savedSolvedLetters.length === answerLength) {
        setInputLetters([...savedSolvedLetters]);
        // Lock ALL boxes for solved puzzles
        const allLocked = new Set<number>();
        for (let i = 0; i < answerLength; i++) {
          allLocked.add(i);
        }
        setLockedIndices(allLocked);
        setMessage(null);
        didInitForRiddle.current = currentRiddleIndex;
        return;
      }
    }

    // Not solved - restore typed letters (even if partial) and then apply hinted/locked letters
    const savedAnswer = progress.answers?.[currentRiddleIndex] ?? '';
    const newLetters = Array<string>(answerLength).fill('');

    // Seed from whatever was saved so far, decoding sentinel empties.
    const decoded = decodeAnswer(savedAnswer);
    for (let i = 0; i < Math.min(decoded.length, answerLength); i++) {
      newLetters[i] = decoded[i] ?? '';
    }

    // Restore ONLY hinted indices - these are the boxes that should be locked and filled
    const savedLocked = progress.lockedIndices?.[currentRiddleIndex] || [];
    const locked = new Set<number>();

    // Hints always win at their indices (and we ensure correct final form)
    savedLocked.forEach((i: number) => {
      if (i >= 0 && i < answerLength) {
        newLetters[i] = normalizeHebrewFinalForm(answerWithoutSpaces[i] ?? '', i);
        locked.add(i);
      }
    });

    setInputLetters(newLetters);
    setLockedIndices(locked);
    setMessage(null);
    didInitForRiddle.current = currentRiddleIndex;
  }, [
    currentRiddleIndex,
    normalizedAnswer,
    progress.solved,
    progress.solvedLetters,
    progress.lockedIndices,
  ]);

  const handleLetterChange = (index: number, value: string) => {
    if (progress.solved[currentRiddleIndex]) return;
    if (lockedIndices.has(index)) return;

    const normalized = normalizeHebrewFinalForm(value, index);

    const newLetters = [...inputLetters];
    newLetters[index] = normalized;
    setInputLetters(newLetters);

    updateHegionitProgress({
      answers: progress.answers.map((a, i) =>
        i === currentRiddleIndex ? encodeAnswer(newLetters) : a
      ),
    });

    // Auto-focus next empty box in reading order (across lines/words)
    if (normalized) {
      // Prefer the next empty, non-locked box in reading order.
      const order = getReadingOrderIndices();
      const pos = order.indexOf(index);
      if (pos !== -1) {
        for (let p = pos + 1; p < order.length; p++) {
          const nextIndex = order[p];
          if (!lockedIndices.has(nextIndex) && !newLetters[nextIndex]) {
            inputRefs.current[nextIndex]?.focus();
            break;
          }
        }
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (lockedIndices.has(index) && e.key !== 'Tab') {
      e.preventDefault();
      return;
    }

    if (e.key === 'Backspace') {
      // Smooth backspace (treat all boxes like continuous text):
      // If current is empty -> move to previous and delete it in the same action.
      if (!inputLetters[index]) {
        e.preventDefault();

        const prevIndex = getPrevIndexInReadingOrder(index);
        if (prevIndex === null) return;

        const newLetters = [...inputLetters];
        if (!lockedIndices.has(prevIndex)) {
          newLetters[prevIndex] = '';
          setInputLetters(newLetters);
          updateHegionitProgress({
            answers: progress.answers.map((a, i) =>
              i === currentRiddleIndex ? encodeAnswer(newLetters) : a
            ),
          });
        }

        inputRefs.current[prevIndex]?.focus();
        return;
      }

      // If current is not empty, allow the normal delete behavior.
      // (onChange will fire with '' and we handle it there)
    }
  };

  const handleSubmit = () => {
    // Build the typed word without spaces
    const typedWord = inputLetters.join('');
    const answerWithoutSpaces = getAnswerWithoutSpaces();

    const newTries = [...progress.tries];
    newTries[currentRiddleIndex] = (newTries[currentRiddleIndex] || 0) + 1;
    updateHegionitProgress({ tries: newTries });

    // Compare without spaces
    if (typedWord === answerWithoutSpaces) {
      const newSolved = [...progress.solved];
      newSolved[currentRiddleIndex] = true;
      
      // Save the complete solved letters state
      const newSolvedLetters: Record<number, string[]> = { ...(progress.solvedLetters || {}) };
      newSolvedLetters[currentRiddleIndex] = [...inputLetters];
      
      updateHegionitProgress({ 
        solved: newSolved,
        solvedLetters: newSolvedLetters,
      });
      setMessage({ type: 'success', text: 'מצוין! תשובה נכונה! 🎉' });
    } else {
      const correctIndices = getCorrectIndices(inputLetters, answerWithoutSpaces);

      if (correctIndices.length) {
        const newLocked = new Set(lockedIndices);
        const newLetters = [...inputLetters];

        correctIndices.forEach((i) => {
          newLocked.add(i);
          newLetters[i] = normalizeHebrewFinalForm(answerWithoutSpaces[i] ?? '', i);
        });

        setInputLetters(newLetters);
        setLockedIndices(newLocked);

        const newLockedIndicesRecord: Record<number, number[]> = { ...(progress.lockedIndices || {}) };
        newLockedIndicesRecord[currentRiddleIndex] = Array.from(newLocked);

        updateHegionitProgress({
          lockedIndices: newLockedIndicesRecord,
          answers: progress.answers.map((a, i) =>
            i === currentRiddleIndex ? encodeAnswer(newLetters) : a
          ),
        });
      }

      setMessage({ type: 'error', text: 'לא נכון, נסה שוב! 💪' });
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleClear = () => {
    if (progress.solved[currentRiddleIndex]) return;
    
    // Only clear non-locked letters
    const newLetters = inputLetters.map((letter, i) => 
      lockedIndices.has(i) ? letter : ''
    );
    setInputLetters(newLetters);
    updateHegionitProgress({
      answers: progress.answers.map((a, i) => 
        i === currentRiddleIndex ? encodeAnswer(newLetters) : a
      ),
    });
  };

  const handleHint = () => {
    if (progress.solved[currentRiddleIndex]) return;

    const currentHints = progress.hintsUsed[currentRiddleIndex] || 0;
    if (currentHints >= 2) {
      setMessage({ type: 'error', text: 'כבר השתמשת ב-2 רמזים לחידה זו!' });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    const answerWithoutSpaces = getAnswerWithoutSpaces();

    // Find FIRST empty position in reading order: word1 first, then word2... (each word RTL)
    const order = getReadingOrderIndices();
    let targetIndex = -1;
    for (const i of order) {
      if (!lockedIndices.has(i) && !inputLetters[i]) {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === -1) {
      setMessage({ type: 'error', text: 'אין תיבות ריקות!' });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    // Add the hinted letter only (don’t modify other user-entered letters)
    const newLetters = [...inputLetters];
    newLetters[targetIndex] = normalizeHebrewFinalForm(answerWithoutSpaces[targetIndex] ?? '', targetIndex);
    setInputLetters(newLetters);

    // Lock this position
    const newLocked = new Set(lockedIndices);
    newLocked.add(targetIndex);
    setLockedIndices(newLocked);

    const newHintsUsed = [...progress.hintsUsed];
    newHintsUsed[currentRiddleIndex] = currentHints + 1;

    // Save locked indices to progress
    const newLockedIndicesRecord: Record<number, number[]> = { ...(progress.lockedIndices || {}) };
    newLockedIndicesRecord[currentRiddleIndex] = Array.from(newLocked);

    updateHegionitProgress({
      hintsUsed: newHintsUsed,
      lockedIndices: newLockedIndicesRecord,
      answers: progress.answers.map((a, i) =>
        i === currentRiddleIndex ? encodeAnswer(newLetters) : a
      ),
    });
  };

  // Helper to split answer into words and get word boundaries (without spaces in indices)
  const getWordBoundaries = () => {
    const words = normalizedAnswer.split(' ');
     const boundaries: { word: string; startIndex: number; endIndex: number }[] = [];
     let currentIndex = 0;

    // IMPORTANT: Keep the same logical word order as storage indices.
    // Visual RTL is handled by CSS/dir and per-word flex-row-reverse.
    words.forEach((word) => {
       boundaries.push({
         word,
         startIndex: currentIndex,
         endIndex: currentIndex + word.length - 1
       });
       currentIndex += word.length; // No +1 since we don't store spaces
     });

     return boundaries;
   };

  const navigateRiddle = (direction: 'prev' | 'next') => {
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentRiddleIndex + 1) % riddles.length;
    } else {
      newIndex = (currentRiddleIndex - 1 + riddles.length) % riddles.length;
    }
    updateHegionitProgress({ currentRiddle: newIndex });
  };

  const allSolved = progress.solved.every(Boolean);

  // --- Responsive sizing: prefer widening the puzzle container, then shrink all boxes uniformly ---
  const [containerWidthPx, setContainerWidthPx] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  useEffect(() => {
    if (!containerRef.current) return;

    const el = containerRef.current;

    const update = () => {
      // Prefer the actual rendered width (works for regular web view + responsive).
      setContainerWidthPx(el.getBoundingClientRect().width);
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

  const getWordLengths = () => normalizedAnswer.split(' ').map(w => w.length).filter(n => n > 0);

  const getMaxWordLength = () => {
    const lengths = getWordLengths();
    return lengths.length ? Math.max(...lengths) : 0;
  };

  const getAvailableRowWidthPx = () => {
    // puzzle-box has p-4 (16px each side) => 32px total.
    // Keep a tiny safety margin to avoid rounding overflow.
    const cardHorizontalPaddingPx = 32;
    const safetyPx = 2;

    // containerWidthPx is the width of the centered wrapper.
    const base = containerWidthPx || 0;
    return Math.max(0, base - cardHorizontalPaddingPx - safetyPx);
  };

  const getUniformBoxPxForPuzzle = () => {
    // Prefer not shrinking boxes unless required.
    const maxBoxPx = 56;
    const minBoxPx = 18;

    const maxWordLen = getMaxWordLength();
    if (!maxWordLen) return maxBoxPx;

    const gapPx = 8; // gap-2
    const availablePx = getAvailableRowWidthPx();
    const gapsPx = Math.max(0, maxWordLen - 1) * gapPx;

    const rawPx = (availablePx - gapsPx) / maxWordLen;

    return clampNumber(Math.floor(rawPx), minBoxPx, maxBoxPx);
  };

  const getUniformLetterBoxStyle = (): React.CSSProperties => {
    const boxPx = getUniformBoxPxForPuzzle();
    const fontPx = clampNumber(Math.round(boxPx * 0.55), 11, 28);

    return {
      width: `${boxPx}px`,
      height: `${boxPx}px`,
      fontSize: `${fontPx}px`,
    };
  };

  return (
    <div className="min-h-screen romantic-gradient px-4 py-6">
      {/* Grow the puzzle container to (almost) the full screen width before shrinking boxes */}
      <div ref={containerRef} className="w-full mx-auto max-w-[min(48rem,100vw-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentPage('hub')}
            className="flex items-center gap-1 text-primary"
          >
            <ChevronRight className="w-5 h-5" />
            חזרה
          </button>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            🧩 הגיונית
          </h1>
          <div className="w-16" />
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {riddles.map((_, i) => (
            <button
              key={i}
              onClick={() => updateHegionitProgress({ currentRiddle: i })}
              className={`w-3 h-3 rounded-full ${
                progress.solved[i]
                  ? 'bg-green-500'
                  : i === currentRiddleIndex
                  ? 'bg-primary'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Riddle Card */}
        <div className="puzzle-box mb-6">
          <div className="text-center mb-4">
            <span className="text-sm text-muted-foreground">
              חידה {currentRiddleIndex + 1} מתוך {riddles.length}
            </span>
          </div>
          
          <p className="text-lg text-center font-medium text-foreground mb-6 leading-relaxed">
            {currentRiddle.riddle}
          </p>

          {/* Letter boxes - render line by line for multi-word answers */}
          <div className="flex flex-col items-center gap-3 mb-4">
            {(() => {
              const wordBoundaries = getWordBoundaries();
              const uniformStyle = getUniformLetterBoxStyle();

              return wordBoundaries.map((boundary, wordIndex) => {
                const wordLength = boundary.endIndex - boundary.startIndex + 1;

                return (
                  <div key={wordIndex} className="w-full flex" dir="rtl">
                    <div className="flex flex-nowrap justify-start gap-2 max-w-full">
                      {Array.from({ length: wordLength }, (_, i) => {
                        const letterIndex = boundary.endIndex - i;
                        const letter = inputLetters[letterIndex] || '';
                        return (
                          <input
                            key={letterIndex}
                            ref={(el) => {
                              inputRefs.current[letterIndex] = el;
                            }}
                            type="text"
                            value={letter}
                            onChange={(e) => handleLetterChange(letterIndex, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(letterIndex, e)}
                            disabled={progress.solved[currentRiddleIndex] || lockedIndices.has(letterIndex)}
                            className={`letter-box ${
                              progress.solved[currentRiddleIndex]
                                ? 'letter-box-correct'
                                : lockedIndices.has(letterIndex)
                                ? 'letter-box-locked'
                                : letter
                                ? 'letter-box-filled'
                                : 'letter-box-empty'
                            }`}
                            style={uniformStyle}
                            maxLength={1}
                            dir="rtl"
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Tries counter */}
          <div className="text-center text-sm text-muted-foreground mb-4">
            ניסיונות: {progress.tries[currentRiddleIndex] || 0} | רמזים: {progress.hintsUsed[currentRiddleIndex] || 0}/2
          </div>

          {/* Message */}
          {message && (
            <div
              className={`text-center p-3 rounded-lg mb-4 ${
                message.type === 'success'
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-red-900/30 text-red-400'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="w-5 h-5 inline ml-2" />
              ) : (
                <X className="w-5 h-5 inline ml-2" />
              )}
              {message.text}
            </div>
          )}

          {/* Action buttons */}
          {!progress.solved[currentRiddleIndex] && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <RomanticButton
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  onClick={handleSubmit}
                >
                  אישור
                </RomanticButton>
                <RomanticButton
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleClear}
                >
                  מחיקה
                </RomanticButton>
              </div>
              <RomanticButton
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleHint}
              >
                <Lightbulb className="w-4 h-4 ml-2" />
                תן לי רמז
              </RomanticButton>
            </div>
          )}
        </div>

        {/* Navigation arrows - Icons match visual direction */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigateRiddle('prev')}
            className="p-3 rounded-full bg-card border border-border"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          
          {allSolved && (
            <RomanticButton
              variant="gold"
              size="sm"
              onClick={() => setCurrentPage('hub')}
            >
              הושלם! חזרה למרכז 🎉
            </RomanticButton>
          )}
          
          <button
            onClick={() => navigateRiddle('next')}
            className="p-3 rounded-full bg-card border border-border"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HegionitPage;
