// Configuration constants
const CONFIG = {
  OUTPUT_FOLDER_ID: '',
  CONTEXT_FOLDER_ID: '',
  ARCHIVE_FOLDER_ID: '',
  TARGET_LANGUAGE: 'Spanish',
  TRANSLATION_FORM_ID: '',
  RESPONSE_AGGREGATION_TRACKER_SHEET_ID: '',
  
  // Translation settings
  OPENAI_MODEL: 'gpt-4o',
  MAX_TOKENS: 4000,
  TEMPERATURE: 0,
  
  // Processing settings
  PROCESSED_MARKER: 'TRANSLATED',
  PROMPT_DOCUMENT_NAME: 'Arizona SNAP Translation Prompt — Modular Workflow Tool for Translators',
  FORM_TRIGGER_NAME: 'translateOnFormSubmission',
  TRANSLATED_TEXT_FORM_ITEM_NAME: 'Please enter the text you want to translate',
  REQUEST_NAME_FORM_ITEM_NAME: 'Translation Request Name',
  CONTENT_TYPE_FORM_ITEM_NAME: 'What is the type of content you want to translate?',
  DAYS_BEFORE_ARCHIVE: 1,
  ARCHIVE_TRIGGER_FUNCTION_NAME: 'archiveOldDocuments',
  TAB_ID_REGEX: /\[TAB: ([^\]]+)]/,
  
  // Tracking sheet columns - order matters!
  TRACKING_SHEET_COLUMNS: [
    { header: 'Submission Timestamp', dataKey: 'submissionTimestamp' },
    { header: 'Respondent Email', dataKey: 'respondentEmail' },
    { header: 'Request Name', dataKey: 'requestName' },
    { header: 'Content Type', dataKey: 'contentType' },
    { header: 'Requested Word Count', dataKey: 'requestedWordCount' },
    { header: 'Translated Word Count', dataKey: 'translatedWordCount' },
    { header: 'Translated Document URL', dataKey: 'documentUrl' },
    { header: 'Translation Duration (ms)', dataKey: 'translationDuration' },
    // The below refer to the paths w/in the OpenAI response object, as described here:
    // https://platform.openai.com/docs/api-reference/chat/object
    // If another API is used, you should change these to map to whatever the new response object is
    { header: 'AI Model', dataKey: 'fullResponse.model' },
    { header: 'Prompt Tokens', dataKey: 'fullResponse.usage.prompt_tokens' },
    { header: 'Completion Tokens', dataKey: 'fullResponse.usage.completion_tokens' },
    { header: 'Total Tokens', dataKey: 'fullResponse.usage.total_tokens' },
    // Add more columns here as needed
  ]
};
