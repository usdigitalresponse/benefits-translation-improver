// Utility functions and helpers

/**
 * Log configuration status
 */
function checkConfiguration() {
  console.log('Configuration Status:');
  console.log('SOURCE_FOLDER_ID:', CONFIG.SOURCE_FOLDER_ID ? 'Set' : 'NOT SET');
  console.log('OUTPUT_FOLDER_ID:', CONFIG.OUTPUT_FOLDER_ID ? 'Set' : 'NOT SET'); 
  console.log('CONTEXT_FOLDER_ID:', CONFIG.CONTEXT_FOLDER_ID ? 'Set' : 'NOT SET');
  console.log('OPENAI_API_KEY:', CONFIG.OPENAI_API_KEY !== 'KEY' ? 'Set' : 'NOT SET');
  console.log('TARGET_LANGUAGE:', CONFIG.TARGET_LANGUAGE);
}

/**
 * Validate that all required configuration is set
 */
function validateConfiguration() {
  const missing = [];
  
  if (!CONFIG.SOURCE_FOLDER_ID) missing.push('SOURCE_FOLDER_ID');
  if (!CONFIG.OUTPUT_FOLDER_ID) missing.push('OUTPUT_FOLDER_ID');
  if (!CONFIG.CONTEXT_FOLDER_ID) missing.push('CONTEXT_FOLDER_ID');
  if (CONFIG.OPENAI_API_KEY === 'KEY') missing.push('OPENAI_API_KEY');
  
  if (missing.length > 0) {
    console.error('Missing configuration:', missing.join(', '));
    return false;
  }
  
  console.log('Configuration is valid');
  return true;
}

/**
 * Get status of all components
 */
function getSystemStatus() {
  console.log('=== Translation System Status ===');
  
  // Check configuration
  console.log('\n1. Configuration:');
  checkConfiguration();
  
  // Check triggers
  console.log('\n2. Triggers:');
  const triggers = ScriptApp.getProjectTriggers();
  const translationTriggers = triggers.filter(t => t.getHandlerFunction() === 'onFileAdded');
  console.log(`Active translation triggers: ${translationTriggers.length}`);
  
  // Check folders accessibility
  console.log('\n3. Folder Access:');
  try {
    if (CONFIG.SOURCE_FOLDER_ID) {
      const sourceFolder = DriveApp.getFolderById(CONFIG.SOURCE_FOLDER_ID);
      console.log(`Source folder: ${sourceFolder.getName()} (accessible)`);
    }
    if (CONFIG.OUTPUT_FOLDER_ID) {
      const outputFolder = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
      console.log(`Output folder: ${outputFolder.getName()} (accessible)`);
    }
    if (CONFIG.CONTEXT_FOLDER_ID) {
      const contextFolder = DriveApp.getFolderById(CONFIG.CONTEXT_FOLDER_ID);
      console.log(`Context folder: ${contextFolder.getName()} (accessible)`);
    }
  } catch (error) {
    console.error('Error accessing folders:', error.message);
  }
  
  console.log('\n=== End Status ===');
}

/**
 * Clean up processed files (remove the processed marker)
 */
function resetProcessedMarkers() {
  if (!CONFIG.SOURCE_FOLDER_ID) {
    console.log('SOURCE_FOLDER_ID not set');
    return;
  }
  
  try {
    const sourceFolder = DriveApp.getFolderById(CONFIG.SOURCE_FOLDER_ID);
    const files = sourceFolder.getFiles();
    let count = 0;
    
    while (files.hasNext()) {
      const file = files.next();
      if (hasBeenProcessed(file)) {
        const currentDescription = file.getDescription() || '';
        const newDescription = currentDescription.replace(` ${CONFIG.PROCESSED_MARKER}`, '').trim();
        file.setDescription(newDescription);
        count++;
      }
    }
    
    console.log(`Reset processed markers for ${count} files`);
  } catch (error) {
    console.error('Error resetting processed markers:', error);
  }
}