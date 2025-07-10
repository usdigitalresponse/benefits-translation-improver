# Apps Script Translation App

A Google Apps Script for translation functionality, leveraging Google Drive folders.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Login to Google Apps Script:**
   ```bash
   npm run login
   ```

3. **Create a new Apps Script project** (if needed):
   ```bash
   npm run clasp create --title "Translation App" --type standalone
   ```

4. **Push code to Apps Script:**
   ```bash
   npm run push
   ```

## Development Workflow

1. Edit code locally in the `src/` directory
2. Push changes: `npm run push`
3. Test in the browser at [script.google.com](https://script.google.com)

## Available Scripts

- `npm run push` - Upload local code to Apps Script
- `npm run login` - Authenticate with Google Apps Script
- `npm run clasp create` - Create a project for the script (for first time users, if you don't have one already)

**Note:** `npm run run` and `npm run logs` (e.g. running the app and viewing logs remotely) require linking to a 
user-managed Google Cloud Platform project. For simplicity's sake, we are not planning to do this, so browser testing is recommended.

## File Structure

- `src/translationApp.js` - Main application code
- `src/appsscript.json` - Apps Script configuration
- `.clasp.json` - Clasp configuration (auto-generated)

## Testing

Run and test functions directly in the Apps Script editor at script.google.com for the best debugging experience.