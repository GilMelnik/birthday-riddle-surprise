import { useState, useEffect, useMemo } from 'react';
import { useGame } from '@/context/GameContext';
import { RomanticButton } from '@/components/ui/romantic-button';
import { ChevronRight, Lightbulb } from 'lucide-react';
import puzzleData from '@/data/puzzles.json';
import { createSelectionKey } from '@/lib/connections';

interface Group {
  words: string[];
  connection: string;
}

const GROUP_COLORS = ['connection-solved-orange', 'connection-solved-green', 'connection-solved-red', 'connection-solved-yellow'];

// Shuffle array using Fisher-Yates algorithm
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Distribute words 
const distributeWordsAcrossGrid = (words: string[], groups: Group[]): string[] => {
  // Create a map of word to group index
  const wordToGroup: Record<string, number> = {};
  groups.forEach((group, groupIndex) => {
    group.words.forEach(word => {
      wordToGroup[word] = groupIndex;
    });
  });

  // Shuffle words first
  const shuffledWords = shuffleArray(words);
  
  // Create 4 rows, each with 4 slots
  const rows: string[][] = [[], [], [], []];
  const rowGroupCounts: Set<number>[] = [new Set(), new Set(), new Set(), new Set()];
  
  // Try to place each word in a row
  for (const word of shuffledWords) {
    const groupIndex = wordToGroup[word];
    let placed = false;
    
    // Try each row in random order
    const rowOrder = shuffleArray([0, 1, 2, 3]);
    for (const rowIndex of rowOrder) {
      // Check if row has space
      if (rows[rowIndex].length < 4) {
        rows[rowIndex].push(word);
        rowGroupCounts[rowIndex].add(groupIndex);
        placed = true;
        break;
      }
    }
    
    // If couldn't place optimally, place in any row with space
    if (!placed) {
      for (const rowIndex of rowOrder) {
        if (rows[rowIndex].length < 4) {
          rows[rowIndex].push(word);
          placed = true;
          break;
        }
      }
    }
  }
  
  // Shuffle within each row for extra randomness
  return rows.map(row => shuffleArray(row)).flat();
};

const ConnectionsPage = () => {
  const { state, setCurrentPage, updateConnectionsProgress, resetConnectionsProgress } = useGame();
  const { connections: progress } = state.progress;

  const { groups } = puzzleData.connections as { groups: Group[] };
  const allWords = useMemo(() => groups.flatMap(group => group.words), [groups]);

  // Shuffle words on initial load, distributing groups across rows
  const shuffledWords = useMemo(() => {
    return distributeWordsAcrossGrid(allWords, groups);
  }, [allWords, groups]);

  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [solvedGroups, setSolvedGroups] = useState<{ group: Group; index: number; colorClass: string }[]>([]);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [attempts, setAttempts] = useState(progress.attempts);
  const maxAttempts = 6;

  useEffect(() => {
    // Restore solved groups with colors
    const restored = progress.solvedGroups.map((index, i) => ({
      group: groups[index],
      index,
      colorClass: GROUP_COLORS[i % GROUP_COLORS.length],
    }));
    setSolvedGroups(restored);

    // Set available words (excluding solved), maintaining shuffled order
    const solvedWords = new Set(progress.solvedGroups.flatMap(i => groups[i].words));
    setAvailableWords(shuffledWords.filter(w => !solvedWords.has(w)));
    setAttempts(progress.attempts);

    if (progress.failed) {
      setSelectedWords([]);
    }
  }, [shuffledWords, progress.failed]);

  const handleWordClick = (word: string) => {
    if (progress.solved || progress.failed) return;

    if (selectedWords.includes(word)) {
      setSelectedWords(selectedWords.filter(w => w !== word));
    } else if (selectedWords.length < 4) {
      setSelectedWords([...selectedWords, word]);
    }
  };

  const handleSubmit = () => {
    if (progress.solved || progress.failed) return;

    if (selectedWords.length !== 4) {
      setMessage({ text: 'בחר 4 מילים', type: 'info' });
      setTimeout(() => setMessage(null), 1500);
      return;
    }

    // Check if 3 out of 4 are correct (for any unsolved group)
    const almostCorrect = groups.some((group, groupIndex) => {
      if (progress.solvedGroups.includes(groupIndex)) return false;
      const matchCount = selectedWords.filter(w => group.words.includes(w)).length;
      return matchCount === 3;
    });

    const selectionKey = createSelectionKey(selectedWords);
    const triedSelections = Array.isArray(progress.triedSelections) ? progress.triedSelections : [];
    const alreadyTried = triedSelections.includes(selectionKey);

    // Check if this matches any group
    const matchingGroupIndex = groups.findIndex(group => {
      const groupSet = new Set(group.words);
      return selectedWords.every(w => groupSet.has(w)) && selectedWords.length === group.words.length;
    });

    if (matchingGroupIndex !== -1 && !progress.solvedGroups.includes(matchingGroupIndex)) {
      // Correct!
      const newSolvedGroups = [...progress.solvedGroups, matchingGroupIndex];
      const colorClass = GROUP_COLORS[solvedGroups.length % GROUP_COLORS.length];
      const newSolvedDisplay = [...solvedGroups, { group: groups[matchingGroupIndex], index: matchingGroupIndex, colorClass }];

      setSolvedGroups(newSolvedDisplay);
      setAvailableWords(availableWords.filter(w => !selectedWords.includes(w)));
      setSelectedWords([]);

      const nextTriedSelections = alreadyTried ? triedSelections : [...triedSelections, selectionKey];

      updateConnectionsProgress({
        solvedGroups: newSolvedGroups,
        solved: newSolvedGroups.length === groups.length,
        failed: false,
        triedSelections: nextTriedSelections,
        lastHintWords: [],
        lastHintAttempts: -1,
      });

      setMessage({ text: `נכון! ${groups[matchingGroupIndex].connection}`, type: 'success' });
      setTimeout(() => setMessage(null), 2500);
      return;
    }

    if (alreadyTried) {
      // Don't count this attempt again, but do keep the '3 out of 4' feedback
      if (almostCorrect) {
        setMessage({ text: 'כמעט! שלושה מתוך ארבעה נכונים (כבר ניסית את זה)', type: 'info' });
      } else {
        setMessage({ text: 'כבר ניסית את 4 המילים האלה', type: 'info' });
      }
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    // New (unique) wrong attempt: count it once
    const newAttempts = attempts + 1;
    const nextTriedSelections = [...triedSelections, selectionKey];

    const isNowFailed = newAttempts >= maxAttempts;

    setAttempts(newAttempts);
    updateConnectionsProgress({
      attempts: newAttempts,
      triedSelections: nextTriedSelections,
      failed: isNowFailed,
    });

    if (isNowFailed) {
      setSelectedWords([]);
      setMessage({ text: 'אופס! נגמרו לך הניסיונות 😅', type: 'error' });
      setTimeout(() => setMessage(null), 2500);
      return;
    }

    if (almostCorrect) {
      setMessage({ text: 'כמעט! שלושה מתוך ארבעה נכונים', type: 'info' });
    } else {
      setMessage({ text: 'לא נכון, נסה שוב!', type: 'error' });
    }
    setTimeout(() => setMessage(null), 2000);
    // DO NOT clear selection on wrong answer - user must manually change
    // setSelectedWords([]);
  };

  const handleHint = () => {
    if (progress.solved || progress.failed) return;

    const storedHintWords = Array.isArray(progress.lastHintWords) ? progress.lastHintWords : [];

    const isStoredHintStillValid = () => {
      if (storedHintWords.length === 0) return false;
      for (const word of storedHintWords) {
        if (!availableWords.includes(word)) return false;
      }
      return true;
    };

    if (isStoredHintStillValid()) {
      setSelectedWords(storedHintWords);
      setMessage({ text: 'הנה רמז - שתי מילים מאותה קבוצה!', type: 'info' });
      setTimeout(() => setMessage(null), 2000);
      return;
    }

    if (progress.hintsUsed >= 2) {
      setMessage({ text: 'כבר השתמשת ב-2 רמזים!', type: 'error' });
      setTimeout(() => setMessage(null), 1500);
      return;
    }

    // Find first unsolved group
    const unsolvedGroupIndex = groups.findIndex((_, i) => !progress.solvedGroups.includes(i));
    if (unsolvedGroupIndex === -1) return;

    const group = groups[unsolvedGroupIndex];
    const availableFromGroup = group.words.filter(w => availableWords.includes(w));
    if (availableFromGroup.length === 0) return;

    // Highlight 2 words from this group
    const hintWords = availableFromGroup.slice(0, 2);
    setSelectedWords(hintWords);

    updateConnectionsProgress({
      hintsUsed: progress.hintsUsed + 1,
      lastHintWords: hintWords,
      lastHintAttempts: attempts,
    });
    setMessage({ text: 'הנה רמז - שתי מילים מאותה קבוצה!', type: 'info' });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleRestartConnections = () => {
    resetConnectionsProgress();
    setMessage({ text: 'התחלנו מחדש את "מה הקשר?"', type: 'info' });
    setTimeout(() => setMessage(null), 2000);
  };

  const remainingAttempts = Math.max(0, maxAttempts - attempts);

  return (
    <div className="min-h-screen romantic-gradient px-4 py-6">
      <div className="max-w-md mx-auto">
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
            🔗 מה הקשר?
          </h1>
          <div className="w-16" />
        </div>

        {/* Instructions */}
        <p className="text-center text-muted-foreground text-sm mb-4">
          מצא 4 קבוצות של 4 מילים עם קשר משותף
        </p>

        {/* Attempts indicator */}
        <div className="flex justify-center gap-2 mb-4">
          {Array.from({ length: maxAttempts }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < remainingAttempts ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {progress.failed && !progress.solved && (
          <div className="mb-4 space-y-3">
            <div className="text-center p-3 rounded-lg bg-red-900/30 text-red-400">
              נגמרו לך 6 ניסיונות. אפשר להתחיל מחדש את החידה הזו בלבד.
            </div>
            <RomanticButton
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleRestartConnections}
            >
              התחל מחדש את "מה הקשר?"
            </RomanticButton>
          </div>
        )}

        {/* Solved groups */}
        {solvedGroups.map(({ group, index, colorClass }) => (
          <div
            key={index}
            className={`connection-word connection-word-solved ${colorClass} mb-3`}
          >
            <div className="font-bold mb-1">{group.connection}</div>
            <div className="text-sm opacity-90">
              {group.words.join(' • ')}
            </div>
          </div>
        ))}

        {/* Word grid */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {availableWords.map((word) => (
            <button
              key={word}
              onClick={() => handleWordClick(word)}
              disabled={progress.failed}
              className={`connection-word ${
                selectedWords.includes(word)
                  ? 'connection-word-selected'
                  : 'connection-word-default'
              }`}
            >
              {word}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        {!progress.solved && !progress.failed && availableWords.length > 0 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <RomanticButton
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={handleSubmit}
                disabled={selectedWords.length !== 4}
              >
                אישור
              </RomanticButton>
              <RomanticButton
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setSelectedWords([])}
              >
                נקה בחירה
              </RomanticButton>
            </div>
            <RomanticButton
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={handleHint}
              disabled={progress.hintsUsed >= 2}
            >
              <Lightbulb className="w-4 h-4 ml-2" />
              רמז ({2 - progress.hintsUsed} נותרו)
            </RomanticButton>
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className={`text-center p-3 rounded-lg mb-4 ${
              message.type === 'success'
                ? 'bg-green-900/30 text-green-400'
                : message.type === 'error'
                ? 'bg-red-900/30 text-red-400'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {message.text}
          </div>
        )}

        {progress.solved && (
          <RomanticButton
            variant="gold"
            size="default"
            className="w-full"
            onClick={() => setCurrentPage('hub')}
          >
            הושלם! חזרה למרכז 🎉
          </RomanticButton>
        )}
      </div>
    </div>
  );
};

export default ConnectionsPage;
