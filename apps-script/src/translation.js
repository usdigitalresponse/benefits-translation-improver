/**
 * Get the translation prompt from the master prompt document
 * This will attempt to match the content type selected in the form to a tab
 * with type-specific prompt text.
 * If it can't access the tab, it will try to return the text in the document body.
 * If it can't do that, it will return a default prompt string that's better than nothing :P
 * @param {string} contentType - Content type with tab ID format: "Name [TAB: tabId]"
 */
function getTranslationPrompt(contentType) {
  try {
    const contextFolder = DriveApp.getFolderById(CONFIG.CONTEXT_FOLDER_ID);
    const contextFiles = contextFolder.getFilesByType(MimeType.GOOGLE_DOCS);
    
    while (contextFiles.hasNext()) {
      const file = contextFiles.next();
      if (file.getName() === CONFIG.PROMPT_DOCUMENT_NAME) {
        const doc = DocumentApp.openById(file.getId());
        const docFallbackText = doc.getBody().getText();
        
        let tabId = null;
        if (contentType) {
          const tabMatch = contentType.match(CONFIG.TAB_ID_REGEX);
          if (tabMatch) {
            tabId = tabMatch[1];
            console.log(`Extracted tab ID: ${tabId}`);
          }
        }
        
        if (!tabId) {
          console.log('No tab ID specified, using main document body');
          return docFallbackText;
        }
        
        try {
          const tab = doc.getTab(tabId);
          if (!tab) {
            console.log(`Tab ${tabId} not found, using main document body`);
            return docFallbackText;
          }
          
          console.log(`Found custom translation prompt from tab: ${tabId}`);
          return tab.asDocumentTab().getBody().getText();
        } catch (error) {
          console.log(`Error accessing tab ${tabId}, using main document body:`, error);
          return docFallbackText;
        }
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
 * For a given form submission:
 * -- extract form parameters & user responses
 * -- construct the prompt based on user input
 * -- run the translation
 * */
function translateFormSubmission(submissionId) {
  const form = FormApp.openById(CONFIG.TRANSLATION_FORM_ID);
  const itemResponses = form.getResponse(submissionId).getItemResponses();
  let textToTranslate = ''
  let requestName = ''
  let contentType = ''

  itemResponses.forEach(itemResponse => {
    const response = itemResponse.getResponse()
    switch (itemResponse.getItem().getTitle()) {
      case CONFIG.TRANSLATED_TEXT_FORM_ITEM_NAME:
        textToTranslate = response;
        console.log(`Text To Translate: ${textToTranslate}`)
        break;
      case CONFIG.REQUEST_NAME_FORM_ITEM_NAME:
        requestName = response;
        console.log(`Request Name: ${requestName}`)
        break;
      case CONFIG.CONTENT_TYPE_FORM_ITEM_NAME:
        contentType = response;
        console.log(`Content Type: ${contentType}`)
        break;
      default:
        break;
    }
  });

  try {
    const translatedForm = translateText(textToTranslate, getTranslationPrompt(contentType))
    if (translatedForm) {
      createTranslatedDocument(requestName, translatedForm);
      console.log(`Successfully translated ${requestName} for submission id ${submissionId}`)
    }
  } catch (error) {
    console.error(`Error processing request ${requestName} for submission id ${submissionId}: `, error)
  }
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
        max_completion_tokens: CONFIG.MAX_TOKENS,
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