
// Enhanced keyword filtering with better detection
function hideSafeContent() {
  try {
    // Expanded and more specific blocked keywords
    const blockedKeywords = [
      "review", "ai voice", "ai generated", "ai video", 
      "fake voice", "synthetic voice", "text to speech",
      "voice clone", "voice synthesis", "deepfake",
      "ai narrator", "robot voice", "computer voice"
    ];
    
    // More comprehensive selectors for YouTube video elements
    const videoSelectors = [
      "ytd-video-renderer",
      "ytd-grid-video-renderer", 
      "ytd-rich-grid-slim-media",
      "ytd-compact-video-renderer",
      "ytd-playlist-video-renderer",
      "ytd-video-meta-block",
      "ytd-rich-item-renderer",
      "ytd-reel-item-renderer"
    ];
    
    const videos = document.querySelectorAll(videoSelectors.join(", "));
    let hiddenCount = 0;

    videos.forEach(video => {
      try {
        // Skip if already processed and hidden
        if (video.getAttribute("data-safecontent-hidden") === "true") {
          return;
        }
        
        // Try multiple selectors for title and channel
        const titleElement = video.querySelector("#video-title, .ytd-video-meta-block #video-title, a#video-title, [id*='video-title']");
        const channelElement = video.querySelector("#channel-name, .ytd-video-meta-block #channel-name, #text, [id*='channel-name']");
        
        const title = (titleElement?.innerText || titleElement?.textContent || "").toLowerCase();
        const channel = (channelElement?.innerText || channelElement?.textContent || "").toLowerCase();
        const ariaLabel = (video.getAttribute("aria-label") || "").toLowerCase();
        
        // Check for blocked keywords with improved matching
        const shouldHide = blockedKeywords.some(keyword => {
          const keywordLower = keyword.toLowerCase();
          return title.includes(keywordLower) || 
                 channel.includes(keywordLower) ||
                 ariaLabel.includes(keywordLower) ||
                 // Check for partial matches in title words
                 title.split(/\s+/).some(word => word.includes(keywordLower));
        });
        
        if (shouldHide) {
          video.style.display = "none";
          video.setAttribute("data-safecontent-hidden", "true");
          hiddenCount++;
        }
      } catch (error) {
        console.warn("SafeContent: Error processing video element", error);
      }
    });
    
    // Log filtering results for debugging
    if (hiddenCount > 0) {
      console.log(`SafeContent: Hidden ${hiddenCount} videos with blocked content`);
    }
    
  } catch (error) {
    console.error("SafeContent: Error in hideSafeContent function", error);
  }
}

// Debounce function to prevent excessive calls
let timeoutId;
function debounceHideContent() {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(hideSafeContent, 100);
}

// Optimized observer with better performance
const observer = new MutationObserver((mutations) => {
  // Only process if new video elements are added
  const hasNewVideos = mutations.some(mutation => 
    Array.from(mutation.addedNodes).some(node => 
      node.nodeType === 1 && (
        node.matches?.("ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-grid-slim-media") ||
        node.querySelector?.("ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-grid-slim-media")
      )
    )
  );
  
  if (hasNewVideos) {
    debounceHideContent();
  }
});

// Only run on YouTube pages
if (window.location.hostname.includes('youtube.com')) {
  // Start observing when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, { childList: true, subtree: true });
      hideSafeContent();
    });
  } else {
    observer.observe(document.body, { childList: true, subtree: true });
    hideSafeContent();
  }
} else {
  console.log("SafeContent: Not running on YouTube page");
}
