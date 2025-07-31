// Word count regex - matches sequences of non-whitespace characters
const WORD_COUNT_REGEX = /\s+/;

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
  const formResponse = form.getResponse(submissionId);
  const itemResponses = formResponse.getItemResponses();
  const submissionTimestamp = formResponse.getTimestamp();
  const respondentEmail = formResponse.getRespondentEmail();
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
    // Latency tracking; a bit hacky but it works!
    const startTime = new Date().getTime();
    const translationResult = translateText(textToTranslate, getTranslationPrompt(contentType))
    const endTime = new Date().getTime();
    const translationDuration = endTime - startTime;
    
    if (translationResult && translationResult.translatedText) {
      const documentUrl = createTranslatedDocument(requestName, translationResult.translatedText);
      console.log(`Successfully translated ${requestName} for submission id ${submissionId}`)
      logTranslationInformation({
        submissionTimestamp,
        respondentEmail,
        requestName,
        contentType,
        textToTranslate,
        translatedText: translationResult.translatedText,
        requestedWordCount: textToTranslate.trim().split(WORD_COUNT_REGEX).length,
        translatedWordCount: translationResult.translatedText.trim().split(WORD_COUNT_REGEX).length,
        translationDuration,
        fullResponse: translationResult.fullResponse,
        documentUrl
      });
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
      return {
        translatedText: data.choices[0].message.content.trim(),
        fullResponse: data
      };
    } else {
      console.error('Unexpected API response:', data);
      return null;
    }
    
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return null;
  }
}

function logTranslationInformation(requestAndResponseData) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.RESPONSE_AGGREGATION_TRACKER_SHEET_ID).getActiveSheet();
    
    const rowData = CONFIG.TRACKING_SHEET_COLUMNS.map(column => {
      // Check if this is a nested path (e.g., "fullResponse.usage.total_tokens")
      if (column.dataKey.includes('.')) {
        const keys = column.dataKey.split('.');
        let value = requestAndResponseData;
        
        // Navigate through nested properties
        for (const key of keys) {
          value = value?.[key];
          if (value === undefined) break;
        }
        
        return value || '';
      } else {
        // Simple property access
        return requestAndResponseData[column.dataKey] || '';
      }
    });
    
    sheet.appendRow(rowData);
    
    console.log('Successfully logged translation data to tracking sheet');
  } catch (error) {
    console.error('Error logging to tracking sheet:', error);
    throw error;
  }
}