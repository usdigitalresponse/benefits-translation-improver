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
  return `
    You are a professional translator. Please translate the following English text to ${CONFIG.TARGET_LANGUAGE}.
    Please provide only the translation, no explanations.
   `;
}

/**
 * Parse form response and extract translation request data
 * @param {string} submissionId - The form submission ID
 * @returns {Object} Object containing all form data needed for translation
 */
function parseFormResponse(submissionId) {
  const form = FormApp.openById(PropertiesService.getScriptProperties().getProperty("TRANSLATION_FORM_ID"));
  const formResponse = form.getResponse(submissionId);
  const submissionTimestamp = formResponse.getTimestamp();
  const respondentEmail = formResponse.getRespondentEmail();
  
  const itemResponses = formResponse.getItemResponses();
  let textToTranslate = '';
  let requestName = '';
  let contentType = '';

  itemResponses.forEach(itemResponse => {
    const response = itemResponse.getResponse();
    switch (itemResponse.getItem().getTitle()) {
      case CONFIG.TRANSLATED_TEXT_FORM_ITEM_NAME:
        textToTranslate = response;
        console.log(`Text To Translate: ${textToTranslate}`);
        break;
      case CONFIG.REQUEST_NAME_FORM_ITEM_NAME:
        requestName = response;
        console.log(`Request Name: ${requestName}`);
        break;
      case CONFIG.CONTENT_TYPE_FORM_ITEM_NAME:
        contentType = response;
        console.log(`Content Type: ${contentType}`);
        break;
      default:
        break;
    }
  });

  return {
    textToTranslate,
    requestName,
    contentType,
    submissionTimestamp,
    respondentEmail
  };
}

/**
 * For a given form submission:
 * -- extract form parameters & user responses
 * -- construct the prompt based on user input
 * -- run the translation
 * */
function translateFormSubmission(submissionId) {
  // Set this to true to use Gemini, false to use Azure
  const useGemini = false;
  
  const {
    textToTranslate,
    requestName,
    contentType,
    submissionTimestamp,
    respondentEmail
  } = parseFormResponse(submissionId);

  try {
    // Latency tracking; a bit hacky but it works!
    const startTime = new Date().getTime();
    const prompt = getTranslationPrompt(contentType);
    const fullPrompt = buildFullPrompt(textToTranslate, prompt);
    
    // Call the appropriate translation API based on the flag
    const translationResult = useGemini 
      ? translateTextWithGemini(fullPrompt)
      : translateTextWithAzure(fullPrompt);
    
    const endTime = new Date().getTime();
    const translationDuration = endTime - startTime;
    
    if (translationResult && translationResult.translatedText) {
      // Extract model name based on which API was used
      const modelName = useGemini 
        ? translationResult.fullResponse.modelVersion 
        : translationResult.fullResponse.model;
      
      const documentUrl = createTemplatedTranslationDocument(
          requestName,
          translationResult.translatedText,
          textToTranslate,
          prompt,
          modelName
      )
      console.log(`Successfully translated ${requestName} for submission id ${submissionId}`)
      
      // Select the correct column mapping for the tracker based on the API used
      const columnMapping = useGemini 
        ? CONFIG.GEMINI_TRACKING_SHEET_COLUMNS 
        : CONFIG.TRACKING_SHEET_COLUMNS;
      
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
      }, columnMapping);
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
 * Fetch SNAP terms with definitions from Google Sheets
 * @returns {string} Formatted SNAP terms string for prompt inclusion, or empty string if unavailable
 */
function getSNAPTermsFromSheet() {
  try {
    const glossarySheetId = PropertiesService.getScriptProperties().getProperty('GLOSSARY_SHEET_ID');
    
    if (!glossarySheetId) {
      console.log('No GLOSSARY_SHEET_ID configured in script properties');
      return '';
    }

    const spreadsheet = SpreadsheetApp.openById(glossarySheetId);
    const sheet = spreadsheet.getSheetByName(CONFIG.SNAP_TERMS_TAB_NAME);
    
    if (!sheet) {
      console.log(`Sheet "${CONFIG.SNAP_TERMS_TAB_NAME}" not found in glossary spreadsheet`);
      return '';
    }

    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      console.log('No SNAP terms data found (only header row or empty)');
      return '';
    }
    
    // Build SNAP terms string with all 4 columns of context
    // Column A: English Term, Column B: AZ approved English definition
    // Column C: Spanish term, Column D: Spanish definition
    const snapTerms = [];
    for (let i = 1; i < data.length; i++) {
      const englishTerm = data[i][0]?.toString().trim();
      const englishDef = data[i][1]?.toString().trim();
      const spanishTerm = data[i][2]?.toString().trim();
      const spanishDef = data[i][3]?.toString().trim();
      
      if (englishTerm || spanishTerm) {
        let termEntry = [];
        if (englishTerm) termEntry.push(`English Term: ${englishTerm}`);
        if (englishDef) termEntry.push(`English Definition: ${englishDef}`);
        if (spanishTerm) termEntry.push(`Spanish Term: ${spanishTerm}`);
        if (spanishDef) termEntry.push(`Spanish Definition: ${spanishDef}`);
        
        if (termEntry.length > 0) {
          snapTerms.push(termEntry.join('\n'));
        }
      }
    }
    
    if (snapTerms.length === 0) {
      console.log('No valid SNAP terms found');
      return '';
    }
    
    console.log(`Loaded ${snapTerms.length} SNAP terms with definitions`);
    return snapTerms.join('\n\n');
    
  } catch (error) {
    console.error('Error fetching SNAP terms from sheet:', error);
    return '';
  }
}

function buildFullPrompt(content, customPrompt) {
    // Get glossary terms and SNAP terms if available
    const glossaryTerms = getGlossaryFromSheet();
    const snapTerms = getSNAPTermsFromSheet();

    // Build the full prompt with lexicon and SNAP terms if available
    let fullPrompt = customPrompt;
    
    // Add glossary if available
    if (glossaryTerms) {
      fullPrompt += `
        
        Please use this lexicon for consistent terminology:
        ${glossaryTerms}`;
    }
    
    // Add SNAP terms with definitions if available
    if (snapTerms) {
      fullPrompt += `
        
        Please reference these SNAP program terms and their official definitions:
        ${snapTerms}`;
    }
    
    // Add the text to translate
    fullPrompt += `
        
        Text to translate:
        ${content}`;
    
    return fullPrompt;
}

/**
 * Translate text using Azure API with full prompt
 */
function translateTextWithAzure(fullPrompt) {
  try {

    const apiKey = PropertiesService.getScriptProperties().getProperty('AZURE_API_KEY');
    const deploymentName = PropertiesService.getScriptProperties().getProperty('AZURE_DEPLOYMENT_NAME');
    const resourceName = PropertiesService.getScriptProperties().getProperty('AZURE_RESOURCE_NAME');
    const azureApiVersion = PropertiesService.getScriptProperties().getProperty('AZURE_API_VERSION');

    if (!apiKey) {
      throw new Error('AZURE_API_KEY not found in script properties');
    }
    if (!deploymentName) {
      throw new Error('AZURE_DEPLOYMENT_NAME not found in script properties');
    }
    if (!resourceName) {
      throw new Error('AZURE_RESOURCE_NAME not found in script properties');
    }
    if (!azureApiVersion) {
      throw new Error('AZURE_API_VERSION not found in script properties');
    }

    const azureEndpoint = `https://${resourceName}.openai.azure.com/openai/deployments/${deploymentName}/chat/completions?api-version=${azureApiVersion}`;

    const response = UrlFetchApp.fetch(
        azureEndpoint,
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
    console.error('Error calling Azure OpenAI API:', error);
    return null;
  }
}

/**
 * Translate text using Gemini API with full prompt
 */
function translateTextWithGemini(fullPrompt) {
  try {

    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    const geminiVersion = PropertiesService.getScriptProperties().getProperty('GEMINI_VERSION');
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in script properties');
    }
    if (!geminiVersion) {
      throw new Error('GEMINI_VERSION not found in script properties');
    }

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiVersion}:generateContent`;

    const response = UrlFetchApp.fetch(
        geminiEndpoint,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: fullPrompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: CONFIG.TEMPERATURE,
              maxOutputTokens: CONFIG.MAX_TOKENS
            }
          })
    });

    const data = JSON.parse(response.getContentText());
    
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return {
        translatedText: data.candidates[0].content.parts[0].text.trim(),
        fullResponse: data
      };
    } else {
      console.error('Unexpected Gemini API response:', data);
      return null;
    }
    
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    return null;
  }
}

function logTranslationInformation(requestAndResponseData, columnMapping = CONFIG.TRACKING_SHEET_COLUMNS) {
  try {
    const sheet = SpreadsheetApp.openById(
        PropertiesService.getScriptProperties().getProperty("RESPONSE_AGGREGATION_TRACKER_SHEET_ID")
    ).getActiveSheet();
    
    const rowData = columnMapping.map(column => {
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