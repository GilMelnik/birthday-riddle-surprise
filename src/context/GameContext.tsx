import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PuzzleProgress {
  hegionit: {
    currentRiddle: number;
    solved: boolean[];
    hintsUsed: number[];
    answers: string[];
  };
  wordle: {
    solved: boolean;
    attempts: string[];
    currentAttempt: string;
  };
  connections: {
    solved: boolean;
    solvedGroups: number[];
    attempts: number;
    hintsUsed: number;
  };
}

interface GameState {
  currentPage: 'landing' | 'hub' | 'hegionit' | 'wordle' | 'connections' | 'final';
  progress: PuzzleProgress;
  allCompleted: boolean;
}

interface GameContextType {
  state: GameState;
  setCurrentPage: (page: GameState['currentPage']) => void;
  updateHegionitProgress: (updates: Partial<PuzzleProgress['hegionit']>) => void;
  updateWordleProgress: (updates: Partial<PuzzleProgress['wordle']>) => void;
  updateConnectionsProgress: (updates: Partial<PuzzleProgress['connections']>) => void;
  resetProgress: () => void;
  getPuzzleStatus: (puzzle: 'hegionit' | 'wordle' | 'connections') => 'locked' | 'in-progress' | 'solved';
}

const initialProgress: PuzzleProgress = {
  hegionit: {
    currentRiddle: 0,
    solved: [false, false, false],
    hintsUsed: [0, 0, 0],
    answers: ['', '', ''],
  },
  wordle: {
    solved: false,
    attempts: [],
    currentAttempt: '',
  },
  connections: {
    solved: false,
    solvedGroups: [],
    attempts: 0,
    hintsUsed: 0,
  },
};

const initialState: GameState = {
  currentPage: 'landing',
  progress: initialProgress,
  allCompleted: false,
};

const STORAGE_KEY = 'birthday-puzzle-progress';

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return initialState;
        }
      }
    }
    return initialState;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const hegionitComplete = state.progress.hegionit.solved.every(Boolean);
    const wordleComplete = state.progress.wordle.solved;
    const connectionsComplete = state.progress.connections.solved;
    
    const allComplete = hegionitComplete && wordleComplete && connectionsComplete;
    
    if (allComplete !== state.allCompleted) {
      setState(prev => ({ ...prev, allCompleted: allComplete }));
    }
  }, [state.progress, state.allCompleted]);

  const setCurrentPage = (page: GameState['currentPage']) => {
    setState(prev => ({ ...prev, currentPage: page }));
  };

  const updateHegionitProgress = (updates: Partial<PuzzleProgress['hegionit']>) => {
    setState(prev => ({
      ...prev,
      progress: {
        ...prev.progress,
        hegionit: { ...prev.progress.hegionit, ...updates },
      },
    }));
  };

  const updateWordleProgress = (updates: Partial<PuzzleProgress['wordle']>) => {
    setState(prev => ({
      ...prev,
      progress: {
        ...prev.progress,
        wordle: { ...prev.progress.wordle, ...updates },
      },
    }));
  };

  const updateConnectionsProgress = (updates: Partial<PuzzleProgress['connections']>) => {
    setState(prev => ({
      ...prev,
      progress: {
        ...prev.progress,
        connections: { ...prev.progress.connections, ...updates },
      },
    }));
  };

  const resetProgress = () => {
    setState({ ...initialState, currentPage: 'hub' });
  };

  const getPuzzleStatus = (puzzle: 'hegionit' | 'wordle' | 'connections'): 'locked' | 'in-progress' | 'solved' => {
    switch (puzzle) {
      case 'hegionit':
        if (state.progress.hegionit.solved.every(Boolean)) return 'solved';
        if (state.progress.hegionit.solved.some(Boolean) || state.progress.hegionit.answers.some(a => a.length > 0)) return 'in-progress';
        return 'locked';
      case 'wordle':
        if (state.progress.wordle.solved) return 'solved';
        if (state.progress.wordle.attempts.length > 0) return 'in-progress';
        return 'locked';
      case 'connections':
        if (state.progress.connections.solved) return 'solved';
        if (state.progress.connections.solvedGroups.length > 0 || state.progress.connections.attempts > 0) return 'in-progress';
        return 'locked';
      default:
        return 'locked';
    }
  };

  return (
    <GameContext.Provider
      value={{
        state,
        setCurrentPage,
        updateHegionitProgress,
        updateWordleProgress,
        updateConnectionsProgress,
        resetProgress,
        getPuzzleStatus,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
