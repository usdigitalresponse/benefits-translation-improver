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
  console.log('GLOSSARY_SHEET_ID:', PropertiesService.getScriptProperties().getProperty("GLOSSARY_SHEET_ID") ? 'Set' : 'NOT SET (Optional)');
  console.log('AZURE_API_KEY:', PropertiesService.getScriptProperties().getProperty("AZURE_API_KEY") ? 'Set' : 'NOT SET');
  console.log('AZURE_DEPLOYMENT_NAME:', PropertiesService.getScriptProperties().getProperty("AZURE_DEPLOYMENT_NAME") ? 'Set' : 'NOT SET');
  console.log('AZURE_RESOURCE_NAME:', PropertiesService.getScriptProperties().getProperty("AZURE_RESOURCE_NAME") ? 'Set' : 'NOT SET');
  console.log('AZURE_API_VERSION:', PropertiesService.getScriptProperties().getProperty("AZURE_API_VERSION") ? 'Set' : 'NOT SET');
  console.log('GEMINI_API_KEY:', PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") ? 'Set' : 'NOT SET');
  console.log('GEMINI_VERSION:', PropertiesService.getScriptProperties().getProperty("GEMINI_VERSION") ? 'Set' : 'NOT SET');
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
  if (!PropertiesService.getScriptProperties().getProperty("AZURE_API_KEY")) missing.push('AZURE_API_KEY');
  if (!PropertiesService.getScriptProperties().getProperty("AZURE_DEPLOYMENT_NAME")) missing.push('AZURE_DEPLOYMENT_NAME');
  if (!PropertiesService.getScriptProperties().getProperty("AZURE_RESOURCE_NAME")) missing.push('AZURE_RESOURCE_NAME');
  if (!PropertiesService.getScriptProperties().getProperty("AZURE_API_VERSION")) missing.push('AZURE_API_VERSION');

  if (missing.length > 0) {
    console.error('Missing configuration:', missing.join(', '));
    return false;
  }
  
  console.log('Configuration is valid');
  
  // Check optional configurations
  const glossaryConfigured = PropertiesService.getScriptProperties().getProperty("GLOSSARY_SHEET_ID");
  
  if (glossaryConfigured) {
    console.log('Optional: Glossary sheet is configured');
    console.log(`  - Will look for lexicon in "${CONFIG.LEXICON_SHEET_NAME}" tab`);
    console.log(`  - Will look for SNAP terms in "${CONFIG.SNAP_TERMS_TAB_NAME}" tab`);
  } else {
    console.log('Optional: Glossary sheet not configured (translations will proceed without glossary or SNAP terms)');
  }
  
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
  console.log('\n4. Properties Service / API Configuration');
  try {
    const azureApiKey = PropertiesService.getScriptProperties().getProperty('AZURE_API_KEY');
    const deploymentName = PropertiesService.getScriptProperties().getProperty('AZURE_DEPLOYMENT_NAME');
    const resourceName = PropertiesService.getScriptProperties().getProperty('AZURE_RESOURCE_NAME');
    const apiVersion = PropertiesService.getScriptProperties().getProperty('AZURE_API_VERSION');
    const geminiApiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    
    console.log('Azure Configuration:');
    console.log('  AZURE_API_KEY:', azureApiKey ? 'Set' : 'NOT SET');
    console.log('  AZURE_DEPLOYMENT_NAME:', deploymentName ? 'Set' : 'NOT SET');
    console.log('  AZURE_RESOURCE_NAME:', resourceName ? 'Set' : 'NOT SET');
    console.log('  AZURE_API_VERSION:', apiVersion ? 'Set' : 'NOT SET');
    
    if (azureApiKey && deploymentName && resourceName && apiVersion) {
      console.log('  Azure configuration complete');
    } else {
      console.log('  Azure configuration incomplete');
    }
    
    console.log('Gemini Configuration:');
    const geminiVersion = PropertiesService.getScriptProperties().getProperty('GEMINI_VERSION');
    console.log('  GEMINI_API_KEY:', geminiApiKey ? 'Set' : 'NOT SET');
    console.log('  GEMINI_VERSION:', geminiVersion ? `Set (${geminiVersion})` : 'NOT SET');
    
    if (geminiApiKey && geminiVersion) {
      console.log('  Gemini configuration complete');
    } else {
      console.log('  Gemini configuration incomplete');
    }
  } catch (error) {
    console.error('Error retrieving API configuration:', error.message);
  }

  // Check Glossary Sheet
  console.log('\n5. Glossary Sheet (Optional):');
  try {
    const glossarySheetId = PropertiesService.getScriptProperties().getProperty('GLOSSARY_SHEET_ID');
    
    if (!glossarySheetId) {
      console.log('No glossary sheet configured (optional feature)');
    } else {
      const spreadsheet = SpreadsheetApp.openById(glossarySheetId);
      console.log(`Glossary sheet accessible: ${spreadsheet.getName()}`);
      
      // Check Curated List tab
      const curatedSheet = spreadsheet.getSheetByName(CONFIG.LEXICON_SHEET_NAME);
      if (curatedSheet) {
        const dataRange = curatedSheet.getDataRange();
        const numRows = dataRange.getNumRows() - 1;
        console.log(`  - "${CONFIG.LEXICON_SHEET_NAME}" tab found with ${numRows} term pairs (excluding header)`);
      } else {
        console.log(`  - "${CONFIG.LEXICON_SHEET_NAME}" tab not found`);
      }
      
      // Check SNAP Terms tab
      const snapSheet = spreadsheet.getSheetByName(CONFIG.SNAP_TERMS_TAB_NAME);
      if (snapSheet) {
        const snapDataRange = snapSheet.getDataRange();
        const snapNumRows = snapDataRange.getNumRows() - 1;
        console.log(`  - "${CONFIG.SNAP_TERMS_TAB_NAME}" tab found with ${snapNumRows} SNAP terms (excluding header)`);
      } else {
        console.log(`  - "${CONFIG.SNAP_TERMS_TAB_NAME}" tab not found`);
      }
    }
  } catch (error) {
    console.error('Error accessing glossary sheet:', error.message);
  }
  
  console.log('\n=== End Status ===');
}