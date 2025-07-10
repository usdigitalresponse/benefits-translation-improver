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

**Note:** `npm run clasp run` and `npm run clasp logs` (e.g. running the app and viewing logs remotely) require linking to a 
user-managed Google Cloud Platform project. For simplicity's sake, we are not planning to do this, so browser testing is recommended.

## File Structure

- `src/main.js` - Entry points, trigger setups and utility methods
- `src/config.js` - Configuration constants and settings
- `src/drive.js` - Google Drive operations and file management
- `src/translation.js` - Core translation logic and LLM API calls
- `src/utils.js` - System status, validation, etc.
- `src/appsscript.json` - Apps Script configuration
- `.clasp.json` - Clasp configuration (auto-generated)

## Testing

Run and test functions directly in the Apps Script editor at script.google.com for the best debugging experience.

After creating the project and pushing to your Google workspace:
1. Load the script
2. In config.js, add in your API key(s)
3. Create a parent folder for the TranslationApp files. Within that folder, create three sub-folders: Docs_to_Translate, Translated_Docs and Translation_Content. Copy each of these IDs into the relevant property in config.js
5. If you've already created the folders and need the IDs, you can run the `getFolderIds` method in `drive.js` to find your folder IDs and copy them over.
6. Add the custom prompt to the Translation_Context folder, named Translate_Prompt
7. Run the `setupTrigger` method in `main.js` to add the trigger to listen for new files
8. Add a new file to be translated in Docs_To_Translate
9. Wait up to 2 minutes and see the translation in Translated_Docs
10. Run the utility method `removeTrigger` in `main.js` to remove the trigger (optional, but just in case you don't want it listening forever)

## System Status Markers
You have various utility methods available in `utils.js` to verify the status of the system:
- `validateConfiguration` - checks if all the necessary config properties are set for the script to run successfully
- `getSystemStatus` - checks configuration, triggers and folders
- `resetProcessedMarkers` - in case you want to mark the files in the source folder as "unprocessed" to translate again