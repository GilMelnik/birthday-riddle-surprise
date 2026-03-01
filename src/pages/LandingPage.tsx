import React from 'react';
import { useGame } from '@/context/GameContext';
import { RomanticButton } from '@/components/ui/romantic-button';
import wishesData from '@/data/wishes.json';

const LandingPage: React.FC = () => {
  const { setCurrentPage } = useGame();
  const wishes = wishesData.landing;

  return (
    <div className="min-h-screen romantic-gradient flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      <div className="z-10 text-center max-w-md mx-auto">
        <div className="mb-8">
          <span className="text-6xl inline-block">{wishes.heroEmoji}</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-serif font-bold text-foreground mb-6 leading-tight">
          {wishes.title.line1}
          <br />
          <span className="text-gradient-purple">{wishes.title.highlight}</span>
        </h1>
        
        <p className="text-lg sm:text-xl text-muted-foreground mb-4 leading-relaxed">
          {wishes.greeting}
        </p>
        
        <p className="text-base sm:text-lg text-muted-foreground mb-8 leading-relaxed">
          {wishes.messageLines.map((line, index) => (
            <React.Fragment key={`${line}-${index}`}>
              {line}
              {index < wishes.messageLines.length - 1 ? <br /> : null}
            </React.Fragment>
          ))}
        </p>
        
        <div className="space-y-4">
          <RomanticButton
            variant="primary"
            size="lg"
            onClick={() => setCurrentPage('hub')}
            className="w-full"
          >
            {wishes.startButtonLabel}
          </RomanticButton>
        </div>
        
        <p className="mt-8 text-sm text-muted-foreground/60">
          {wishes.footer}
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
