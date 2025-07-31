// Configuration constants
const CONFIG = {
  OUTPUT_FOLDER_ID: '',
  CONTEXT_FOLDER_ID: '',
  ARCHIVE_FOLDER_ID: '',
  OPENAI_API_KEY: 'KEY', // Replace with your OpenAI API key
  TARGET_LANGUAGE: 'Spanish',
  TRANSLATION_FORM_ID: '',
  
  // Translation settings
  OPENAI_MODEL: 'gpt-4o',
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.3,
  
  // Processing settings
  PROCESSED_MARKER: 'TRANSLATED',
  PROMPT_DOCUMENT_NAME: 'Arizona SNAP Translation Prompt — Modular Workflow Tool for Translators',
  FORM_TRIGGER_NAME: 'translateOnFormSubmission',
  TRANSLATED_TEXT_FORM_ITEM_NAME: 'Please enter the text you want to translate',
  REQUEST_NAME_FORM_ITEM_NAME: 'Translation Request Name',
  CONTENT_TYPE_FORM_ITEM_NAME: 'What is the type of content you want to translate?',
  DAYS_BEFORE_ARCHIVE: 1,
  ARCHIVE_TRIGGER_FUNCTION_NAME: 'archiveOldDocuments',
  TAB_ID_REGEX: /\[TAB: ([^\]]+)]/
};
