/**
 * Set up the drive trigger to "listen" for file added events.
 * Sadly there's no option to install it for a particular folder,
 * so we have to listen to all folders, and then we check the folder id
 * in translateOnFileAdded below.
 *
 * Run this function once to install the trigger.
 */
function setupTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'translateOnFileAdded') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  ScriptApp.newTrigger('translateOnFileAdded')
    .timeBased()
    .everyMinutes(CONFIG.TRIGGER_INTERVAL_MINUTES)
    .create();
    
  console.log('Trigger set up successfully');
}

/**
 * Run this function to remove the translation trigger from Google workspace.
 */
function removeTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'translateOnFileAdded') {
      ScriptApp.deleteTrigger(trigger);
      console.log('Trigger removed successfully');
    }
  });
  
  if (triggers.length === 0) {
    console.log('No triggers found to remove');
  }
}

/**
 * Main function that runs when new files are detected to translate
 */
function translateOnFileAdded() {
  try {
    const sourceFolder = DriveApp.getFolderById(CONFIG.SOURCE_FOLDER_ID);
    const files = sourceFolder.getFiles();
    
    while (files.hasNext()) {
      const file = files.next();
      if (file.getMimeType() === MimeType.GOOGLE_DOCS && !hasBeenProcessed(file)) {
        console.log(`Processing file: ${file.getName()}`);
        processDocument(file);
        markAsProcessed(file);
      }
    }
  } catch (error) {
    console.error('Error in translateOnFileAdded:', error);
  }
}

/**
 * This is a utility method you can run to test the translation on a specific document.
 * File in the document ID you want below and then run.
 */
function testTranslation() {
  const testDocId = ''; // Replace with a test document ID
  if (!testDocId) {
    console.log('Please set a test document ID in the testTranslation function');
    return;
  }
  
  const file = DriveApp.getFileById(testDocId);
  processDocument(file);
}

/**
 * Test the translation prompt loading.
 * This is a utility method you can run to make sure the translation prompt loads.
 */
function testPromptLoading() {
  const prompt = getTranslationPrompt();
  console.log('Translation prompt that will be used:');
  console.log(prompt);
}