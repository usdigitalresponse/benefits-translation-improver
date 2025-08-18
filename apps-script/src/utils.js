// Utility functions and helpers

/**
 * Log configuration status
 */
function checkConfiguration() {
  console.log('Configuration Status:');
  console.log('OUTPUT_FOLDER_ID:', PropertiesService.getScriptProperties().getProperty("OUTPUT_FOLDER_ID") ? 'Set' : 'NOT SET');
  console.log('CONTEXT_FOLDER_ID:', PropertiesService.getScriptProperties().getProperty("CONTEXT_FOLDER_ID") ? 'Set' : 'NOT SET');
  console.log('ARCHIVE_FOLDER_ID:', PropertiesService.getScriptProperties().getProperty("ARCHIVE_FOLDER_ID") ? 'Set' : 'NOT SET');
  console.log('TRANSLATION FORM ID: ', PropertiesService.getScriptProperties().getProperty("TRANSLATION_FORM_ID") ? 'Set': 'NOT SET')
  console.log('TARGET_LANGUAGE:', CONFIG.TARGET_LANGUAGE);
  console.log('DAYS_BEFORE_ARCHIVE:', CONFIG.DAYS_BEFORE_ARCHIVE);
}

/**
 * Validate that all required configuration is set
 */
function validateConfiguration() {
  const missing = [];
  
  if (!PropertiesService.getScriptProperties().getProperty("OUTPUT_FOLDER_ID")) missing.push('OUTPUT_FOLDER_ID');
  if (!PropertiesService.getScriptProperties().getProperty("CONTEXT_FOLDER_ID")) missing.push('CONTEXT_FOLDER_ID');
  if (!PropertiesService.getScriptProperties().getProperty("ARCHIVE_FOLDER_ID")) missing.push('ARCHIVE_FOLDER_ID');
  if (!PropertiesService.getScriptProperties().getProperty("TRANSLATION_FORM_ID")) missing.push('TRANSLATION_FORM_ID');

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
  const translationTriggers = triggers.filter(t => t.getHandlerFunction() === CONFIG.FORM_TRIGGER_NAME);
  const archiveTriggers = triggers.filter(t => t.getHandlerFunction() === CONFIG.ARCHIVE_TRIGGER_FUNCTION_NAME);
  console.log(`Active translation triggers: ${translationTriggers.length}`);
  console.log(`Active archive triggers: ${archiveTriggers.length}`);
  
  if (archiveTriggers.length > 0) {
    archiveTriggers.forEach(trigger => {
      console.log(`  - Archive trigger: ${trigger.getTriggerSource()} at hour ${trigger.getEventType() === ScriptApp.EventType.CLOCK ? 'time-based' : 'other'}`);
    });
  }
  
  // Check folders accessibility
  console.log('\n3. Folder Access:');
  try {
    if (PropertiesService.getScriptProperties().getProperty("OUTPUT_FOLDER_ID")) {
      const outputFolder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("OUTPUT_FOLDER_ID"));
      console.log(`Output folder: ${outputFolder.getName()} (accessible)`);
    }
    if (PropertiesService.getScriptProperties().getProperty("CONTEXT_FOLDER_ID")) {
      const contextFolder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("CONTEXT_FOLDER_ID"));
      console.log(`Context folder: ${contextFolder.getName()} (accessible)`);
    }
    if (PropertiesService.getScriptProperties().getProperty("ARCHIVE_FOLDER_ID")) {
      const archiveFolder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("ARCHIVE_FOLDER_ID"));
      console.log(`Archive folder: ${archiveFolder.getName()} (accessible)`);
    }
  } catch (error) {
    console.error('Error accessing folders:', error.message);
  }

  // Check Properties Service
  console.log('\n4. Properties Service / API key(s)');
  try {
    const apiKey = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
      if (!apiKey) {
        console.log('API key not set');
      } else {
        console.log('API key set');
      }
  } catch (error) {
    console.error('Error retrieving API key:', error.message);
  }
  
  console.log('\n=== End Status ===');
}