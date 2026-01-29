import React, { useEffect, useState } from 'react';
import { useGame } from '@/context/GameContext';
import { RomanticButton } from '@/components/ui/romantic-button';
import Confetti from '@/components/Confetti';
import FloatingHearts from '@/components/FloatingHearts';
import puzzleData from '@/data/puzzles.json';

const FinalPage: React.FC = () => {
  const { setCurrentPage } = useGame();
  const [showContent, setShowContent] = useState(false);
  
  const wishes = puzzleData.finalWishes;

  useEffect(() => {
    // Delay content reveal for dramatic effect
    const timer = setTimeout(() => setShowContent(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen romantic-gradient flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <Confetti />
      <FloatingHearts count={20} />
      
      <div className={`z-10 text-center max-w-md mx-auto transition-all duration-1000 ${
        showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}>
        <div className="mb-8">
          <span className="text-7xl animate-float inline-block">🎂</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-foreground mb-8 leading-tight animate-fade-in">
          {wishes.title}
        </h1>
        
        <div className="puzzle-box mb-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <p className="text-lg leading-relaxed text-foreground whitespace-pre-line">
            {wishes.message}
          </p>
        </div>
        
        <p className="text-xl font-serif text-primary mb-8 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          {wishes.signature}
        </p>
        
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.9s' }}>
          <div className="flex justify-center gap-4 text-4xl">
            <span className="animate-float" style={{ animationDelay: '0s' }}>💕</span>
            <span className="animate-float" style={{ animationDelay: '0.2s' }}>🎁</span>
            <span className="animate-float" style={{ animationDelay: '0.4s' }}>🎈</span>
            <span className="animate-float" style={{ animationDelay: '0.6s' }}>🌹</span>
            <span className="animate-float" style={{ animationDelay: '0.8s' }}>💝</span>
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
