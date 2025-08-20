/**
 * Create a new document with the translated content, plus supplemental information organized by heading
 * @return {string} The URL of the created document, or null if creation failed
 */
function createTemplatedTranslationDocument(originalName, translation, originalText, prompt) {
  try {
    const outputFolder = DriveApp.getFolderById(
        PropertiesService.getScriptProperties().getProperty("OUTPUT_FOLDER_ID")
    );
    const translatedName = `${originalName} - Translated to ${CONFIG.TARGET_LANGUAGE}`;
    const newDoc = DocumentApp.create(translatedName);
    const newDocFile = DriveApp.getFileById(newDoc.getId());
    const newDocBody = newDoc.getBody();

    // Map the content to sections
    const sections = [
      { heading: "Translated Text", content: translation },
      { heading: "Original Text", content: originalText },
      { heading: "Model", content: CONFIG.OPENAI_MODEL },
      { heading: "Prompt", content: prompt }
    ];

    // Add each section to the document
    sections.forEach((section, index) => {
      const paragraphIndex = index * 2;
      const header = newDocBody.insertParagraph(paragraphIndex, section.heading);
      header.setHeading(DocumentApp.ParagraphHeading.HEADING1);
      newDocBody.insertParagraph(paragraphIndex + 1, section.content);
    });

    newDocFile.moveTo(outputFolder);
    console.log(`Created translated document: ${translatedName}`);

    return newDoc.getUrl();
  } catch (error) {
    console.error('Error creating translated document: ', error);
    return null;
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
}