
function hideSafeContent() {
  const blockedKeywords = ["review", "ai voice", "ai generated", "ai video"];
  const videos = document.querySelectorAll(
    "ytd-video-renderer, ytd-grid-video-renderer, ytd-rich-grid-slim-media"
  );

  videos.forEach(video => {
    const title = video.querySelector("#video-title")?.innerText.toLowerCase() || "";
    const channel = video.querySelector("#channel-name")?.innerText.toLowerCase() || "";
    if (blockedKeywords.some(keyword => title.includes(keyword) || channel.includes(keyword))) {
      video.style.display = "none";
    }
  });
}

const observer = new MutationObserver(() => hideSafeContent());
observer.observe(document.body, { childList: true, subtree: true });

hideSafeContent();
