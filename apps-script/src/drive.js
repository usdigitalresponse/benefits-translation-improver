/**
 * Create a new document with the translated content, plus supplemental information organized by heading
 * @return {string} The URL of the created document, or null if creation failed
 */
function createTemplatedTranslationDocument(originalName, translation, originalText, prompt, model) {
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
      { heading: "Model", content: model || "Not Determined" },
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
 * Create an error document when translation fails
 * @param {string} requestName - The name of the request
 * @param {string} originalText - The original text that failed to translate
 * @param {string} errorMessage - The error message
 * @param {string} timestamp - When the error occurred
 * @return {string} The URL of the error document
 */
function createErrorDocument(requestName, originalText, errorMessage, timestamp) {
  try {
    const outputFolder = DriveApp.getFolderById(
        PropertiesService.getScriptProperties().getProperty("OUTPUT_FOLDER_ID")
    );
    
    const errorDocName = `${requestName} - Translation Error`;
    const newDoc = DocumentApp.create(errorDocName);
    const newDocFile = DriveApp.getFileById(newDoc.getId());
    const newDocBody = newDoc.getBody();
    
    // Add error title
    const title = newDocBody.appendParagraph('Translation Error');
    title.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    title.setBold(true);
    
    // Add error details
    const sections = [
      { heading: "Error Details", content: errorMessage },
      { heading: "Request Name", content: requestName },
      { heading: "Timestamp", content: timestamp ? timestamp.toString() : new Date().toString() },
      { heading: "Original Text (First 1000 characters)", content: originalText ? originalText.substring(0, 1000) : 'No text provided' }
    ];
    
    sections.forEach(section => {
      const header = newDocBody.appendParagraph(section.heading);
      header.setHeading(DocumentApp.ParagraphHeading.HEADING2);
      newDocBody.appendParagraph(section.content);
    });
    
    // Add troubleshooting tips
    const tipsHeader = newDocBody.appendParagraph('Troubleshooting Tips');
    tipsHeader.setHeading(DocumentApp.ParagraphHeading.HEADING2);
    newDocBody.appendParagraph('• Verify the text length is within limits (3000 words)');
    newDocBody.appendParagraph('• Try again in a few minutes if this is a temporary API issue');
    newDocBody.appendParagraph('• Contact your administrator if the problem persists');
    
    newDocFile.moveTo(outputFolder);
    console.log(`Created error document: ${errorDocName}`);
    
    return newDoc.getUrl();
  } catch (error) {
    console.error('Error creating error document: ', error);
    return null;
  }
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