/**
 * Create a new document with the translated content
 */
function createTranslatedDocument(originalName, translation) {
  try {
    const outputFolder = DriveApp.getFolderById(CONFIG.OUTPUT_FOLDER_ID);
    const translatedName = `${originalName} - Translated to ${CONFIG.TARGET_LANGUAGE}`;
    
    const newDoc = DocumentApp.create(translatedName);
    newDoc.getBody().setText(translation);

    const newDocFile = DriveApp.getFileById(newDoc.getId());
    markAsProcessed(newDocFile);
    newDocFile.moveTo(outputFolder);
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
 * Find the required translation folders by name (run this to find your folder IDs to plug into config.js)
 */
function getFolderIds() {
  const requiredFolders = ['Translated_Docs', 'Translation_Context'];
  
  console.log('Finding translation folders...\n');

  requiredFolders.forEach(folderName => {
    console.log(`Looking for: ${folderName}`);
    const folders = DriveApp.getFoldersByName(folderName);
    
    if (!folders.hasNext()) {
      console.log(`  ❌ NOT FOUND - Please create a folder named "${folderName}"`);
    } else {
      const foundFolders = [];
      while (folders.hasNext()) {
        foundFolders.push(folders.next());
      }
      
      if (foundFolders.length === 1) {
        const folder = foundFolders[0];
        console.log(`  ✅ ${folder.getName()} - ID: ${folder.getId()}`);
      } else {
        console.log(`⚠️  Found ${foundFolders.length} folders with this name:`);
        foundFolders.forEach(folder => {
          console.log(`${folder.getName()} - ID: ${folder.getId()} (Created: ${folder.getDateCreated()})`);
        });
      }
    }
    console.log('');
  });
  
  console.log('Copy the IDs above into your config.js file:');
  console.log('- OUTPUT_FOLDER_ID: Use the ID for "Translated_Docs"');
  console.log('- CONTEXT_FOLDER_ID: Use the ID for "Translation_Context"');
}