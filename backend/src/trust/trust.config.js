export const TRUST_CONFIG = Object.freeze({
  multipliers: {
    low: 0.8,
    medium: 0.5,
    high: 0.2
  },
  thresholds: {
    tinyRepoMinFiles: 3,
    tinyRepoMinBytes: 2000,
    commitBurstWindowHours: 24,
    commitBurstShare: 0.8,
    singleCommitShare: 0.9,
    minReadmeWords: 30,
    jaccardBoilerplateThreshold: 0.65
  },
  tutorialPatterns: [
    /\btodo[-_ ]?app\b/i,
    /\b(tutorial|bootcamp|course[-_ ]?project|assignment)\b/i,
    /\b(clone|copycat)\b/i,
    /\bthis project was bootstrapped with\b/i,
    /\bcreate[- ]react[- ]app\b/i,
    /\bgetting started with create-react-app\b/i,
    /\bvite[-_ ]template\b/i
  ],
  vendoredPatterns: [
    /(^|\/)(node_modules|dist|build|\.venv|venv|vendor)\//i,
    /\.min\.(js|css)$/i,
    /\.bundle\.(js|css)$/i
  ],
  boilerplateReadmes: [
    `# Getting Started with Create React App
This project was bootstrapped with Create React App.
Available Scripts
In the project directory, you can run:
npm start
Runs the app in the development mode.
Open http://localhost:3000 to view it in your browser.`,
    `# Vite + React
This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.
Currently, two official plugins are available:
@vitejs/plugin-react uses Babel for Fast Refresh
@vitejs/plugin-react-swc uses SWC for Fast Refresh`
  ]
});
