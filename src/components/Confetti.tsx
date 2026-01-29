import React, { useEffect, useState } from 'react';

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  type: 'heart' | 'circle' | 'star';
}

const Confetti: React.FC = () => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const colors = [
      'hsl(350, 60%, 65%)', // primary rose
      'hsl(45, 80%, 55%)', // gold
      'hsl(350, 60%, 75%)', // rose
      'hsl(45, 70%, 75%)', // gold light
      'hsl(0, 100%, 70%)', // red
    ];

    const newPieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 8 + Math.random() * 12,
      type: (['heart', 'circle', 'star'] as const)[Math.floor(Math.random() * 3)],
    }));

    setPieces(newPieces);
  }, []);

  const getShape = (type: ConfettiPiece['type']) => {
    switch (type) {
      case 'heart':
        return '❤';
      case 'star':
        return '✦';
      case 'circle':
        return '●';
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute animate-confetti"
          style={{
            left: `${piece.left}%`,
            top: '-20px',
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            color: piece.color,
            fontSize: `${piece.size}px`,
          }}
        >
          {getShape(piece.type)}
        </div>
      ))}
    </div>
  );
};

export default Confetti;
