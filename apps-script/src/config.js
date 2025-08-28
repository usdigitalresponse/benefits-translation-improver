// Configuration constants
const CONFIG = {
  TARGET_LANGUAGE: 'Spanish',

  // Translation settings
  OPENAI_MODEL: 'gpt-4.1',
  MAX_TOKENS: 4000,
  TEMPERATURE: 0,
  
  // Processing settings
  PROCESSED_MARKER: 'TRANSLATED',
  PROMPT_DOCUMENT_NAME: 'Arizona SNAP Translation Prompt — Modular Workflow Tool for Translators',
  LEXICON_SHEET_NAME: 'Curated List',
  FORM_TRIGGER_NAME: 'translateOnFormSubmission',
  TRANSLATED_TEXT_FORM_ITEM_NAME: 'Please enter the text you want to translate or evaluate (max. 3000 words)',
  REQUEST_NAME_FORM_ITEM_NAME: 'Please enter a descriptive file name you will remember to locate your translation/evaluation.',
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
