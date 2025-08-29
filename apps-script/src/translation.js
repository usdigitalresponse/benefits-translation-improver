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
    const contextFolder = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty("CONTEXT_FOLDER_ID"));
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
  const form = FormApp.openById(PropertiesService.getScriptProperties().getProperty("TRANSLATION_FORM_ID"));
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
    const prompt = getTranslationPrompt(contentType)
    const translationResult = translateText(textToTranslate, prompt)
    const endTime = new Date().getTime();
    const translationDuration = endTime - startTime;
    
    if (translationResult && translationResult.translatedText) {
      const documentUrl = createTemplatedTranslationDocument(
          requestName,
          translationResult.translatedText,
          textToTranslate,
          prompt
      )
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
 * Fetch glossary terms from Google Sheets
 * @returns {string} Formatted glossary string for prompt inclusion, or empty string if unavailable
 * Glossary strings formatted like the below example:
 *   benefit → beneficio
 */
function getGlossaryFromSheet() {
  try {
    const glossarySheetId = PropertiesService.getScriptProperties().getProperty('GLOSSARY_SHEET_ID');
    if (!glossarySheetId) {
      console.log('No GLOSSARY_SHEET_ID configured in script properties');
      return '';
    }

    const spreadsheet = SpreadsheetApp.openById(glossarySheetId);
    const sheet = spreadsheet.getSheetByName(CONFIG.LEXICON_SHEET_NAME);
    
    if (!sheet) {
      console.log('Sheet "Curated List" not found in glossary spreadsheet');
      return '';
    }

    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      console.log('No glossary data found (only header row or empty)');
      return '';
    }
    
    // Build glossary string, skipping header row
    // Column A: Original English term, Column B: Translated term
    const glossaryPairs = [];
    for (let i = 1; i < data.length; i++) {
      const englishTerm = data[i][0]?.toString().trim();
      const translatedTerm = data[i][1]?.toString().trim();
      
      if (englishTerm && translatedTerm) {
        glossaryPairs.push(`${englishTerm} → ${translatedTerm}`);
      }
    }
    
    if (glossaryPairs.length === 0) {
      console.log('No valid glossary pairs found');
      return '';
    }
    
    console.log(`Loaded ${glossaryPairs.length} glossary terms`);
    return glossaryPairs.join('\n');
    
  } catch (error) {
    console.error('Error fetching glossary from sheet:', error);
    return '';
  }
}

/**
 * Translate text using Azure API with custom prompt
 */
function translateText(content, customPrompt) {
  try {
    // Get glossary terms if available
    const glossaryTerms = getGlossaryFromSheet();
    
    // Build the full prompt with lexicon if available
    let fullPrompt = customPrompt;
    if (glossaryTerms) {
      fullPrompt = `${customPrompt}
        
        Please use this lexicon for consistent terminology:
        ${glossaryTerms}
        
        Text to translate:
        ${content}`;
    } else {
      fullPrompt = `${customPrompt}
        Text to translate:
        ${content}`;
    }

    const apiKey = PropertiesService.getScriptProperties().getProperty('AZURE_API_KEY');
    // TODO format to take the version number and then put that in the document rather than OpenAI model
    const azureUrl = PropertiesService.getScriptProperties().getProperty('AZURE_API_URL')
    if (!apiKey) {
      throw new Error('AZURE_API_KEY not found in script properties');
    }

    if (!azureUrl) {
      throw new Error('AZURE_API_URL not found in script properties')
    }

    const response = UrlFetchApp.fetch(
        azureUrl,
        {
          method: 'POST',
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify({
            messages: [
              { role: 'user', content: fullPrompt }
            ],
            max_tokens: CONFIG.MAX_TOKENS,
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
    const sheet = SpreadsheetApp.openById(
        PropertiesService.getScriptProperties().getProperty("RESPONSE_AGGREGATION_TRACKER_SHEET_ID")
    ).getActiveSheet();
    
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