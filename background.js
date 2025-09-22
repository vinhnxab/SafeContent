chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "sc_add_channel",
    title: "SafeContent: Add this channel to blacklist",
    contexts: ["page", "selection", "link"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if(info.menuItemId === "sc_add_channel" && tab){
    try{
      // Try to extract channel name from page by executing script
      const [{result}] = await chrome.scripting.executeScript({
        target: {tabId: tab.id},
        func: () => {
          // Attempt common selectors for channel name on youtube watch pages or channel pages
          const c1 = document.querySelector("#meta-contents #channel-name") || document.querySelector("ytd-channel-name");
          let name = "";
          if(c1) name = c1.innerText || c1.textContent || "";
          // fallback: document.title trimmed
          if(!name) name = document.title || "";
          return name.trim();
        }
      });
      const channelName = result || "";
      if(channelName){
        // send message to content script to add keyword
        chrome.tabs.sendMessage(tab.id, {type: "addKeyword", value: channelName});
        // also update storage to ensure sync
        chrome.storage.sync.get(["keywords"], (res) => {
          const kws = (res.keywords || []).slice();
          if(!kws.map(k=>k.toLowerCase()).includes(channelName.toLowerCase())){
            kws.push(channelName);
            chrome.storage.sync.set({keywords: kws});
          }
        });
        // notify user
        chrome.notifications?.create?.({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "SafeContent",
          message: `Added "${channelName}" to blacklist`
        });
      } else {
        chrome.notifications?.create?.({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: "SafeContent",
          message: "Could not detect channel name on this page."
        });
      }
    }catch(e){
      console.error(e);
    }
  }
});