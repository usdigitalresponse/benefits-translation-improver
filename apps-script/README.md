# Apps Script Translation App

A Google Apps Script for form-based translation with automatic archiving, leveraging Google Drive folders and OpenAI API.

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

**Note:** `npm run clasp run` and `npm run clasp logs` (e.g. running the app and viewing logs remotely) require linking to a 
user-managed Google Cloud Platform project. For simplicity's sake, we are not planning to do this, so browser testing is recommended.

## File Structure

- `src/main.js` - Entry points and form trigger setup
- `src/config.js` - Configuration constants and settings
- `src/drive.js` - Google Drive operations and file management
- `src/translation.js` - Core translation logic and OpenAI API calls
- `src/archive.js` - Document archiving functionality
- `src/utils.js` - System status, validation, etc.
- `src/appsscript.json` - Apps Script configuration
- `.clasp.json` - Clasp configuration (auto-generated)

## Setup & Configuration

Run and test functions directly in the Apps Script editor at script.google.com for the best debugging experience.

### Initial Setup:
1. Load the script in Apps Script editor
2. **Set timezone**: Go to Project Settings → adjust project timezone (recommended: "America/Phoenix" for Arizona)
3. In `config.js`, configure:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `OUTPUT_FOLDER_ID`: Where translated documents will be created
   - `CONTEXT_FOLDER_ID`: Where your prompt document lives
   - `ARCHIVE_FOLDER_ID`: Where old translations are moved
   - `TRANSLATION_FORM_ID`: Your Google Form ID
   - `DAYS_BEFORE_ARCHIVE`: How many days before archiving old documents (default: 1)

### Create Required Components:
1. **Google Form** with these fields (exact names matter):
   - "Please enter the text you want to translate" (paragraph text)
   - "Translation Request Name" (short text)
   - "What is the type of content you want to translate?" (dropdown with options like "Public outreach flyer [TAB: t.1yn59ynq1uqa]")

2. **Prompt Document** in your context folder:
   - Create a Google Doc named "Arizona SNAP Translation Prompt — Modular Workflow Tool for Translators"
   - Add different tabs for different content types
   - Each tab's ID should match the TAB IDs in your form dropdown

3. **Folder Structure**:
   - Output folder: Where translations are saved
   - Context folder: Contains prompt document, lexicon, etc.
   - Archive folder: Where old translations are moved

### Set Up Triggers:
1. Run `setupFormTrigger()` to enable form submission handling
2. Run `setupArchiveTriggers()` to enable automatic archiving (runs at 6 AM and 6 PM daily)

## Testing the System

1. Submit a test form with sample text
2. Check the output folder for the translated document
3. Run `getSystemStatus()` to verify all components are working
4. Run `manualArchiveOldDocuments()` to test archiving

## Archive System

Documents are automatically archived after `DAYS_BEFORE_ARCHIVE` days:
- Runs twice daily (6 AM and 6 PM) in script timezone
- Example with 1-day setting:
  - Doc created Monday 9 AM → archived Tuesday 6 PM (33 hours)
  - Doc created Monday 7 PM → archived Wednesday 6 AM (35 hours)
- Maximum time before archive: ~37 hours

## Utility Functions

### System Status (`utils.js`):
- `validateConfiguration()` - Checks if all required config properties are set
- `getSystemStatus()` - Comprehensive check of configuration, triggers, and folder access
- `checkConfiguration()` - Displays current configuration values

### Manual Operations:
- `manualArchiveOldDocuments()` - Manually run the archive process
- `removeFormTrigger()` - Remove form submission trigger
- `setupFormTrigger()` - Re-establish form trigger
- `setupArchiveTriggers()` - Set up or reset archive triggers
- `removeArchiveTriggers()` - Remove archive triggers to disable automatic archiving