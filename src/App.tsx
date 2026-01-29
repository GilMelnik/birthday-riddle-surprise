import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GameProvider, useGame } from "@/context/GameContext";

import LandingPage from "@/pages/LandingPage";
import HubPage from "@/pages/HubPage";
import HegionitPage from "@/pages/HegionitPage";
import WordlePage from "@/pages/WordlePage";
import ConnectionsPage from "@/pages/ConnectionsPage";
import FinalPage from "@/pages/FinalPage";

const queryClient = new QueryClient();

const GameRouter = () => {
  const { state } = useGame();

  switch (state.currentPage) {
    case 'landing':
      return <LandingPage />;
    case 'hub':
      return <HubPage />;
    case 'hegionit':
      return <HegionitPage />;
    case 'wordle':
      return <WordlePage />;
    case 'connections':
      return <ConnectionsPage />;
    case 'final':
      return <FinalPage />;
    default:
      return <LandingPage />;
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GameProvider>
        <Toaster />
        <Sonner />
        <GameRouter />
      </GameProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
