import React, { useState } from 'react';
import { useGame } from '@/context/GameContext';
import { RomanticButton } from '@/components/ui/romantic-button';
import { Check, Lock, Clock, RotateCcw, Gift } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PuzzleCardProps {
  title: string;
  emoji: string;
  status: 'locked' | 'in-progress' | 'solved';
  onClick: () => void;
}

const PuzzleCard: React.FC<PuzzleCardProps> = ({ title, emoji, status, onClick }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'solved':
        return <Check className="w-6 h-6 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-6 h-6 text-accent" />;
      default:
        return <Lock className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'solved':
        return 'נפתר! ✓';
      case 'in-progress':
        return 'בתהליך...';
      default:
        return 'מחכה לך';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`puzzle-box w-full text-right ${
        status === 'solved' ? 'border-green-600 bg-green-900/20' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="text-sm text-muted-foreground">{getStatusText()}</span>
        </div>
        <span className="text-3xl">{emoji}</span>
      </div>
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
    </button>
  );
};

const HubPage: React.FC = () => {
  const { state, setCurrentPage, getPuzzleStatus, resetProgress } = useGame();
  const [showResetDialog, setShowResetDialog] = useState(false);

  const puzzles = [
    { id: 'hegionit' as const, title: 'הגיונית', emoji: '🧩' },
    { id: 'wordle' as const, title: '5 אותיות', emoji: '📝' },
    { id: 'connections' as const, title: 'מה הקשר?', emoji: '🔗' },
  ];

  const completedCount = puzzles.filter(p => getPuzzleStatus(p.id) === 'solved').length;

  return (
    <div className="min-h-screen romantic-gradient px-4 py-8 relative">
      <div className="max-w-md mx-auto">
        <div className="mb-6 flex justify-start">
          <RomanticButton
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage('landing')}
          >
            חזרה לדף הבית
          </RomanticButton>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-foreground mb-2">
            מרכז החידות 🎂
          </h1>
          <p className="text-muted-foreground">
            פתור את כל החידות כדי לגלות את ההפתעה
          </p>
          
          <div className="mt-4 flex justify-center gap-2">
            {puzzles.map((_, i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i < completedCount ? 'bg-green-500' : 'bg-muted'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {completedCount} מתוך 3 נפתרו
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {puzzles.map((puzzle) => (
            <div key={puzzle.id}>
              <PuzzleCard
                title={puzzle.title}
                emoji={puzzle.emoji}
                status={getPuzzleStatus(puzzle.id)}
                onClick={() => setCurrentPage(puzzle.id)}
              />
            </div>
          ))}
        </div>

        {state.allCompleted && (
          <div className="mb-8">
            <RomanticButton
              variant="surprise"
              size="lg"
              className="w-full pointer-events-auto"
              onClick={() => setCurrentPage('final')}
            >
              <Gift className="w-6 h-6" />
              הפתעה 🎁
            </RomanticButton>
          </div>
        )}

        <div className="flex justify-center">
          <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
            <AlertDialogTrigger asChild>
              <RomanticButton variant="ghost" size="sm">
                <RotateCcw className="w-4 h-4 ml-2" />
                איפוס התקדמות
              </RomanticButton>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-sm mx-4">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-right">
                  איפוס התקדמות
                </AlertDialogTitle>
                <AlertDialogDescription className="text-right">
                  האם אתה בטוח שברצונך לאפס את כל ההתקדמות?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogCancel className="m-0">לא</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    resetProgress();
                    setShowResetDialog(false);
                  }}
                  className="m-0 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  כן
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default HubPage;
