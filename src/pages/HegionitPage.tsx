import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '@/context/GameContext';
import { RomanticButton } from '@/components/ui/romantic-button';
import { ArrowRight, ArrowLeft, ChevronRight, Lightbulb, Check, X } from 'lucide-react';
import puzzleData from '@/data/puzzles.json';

const HegionitPage: React.FC = () => {
  const { state, setCurrentPage, updateHegionitProgress } = useGame();
  const { hegionit: progress } = state.progress;
  
  const riddles = puzzleData.hegionit;
  const currentRiddleIndex = progress.currentRiddle;
  const currentRiddle = riddles[currentRiddleIndex];
  
  const [inputLetters, setInputLetters] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [tries, setTries] = useState(0);
  const [lockedIndices, setLockedIndices] = useState<Set<number>>(new Set());
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const savedAnswer = progress.answers[currentRiddleIndex] || '';
    const newLetters = savedAnswer.split('').concat(Array(currentRiddle.answer.length - savedAnswer.length).fill(''));
    setInputLetters(newLetters);
    
    // Restore locked indices from progress
    const locked = new Set<number>();
    const savedLocked = progress.lockedIndices?.[currentRiddleIndex] || [];
    // Restore locked indices from saved progress
    savedLocked.forEach((i: number) => {
      if (newLetters[i]) {
        locked.add(i);
      }
    });
    setLockedIndices(locked);
    setMessage(null);
  }, [currentRiddleIndex, currentRiddle.answer.length]);

  const handleLetterChange = (index: number, value: string) => {
    if (progress.solved[currentRiddleIndex]) return;
    if (lockedIndices.has(index)) return; // Cannot modify locked letters
    
    const newLetters = [...inputLetters];
    newLetters[index] = value.slice(-1);
    setInputLetters(newLetters);
    
    updateHegionitProgress({
      answers: progress.answers.map((a, i) => 
        i === currentRiddleIndex ? newLetters.join('') : a
      ),
    });

    // Auto-focus next box to the LEFT (RTL order) - index - 1
    if (value && index > 0) {
      // Find the next unlocked box to the left
      for (let nextIndex = index - 1; nextIndex >= 0; nextIndex--) {
        if (!lockedIndices.has(nextIndex) && !newLetters[nextIndex]) {
          inputRefs.current[nextIndex]?.focus();
          break;
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
      if (!inputLetters[index] && index < inputLetters.length - 1) {
        // Move to next box to the right (RTL) when backspacing on empty
        for (let nextIndex = index + 1; nextIndex < inputLetters.length; nextIndex++) {
          if (!lockedIndices.has(nextIndex)) {
            inputRefs.current[nextIndex]?.focus();
            break;
          }
        }
      }
    }
  };

  const handleSubmit = () => {
    const answer = inputLetters.join('');
    setTries(prev => prev + 1);
    
    if (answer === currentRiddle.answer) {
      const newSolved = [...progress.solved];
      newSolved[currentRiddleIndex] = true;
      updateHegionitProgress({ solved: newSolved });
      setMessage({ type: 'success', text: 'מצוין! תשובה נכונה! 🎉' });
    } else {
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
        i === currentRiddleIndex ? newLetters.join('') : a
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

    // Find empty positions that haven't been locked
    const emptyPositions = inputLetters
      .map((letter, i) => ({ letter, index: i }))
      .filter(({ letter, index }) => !letter && !lockedIndices.has(index));

    if (emptyPositions.length === 0) {
      setMessage({ type: 'error', text: 'אין תיבות ריקות!' });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    const randomPos = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
    const newLetters = [...inputLetters];
    newLetters[randomPos.index] = currentRiddle.answer[randomPos.index];
    setInputLetters(newLetters);
    
    // Lock this position
    const newLocked = new Set(lockedIndices);
    newLocked.add(randomPos.index);
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
        i === currentRiddleIndex ? newLetters.join('') : a
      ),
    });
  };

  const navigateRiddle = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, currentRiddleIndex - 1)
      : Math.min(riddles.length - 1, currentRiddleIndex + 1);
    updateHegionitProgress({ currentRiddle: newIndex });
  };

  const allSolved = progress.solved.every(Boolean);

  return (
    <div className="min-h-screen romantic-gradient px-4 py-6">
      <div className="max-w-md mx-auto">
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

          {/* Letter boxes */}
          <div className="flex justify-center gap-2 mb-4 flex-row-reverse">
            {inputLetters.map((letter, i) => (
              <input
                key={i}
                ref={el => inputRefs.current[i] = el}
                type="text"
                value={letter}
                onChange={(e) => handleLetterChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={progress.solved[currentRiddleIndex] || lockedIndices.has(i)}
                className={`letter-box ${
                  progress.solved[currentRiddleIndex]
                    ? 'letter-box-correct'
                    : lockedIndices.has(i)
                    ? 'letter-box-locked'
                    : letter
                    ? 'letter-box-filled'
                    : 'letter-box-empty'
                }`}
                maxLength={1}
                dir="rtl"
              />
            ))}
          </div>

          {/* Tries counter */}
          <div className="text-center text-sm text-muted-foreground mb-4">
            ניסיונות: {tries} | רמזים: {progress.hintsUsed[currentRiddleIndex] || 0}/2
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

        {/* Navigation arrows */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigateRiddle('next')}
            disabled={currentRiddleIndex === riddles.length - 1}
            className="p-3 rounded-full bg-card border border-border disabled:opacity-30"
          >
            <ArrowLeft className="w-6 h-6" />
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
            onClick={() => navigateRiddle('prev')}
            disabled={currentRiddleIndex === 0}
            className="p-3 rounded-full bg-card border border-border disabled:opacity-30"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HegionitPage;
