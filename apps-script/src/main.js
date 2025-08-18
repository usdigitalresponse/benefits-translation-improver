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