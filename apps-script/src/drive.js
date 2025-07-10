/**
 * Create a new document with the translated content
 */
function createTranslatedDocument(originalName, translation) {
  try {
    const outputFolder = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
    const translatedName = `${originalName} - Translated to ${CONFIG.TARGET_LANGUAGE}`;
    
    const newDoc = DocumentApp.create(translatedName);
    newDoc.getBody().setText(translation);
    
    const file = DriveApp.getFileById(newDoc.getId());
    outputFolder.addFile(file);
    // Remove from root now that it's in the output folder
    DriveApp.getRootFolder().removeFile(file);
    
    console.log(`Created translated document: ${translatedName}`);
    
  } catch (error) {
    console.error('Error creating translated document:', error);
  }
}

/**
 * Check if a file has been processed (simple implementation using file description)
 */
function hasBeenProcessed(file) {
  const description = file.getDescription();
  return description && description.includes(CONFIG.PROCESSED_MARKER);
}

/**
 * Mark a file as processed
 */
function markAsProcessed(file) {
  const currentDescription = file.getDescription() || '';
  file.setDescription(currentDescription + ' ' + CONFIG.PROCESSED_MARKER);
}

/**
 * Utility function to get folder IDs (run this to find your folder IDs)
 */
function getFolderIds() {
  const folders = DriveApp.getFolders();
  console.log('Available folders:');
  while (folders.hasNext()) {
    const folder = folders.next();
    console.log(`Folder: ${folder.getName()} - ID: ${folder.getId()}`);
  }
}