
const HOURS_IN_A_DAY = 24
const MINUTES_IN_AN_HOUR = 60
const SECONDS_IN_A_MINUTE = 60
const MILLISECONDS_IN_A_SECOND = 1000

/**
 * Archive old documents from output folder to archive folder
 * Runs twice daily via time-based triggers (6 AM and 6 PM, in script time zone),
 * to try to catch edge cases from standard business hour operations.
 * 
 * With DAYS_BEFORE_ARCHIVE = 1, documents will be archived as follows:
 * - Document created Monday 9 AM → archived Tuesday 6 PM (33 hours later)
 * - Document created Monday 4 PM → archived Tuesday 6 PM (26 hours later)  
 * - Document created Monday 7 PM → archived Wednesday 6 AM (35 hours later)
 * - Document created Tuesday 5 AM → archived Wednesday 6 PM (37 hours later)
 * 
 * Maximum time before archive: ~37 hours (just missed morning trigger)
 * Minimum time before archive: ~24 hours (created just before threshold)
 */
function archiveOldDocuments() {
  try {
    console.log('Starting archive process...');
    
    const outputFolder = DriveApp.getFolderById(
        PropertiesService.getScriptProperties().getProperty("OUTPUT_FOLDER_ID")
    );
    const archiveFolder = DriveApp.getFolderById(
        PropertiesService.getScriptProperties().getProperty("ARCHIVE_FOLDER_ID")
    );
    const files = outputFolder.getFiles();
    
    const now = new Date();
    const archiveThreshold = new Date(
        now.getTime() -
        (
            CONFIG.DAYS_BEFORE_ARCHIVE *
            HOURS_IN_A_DAY *
            MINUTES_IN_AN_HOUR *
            SECONDS_IN_A_MINUTE *
            MILLISECONDS_IN_A_SECOND
        )
    );
    
    let archivedCount = 0;
    let processedCount = 0;
    
    while (files.hasNext()) {
      const file = files.next();
      processedCount++;
      
      const createdDate = file.getDateCreated();
      
      if (createdDate < archiveThreshold) {
        try {
          // Move file to archive folder
          // Use moveTo() for shared drive compatibility
          file.moveTo(archiveFolder);
          
          console.log(`Archived: ${file.getName()} (created: ${createdDate.toISOString()})`);
          archivedCount++;
        } catch (moveError) {
          console.error(`Failed to archive file ${file.getName()}:`, moveError);
        }
      }
    }
    
    console.log(`Archive complete. Processed ${processedCount} files, archived ${archivedCount} files.`);
    
  } catch (error) {
    console.error('Error in archive process:', error);
  }
}

/**
 * Set up time-based triggers for archiving
 * Creates two daily triggers: one at 6 AM and one at 6 PM
 * NOTE: This should run in the script project's timezone.
 * You can set this by going to "Project Settings" on the left-hand side of the script page,
 * and adjusting the project time zone.
 */
function setupArchiveTriggers() {
  try {
    // Remove any existing archive triggers first
    removeArchiveTriggers();
    
    // Create morning trigger (6 AM)
    ScriptApp.newTrigger(CONFIG.ARCHIVE_TRIGGER_FUNCTION_NAME)
      .timeBased()
      .atHour(6)
      .everyDays(1)
      .create();
    console.log('Created morning archive trigger (6 AM)');
    
    // Create evening trigger (6 PM)
    ScriptApp.newTrigger(CONFIG.ARCHIVE_TRIGGER_FUNCTION_NAME)
      .timeBased()
      .atHour(18)
      .everyDays(1)
      .create();
    console.log('Created evening archive trigger (6 PM)');
    
  } catch (error) {
    console.error('Error setting up archive triggers:', error);
  }
}

/**
 * Manually archive all old documents (for testing or one-time cleanup)
 */
function manualArchiveOldDocuments() {
  archiveOldDocuments();
}

/**
 * Remove archive triggers
 * Useful for disabling automatic archiving
 */
function removeArchiveTriggers() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let removedCount = 0;
    
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === CONFIG.ARCHIVE_TRIGGER_FUNCTION_NAME) {
        ScriptApp.deleteTrigger(trigger);
        removedCount++;
        console.log(`Removed archive trigger scheduled at hour ${trigger.getHour ? trigger.getHour() : 'N/A'}`);
      }
    });
    
    if (removedCount > 0) {
      console.log(`Successfully removed ${removedCount} archive trigger(s)`);
    } else {
      console.log('No archive triggers found to remove');
    }
    
  } catch (error) {
    console.error('Error removing archive triggers:', error);
  }
}