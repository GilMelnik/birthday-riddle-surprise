# Welcome to the project

## Project overview

This is a small web app built to deliver a birthday-themed riddle experience. 
It guides the player through a hub of mini-games (like Connections, Wordle and Hegionit puzzles), then culminates in a final reveal. 
The tone is playful and celebratory, with visual flair like confetti and floating hearts.

## What you can do in the app

- Start at the landing page and follow the navigation to the puzzle hub.
- Solve word and grouping riddles to unlock progress.
- Enjoy lightweight animations and celebratory visuals as you complete tasks.
- Reach the final page for the birthday surprise.

## Riddles and puzzle flow

The puzzles live in `src/data/puzzles.json` and are wired into the pages under `src/pages/`. Each page reads the appropriate puzzle data and renders the interaction for that game. The current flow is:

- Landing page: introduction and entry point.
- Hub page: choose between available riddle experiences.
- Hegionit puzzle: a cryptic crosswords riddle.
- Wordle puzzle: a word guessing game with hints.
- Connections puzzle: group related items into sets.
- Final page: the celebration screen once the riddles are completed.

## Project structure

```
public/                 # Static assets
src/
  components/           # Reusable UI components and effects
  context/              # Shared state for game flow
  data/                 # Puzzle data (riddles)
  hooks/                # Custom React hooks
  lib/                  # Utilities and helper logic
  pages/                # Page-level views
  test/                 # Unit and integration tests
  App.tsx               # App shell and routing
  main.tsx              # Application entry point
```

## How to run locally

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## How to deploy to GitHub Pages

```sh
# Step 1: Build the project.
npm run build

# Step 2: Deploy to GitHub Pages.
npm run deploy
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
