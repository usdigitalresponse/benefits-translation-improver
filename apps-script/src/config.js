// Configuration constants
const CONFIG = {
  SOURCE_FOLDER_ID: '',
  OUTPUT_FOLDER_ID: '',
  CONTEXT_FOLDER_ID: '',
  OPENAI_API_KEY: 'KEY', // Replace with your OpenAI API key
  TARGET_LANGUAGE: 'Spanish',
  
  // Translation settings
  OPENAI_MODEL: 'gpt-3.5-turbo',
  MAX_TOKENS: 2000,
  TEMPERATURE: 0.3,
  
  // Processing settings
  TRIGGER_INTERVAL_MINUTES: 5,
  PROCESSED_MARKER: 'TRANSLATED',
  PROMPT_DOCUMENT_NAME: 'Translate_Prompt',
  TRIGGER_NAME: 'translateOnFileAdded'
};