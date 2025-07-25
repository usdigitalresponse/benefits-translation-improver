// Configuration constants
const CONFIG = {
  OUTPUT_FOLDER_ID: '',
  CONTEXT_FOLDER_ID: '',
  OPENAI_API_KEY: 'KEY', // Replace with your OpenAI API key
  TARGET_LANGUAGE: 'Spanish',
  TRANSLATION_FORM_ID: '',
  
  // Translation settings
  OPENAI_MODEL: 'gpt-3.5-turbo',
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.3,
  
  // Processing settings
  TRIGGER_INTERVAL_MINUTES: 5,
  PROCESSED_MARKER: 'TRANSLATED',
  PROMPT_DOCUMENT_NAME: 'Translate_Prompt',
  FORM_TRIGGER_NAME: 'translateOnFormSubmission',
  TRANSLATED_TEXT_FORM_ITEM_NAME: 'Text to be Translated',
  REQUEST_NAME_FORM_ITEM_NAME: 'Request Name',
};
