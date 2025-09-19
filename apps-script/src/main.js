/**
 * Set up the form trigger to "listen" for form submitted events.
 * Run this function once to install the trigger.
 */
function setupFormTrigger() {
  if (!PropertiesService.getScriptProperties().getProperty("TRANSLATION_FORM_ID")) {
    console.error('TRANSLATION_FORM_ID is not set in script properties');
    return;
  }
  
  const form = FormApp.openById(PropertiesService.getScriptProperties().getProperty("TRANSLATION_FORM_ID"))
  ScriptApp.newTrigger(CONFIG.FORM_TRIGGER_NAME)
      .forForm(form)
      .onFormSubmit()
      .create()
}

/**
 * Function that runs when the translation form is submitted
 * @param {FormSubmitEvent} e
 * */
function translateOnFormSubmission(e) {
  try {
    // Check if the form submission is from the correct form
    const formId = e.source.getId();
    if (formId !== PropertiesService.getScriptProperties().getProperty("TRANSLATION_FORM_ID")) {
      console.log(`Form submission from unexpected form ID: ${formId}. Expected: ${PropertiesService.getScriptProperties().getProperty("TRANSLATION_FORM_ID")}`);
      return;
    }

    const formResponse = e.response;
    const submissionId = formResponse.getId();
    console.log(`Translation response ID: ${submissionId}, submitted at ${formResponse.getTimestamp()}, by ${formResponse.getRespondentEmail()}`);
    translateFormSubmission(submissionId);
  } catch (error) {
    console.error('Error in translateOnFormSubmission:', error);
  }
}

/**
 * Run this function to remove the translation trigger from Google workspace.
 */
function removeTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === CONFIG.FORM_TRIGGER_NAME) {
      ScriptApp.deleteTrigger(trigger);
      console.log('Trigger removed successfully');
    }
  });
  
  if (triggers.length === 0) {
    console.log('No triggers found to remove');
  }
}

/**
 * This is a utility method you can run to test the translation on a specific form submission.
 * File in the form submission ID you want below and then run.
 */
function testTranslation() {
  const testFormSubmissionId = ''; // Replace with a test form submission ID
  if (!testFormSubmissionId) {
    console.log('Please set a test form submission ID in the testTranslation function');
    return;
  }
  translateFormSubmission(testFormSubmissionId);
}

/**
 * Test the translation prompt loading.
 * This is a utility method you can run to make sure the translation prompt loads.
 */
function testPromptLoading() {
  const prompt = getTranslationPrompt();
  console.log('Translation prompt that will be used:');
  console.log(prompt);
}

/**
 * Test error handling by simulating a failed translation
 * This function helps verify that error documents are created and logged correctly
 */
function testErrorHandling() {
  console.log('Starting error handling test...');
  
  // Set to true to use Gemini, false to use Azure
  const testWithGemini = false;
  
  // Save original API key
  const apiKeyProperty = testWithGemini ? 'GEMINI_API_KEY' : 'AZURE_API_KEY';
  const originalKey = PropertiesService.getScriptProperties().getProperty(apiKeyProperty);
  
  try {
    // Set an invalid API key to force an error
    PropertiesService.getScriptProperties().setProperty(apiKeyProperty, 'INVALID_TEST_KEY');
    
    const mockFormData = {
      textToTranslate: 'This is a test translation that will fail due to invalid API key.',
      requestName: 'ERROR_TEST_' + new Date().getTime(),
      contentType: 'Test Content',
      submissionTimestamp: new Date(),
      respondentEmail: 'test@example.com'
    };
    
    // Temporarily override parseFormResponse to return mock data
    const originalParseFormResponse = parseFormResponse;
    parseFormResponse = function(submissionId) {
      console.log('Using mock form data for testing');
      return mockFormData;
    };
    
    // Run the translation (will fail with invalid key)
    console.log('Running translation with invalid API key...');
    translateFormSubmission('TEST_ERROR_SUBMISSION');
    
    console.log('Error handling test completed. Check:');
    console.log('1. Output folder for error document');
    console.log('2. Tracking sheet for error row with "Yes" in Errored column');
    
    // Restore original parseFormResponse
    parseFormResponse = originalParseFormResponse;
    
  } catch (testError) {
    console.error('Test error:', testError);
  } finally {
    // Always restore the original API key
    if (originalKey) {
      PropertiesService.getScriptProperties().setProperty(apiKeyProperty, originalKey);
      console.log('Original API key restored');
    }
  }
}

/**
 * Test successful translation to verify normal flow still works
 */
function testSuccessfulTranslation() {
  console.log('Starting successful translation test...');
  
  const mockFormData = {
    textToTranslate: 'Hello, this is a test translation.',
    requestName: 'SUCCESS_TEST_' + new Date().getTime(),
    contentType: 'Test Content',
    submissionTimestamp: new Date(),
    respondentEmail: 'test@example.com'
  };
  
  // Temporarily override parseFormResponse to return mock data
  const originalParseFormResponse = parseFormResponse;
  parseFormResponse = function(submissionId) {
    console.log('Using mock form data for testing');
    return mockFormData;
  };
  
  try {
    // Run the translation (should succeed with real API key)
    console.log('Running translation with valid API key...');
    translateFormSubmission('TEST_SUCCESS_SUBMISSION');
    
    console.log('Successful translation test completed. Check:');
    console.log('1. Output folder for translated document');
    console.log('2. Tracking sheet for row with "No" in Errored column');
    
  } catch (testError) {
    console.error('Test error:', testError);
  } finally {
    // Restore original parseFormResponse
    parseFormResponse = originalParseFormResponse;
  }
}