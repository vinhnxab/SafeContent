// SafeContent v1.1 content script
const SELECTORS = [
  "ytd-video-renderer",
  "ytd-grid-video-renderer",
  "ytd-rich-item-renderer",
  "ytd-compact-video-renderer",
  "ytd-video-row-renderer",
  "ytd-playlist-video-renderer",
  // YouTube Shorts selectors
  "ytd-reel-item-renderer",
  "ytd-shorts-renderer",
  "ytd-grid-reel-renderer",
  "ytd-reel-player-header-renderer",
  "ytd-reel-shelf-renderer",
  "ytd-reel-player-overlay-renderer"
];

let settings = {
  keywords: [
    "AI review","AI voice","AI movie","review phim AI","giọng đọc AI","video AI",
    "AI generated","AI narration","AI storytelling","phim tóm tắt AI",
    "AI recap","AI script","AI film","AI dubbing","tóm tắt phim AI",
    // Shorts-specific keywords
    "AI shorts","AI reel","AI tiktok","AI viral","AI trend","AI compilation",
    "fake voice","synthetic voice","robot voice","computer voice","AI narrator"
  ],
  blockByTitle: true,
  blockByChannel: true,
  blockByDescription: false,
  enabled: true,
  useRegex: false
};

let recentlyHidden = []; // store {id, selector, html, parent, index} for undo (in-memory)

function loadSettings(cb){
  chrome.storage.sync.get(Object.keys(settings), (res) => {
    settings = {...settings, ...res};
    cb && cb();
  });
}

function textOfNode(node){
  try { return node.innerText || node.textContent || ""; } catch(e){ return ""; }
}

function matchKeywords(text){
  if(!text) return false;
  if(settings.useRegex){
    for(const pattern of settings.keywords){
      try{
        const re = new RegExp(pattern, "i");
        if(re.test(text)) return true;
      }catch(e){
        // invalid regex, skip
        continue;
      }
    }
  } else {
    const lowered = text.toLowerCase();
    for(const k of settings.keywords){
      const kw = (k || "").toLowerCase().trim();
      if(!kw) continue;
      if(lowered.includes(kw)) return true;
    }
  }
  return false;
}

function hideElement(item){
  if(item.dataset.antifactoryHidden === "1") return;
  
  // Check if it's a Shorts element for special handling
  const isShorts = item.matches("ytd-reel-item-renderer, ytd-shorts-renderer, ytd-grid-reel-renderer");
  
  // save minimal info for undo: parent and nextSibling
  const parent = item.parentElement;
  const next = item.nextSibling;
  recentlyHidden.push({id: Date.now() + Math.random(), el: item, parent: parent, next: next, isShorts: isShorts});
  item.dataset.safecontentHidden = "1";
  
  if (isShorts) {
    // Special animation for Shorts - faster and more subtle
    item.style.transition = "opacity 0.15s ease, transform 0.15s ease";
    item.style.opacity = "0";
    item.style.transform = "scale(0.95)";
    setTimeout(()=> {
      try{ 
        item.style.display = "none"; 
        item.style.transform = "";
      } catch(e){}
    }, 160);
  } else {
    // Regular video animation
    item.style.transition = "opacity 0.25s ease, height 0.25s ease, margin 0.25s ease, padding 0.25s ease";
    item.style.opacity = "0";
    setTimeout(()=> {
      try{ item.style.display = "none"; } catch(e){}
    }, 260);
  }
  
  // keep recentlyHidden array bounded
  if(recentlyHidden.length > 100) recentlyHidden.shift();
}

function processOnce(){
  if(!settings.enabled) return;
  for(const sel of SELECTORS){
    const items = document.querySelectorAll(sel);
    items.forEach(item => {
      if(item.dataset.safecontentHidden === "1") return;

      let title = "";
      let channel = "";
      let desc = "";

      // Enhanced selectors for both regular videos and Shorts
      const t = item.querySelector("#video-title") || 
                item.querySelector("a#video-title") ||
                item.querySelector("#reel-title") ||
                item.querySelector("[id*='title']") ||
                item.querySelector("h3") ||
                item.querySelector(".title");
      if(t) title = textOfNode(t);

      const c = item.querySelector("#channel-name") || 
                item.querySelector("ytd-channel-name") ||
                item.querySelector("#reel-channel-name") ||
                item.querySelector("[id*='channel']") ||
                item.querySelector(".channel-name");
      if(c) channel = textOfNode(c);

      const d = item.querySelector("#description-text") || 
                item.querySelector("#meta") || 
                item.querySelector("#description") ||
                item.querySelector("#reel-description") ||
                item.querySelector("[id*='description']");
      if(d) desc = textOfNode(d);

      let hide = false;
      if(settings.blockByTitle && matchKeywords(title)) hide = true;
      if(settings.blockByChannel && matchKeywords(channel)) hide = true;
      if(settings.blockByDescription && settings.blockByDescription && matchKeywords(desc)) hide = true;

      if(hide) hideElement(item);
    });
  }
}

// Undo last N hidden items
function undoLast(n=1){
  for(let i=0;i<n;i++){
    const rec = recentlyHidden.pop();
    if(!rec) return;
    try{
      const el = rec.el;
      el.style.display = "";
      el.style.opacity = "1";
      delete el.dataset.safecontentHidden;
      // try to reinsert at stored position
      if(rec.parent){
        if(rec.next && rec.next.parentElement === rec.parent){
          rec.parent.insertBefore(el, rec.next);
        } else {
          rec.parent.appendChild(el);
        }
      }
    }catch(e){ console.warn("Undo failed", e); }
  }
}

// Add channel/title pattern to keywords
function addKeyword(k){
  if(!k) return;
  chrome.storage.sync.get(["keywords"], (res) => {
    const kws = (res.keywords || settings.keywords || []).slice();
    if(kws.map(x=>x.toLowerCase()).includes(k.toLowerCase())) return;
    kws.push(k);
    chrome.storage.sync.set({keywords: kws});
  });
}

// Observe and process
const observer = new MutationObserver((mutations) => {
  clearTimeout(window._sc_debounce);
  window._sc_debounce = setTimeout(()=> {
    loadSettings(processOnce);
  }, 150);
});

function init(){
  loadSettings(() => {
    processOnce();
    observer.observe(document.body, {childList: true, subtree: true});
  });
}

init();

// Handle messages from popup/background
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if(msg && msg.type === "undo"){
    undoLast(msg.count || 1);
    sendResponse({ok: true});
  } else if(msg && msg.type === "addKeyword"){
    addKeyword(msg.value);
    sendResponse({ok: true});
  } else if(msg && msg.type === "exportKeywords"){
    chrome.storage.sync.get(["keywords", "blockByTitle","blockByChannel","blockByDescription","enabled","useRegex"], (res) => {
      sendResponse({data: res});
    });
    return true; // async response
  } else if(msg && msg.type === "importKeywords"){
    // msg.value should be object with keys
    const im = msg.value || {};
    chrome.storage.sync.set(im, () => {
      loadSettings(processOnce);
      sendResponse({ok: true});
    });
    return true;
  }
});