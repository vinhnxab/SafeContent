
// Enhanced background script with better error handling
chrome.runtime.onInstalled.addListener((details) => {
  try {
    console.log("SafeContent installed successfully.");
    
    // Set default settings if needed
    chrome.storage.sync.get(['blockedKeywords'], (result) => {
      if (!result.blockedKeywords) {
        chrome.storage.sync.set({
          blockedKeywords: [
            "review", "ai voice", "ai generated", "ai video", 
            "fake voice", "synthetic voice", "text to speech",
            "voice clone", "voice synthesis", "deepfake",
            "ai narrator", "robot voice", "computer voice"
          ]
        });
      }
    });
    
  } catch (error) {
    console.error("SafeContent: Error during installation", error);
  }
});

// Handle extension updates
chrome.runtime.onStartup.addListener(() => {
  console.log("SafeContent started.");
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === "contentFiltered") {
      console.log(`SafeContent: Filtered ${request.count} videos on ${sender.tab?.url}`);
    }
  } catch (error) {
    console.error("SafeContent: Error handling message", error);
  }
});
