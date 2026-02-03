import React from 'react';
import { useGame } from '@/context/GameContext';
import { RomanticButton } from '@/components/ui/romantic-button';
import puzzleData from '@/data/puzzles.json';
import dogCorgi from '@/assets/dog-corgi.png';
import dogPattern from '@/assets/dog-pattern.png';

const FinalPage: React.FC = () => {
  const { setCurrentPage } = useGame();
  
  const wishes = puzzleData.finalWishes;

  return (
    <div 
      className="min-h-screen romantic-gradient flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden"
      style={{ backgroundImage: `url(${dogPattern})`, backgroundSize: '200px', backgroundRepeat: 'repeat' }}
    >
      <div className="absolute inset-0 bg-background/92 pointer-events-none" />
      <img 
        src={dogCorgi} 
        alt="" 
        className="dog-decoration dog-decoration-bottom-left"
      />
      <img 
        src={dogCorgi} 
        alt="" 
        className="dog-decoration dog-decoration-bottom-right"
        style={{ transform: 'scaleX(-1)' }}
      />
      <div className="z-10 text-center max-w-md mx-auto">
        <div className="mb-8">
          <span className="text-7xl inline-block">🎂</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-foreground mb-8 leading-tight">
          {wishes.title}
        </h1>
        
        <div className="puzzle-box mb-8">
          <p className="text-lg leading-relaxed text-foreground whitespace-pre-line">
            {wishes.message}
          </p>
        </div>
        
        <p className="text-xl font-serif text-primary mb-8">
          {wishes.signature}
        </p>
        
        <div className="space-y-4">
          <div className="flex justify-center gap-4 text-4xl">
            <span>💕</span>
            <span>🎁</span>
            <span>🎈</span>
            <span>🌹</span>
            <span>💝</span>
          </div>
          
          <RomanticButton
            variant="secondary"
            size="sm"
            onClick={() => setCurrentPage('hub')}
            className="mt-8"
          >
            חזרה למרכז החידות
          </RomanticButton>
        </div>
      </div>
    </div>
  );
};

export default FinalPage;
