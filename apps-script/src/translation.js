/**
 * Process a single document for translation
 */
function processDocument(file) {
  try {
    const doc = DocumentApp.openById(file.getId());
    const content = doc.getBody().getText();
    
    if (!content.trim()) {
      console.log('Document is empty, skipping');
      return;
    }
    
    const translation = translateText(content, getTranslationPrompt());
    
    if (translation) {
      createTranslatedDocument(file.getName(), translation);
      console.log(`Successfully translated: ${file.getName()}`);
    }
    
  } catch (error) {
    console.error(`Error processing document ${file.getName()}:`, error);
  }
}

/**
 * Get the translation prompt from the "Translate_Prompt" document
 */
function getTranslationPrompt() {
  try {
    const contextFolder = DriveApp.getFolderById(CONFIG.CONTEXT_FOLDER_ID);
    const contextFiles = contextFolder.getFilesByType(MimeType.GOOGLE_DOCS);
    
    while (contextFiles.hasNext()) {
      const file = contextFiles.next();
      if (file.getName() === CONFIG.PROMPT_DOCUMENT_NAME) {
        const doc = DocumentApp.openById(file.getId());
        const promptText = doc.getBody().getText();
        console.log('Found custom translation prompt');
        return promptText;
      }
    }
    
    console.log(`${CONFIG.PROMPT_DOCUMENT_NAME} document not found, using default prompt`);
    return getDefaultPrompt();
    
  } catch (error) {
    console.error('Error getting translation prompt:', error);
    return getDefaultPrompt();
  }
}

/**
 * Get default translation prompt
 */
function getDefaultPrompt() {
  return `You are a professional translator. Please translate the following English text to ${CONFIG.TARGET_LANGUAGE}. Please provide only the translation, no explanations.`;
}

/**
 * Translate text using OpenAI API with custom prompt
 */
function translateText(content, customPrompt) {
  try {
    const fullPrompt = `${customPrompt}
        Text to translate:
        ${content}`;

    const response = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({
        model: CONFIG.OPENAI_MODEL,
        messages: [
          { role: 'user', content: fullPrompt }
        ],
        max_tokens: CONFIG.MAX_TOKENS,
        temperature: CONFIG.TEMPERATURE
      })
    });
    
    const data = JSON.parse(response.getContentText());
    
    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content.trim();
    } else {
      console.error('Unexpected API response:', data);
      return null;
    }
    
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return null;
  }
}