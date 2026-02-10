module.exports = {
  // TypeScript/JavaScript files
  '*.{ts,tsx,js,jsx}': [
    'eslint --fix',
    'prettier --write',
  ],

  // JSON files
  '*.json': [
    'prettier --write',
  ],

  // Markdown files
  '*.md': [
    'prettier --write',
  ],

  // CSS/SCSS files
  '*.{css,scss}': [
    'prettier --write',
  ],

  // YAML files
  '*.{yml,yaml}': [
    'prettier --write',
  ],

  // Run TypeScript type check on TypeScript files
  '*.{ts,tsx}': () => 'tsc --noEmit',

  // Run tests related to changed files
  '*.{ts,tsx,js,jsx}': () => 'npm run test:affected',
};
