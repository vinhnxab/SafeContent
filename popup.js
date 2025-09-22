const DEFAULTS = {
  keywords: [
    "AI review","AI voice","AI movie","review phim AI","giọng đọc AI","video AI",
    "AI generated","AI narration","AI storytelling","phim tóm tắt AI",
    "AI recap","AI script","AI film","AI dubbing","tóm tắt phim AI"
  ],
  blockByTitle: true,
  blockByChannel: true,
  blockByDescription: false,
  enabled: true,
  useRegex: false
};

function getSettings(cb){
  chrome.storage.sync.get(Object.keys(DEFAULTS), (res) => {
    const s = {...DEFAULTS, ...res};
    cb(s);
  });
}

function saveSettings(settings, cb){
  chrome.storage.sync.set(settings, cb);
}

function populate(){
  getSettings((s) => {
    document.getElementById("keywords").value = (s.keywords || []).join("\n");
    document.getElementById("useRegex").checked = !!s.useRegex;
    document.getElementById("blockTitle").checked = !!s.blockByTitle;
    document.getElementById("blockChannel").checked = !!s.blockByChannel;
    document.getElementById("blockDesc").checked = !!s.blockByDescription;
    document.getElementById("enabled").checked = !!s.enabled;
  });
}

document.getElementById("save").addEventListener("click", ()=>{
  const raw = document.getElementById("keywords").value.split("\n").map(s=>s.trim()).filter(Boolean);
  const settings = {
    keywords: raw,
    useRegex: document.getElementById("useRegex").checked,
    blockByTitle: document.getElementById("blockTitle").checked,
    blockByChannel: document.getElementById("blockChannel").checked,
    blockByDescription: document.getElementById("blockDesc").checked,
    enabled: document.getElementById("enabled").checked
  };
  saveSettings(settings, ()=> {
    // trigger content scripts by executing a no-op script in youtube tabs
    chrome.tabs.query({url: "*://www.youtube.com/*"}, (tabs) => {
      for(const t of tabs){
        chrome.scripting.executeScript({target:{tabId: t.id}, func: ()=>{}});
      }
    });
    window.close();
  });
});

document.getElementById("reset").addEventListener("click", ()=>{
  if(!confirm("Reset to built-in defaults?")) return;
  saveSettings(DEFAULTS, ()=> { populate(); window.close(); });
});

document.getElementById("undo").addEventListener("click", ()=>{
  // send message to active youtube tab to undo last hidden
  chrome.tabs.query({active:true,currentWindow:true,url:"*://www.youtube.com/*"}, (tabs) => {
    if(!tabs || !tabs.length) { alert("Open a YouTube tab to undo."); return; }
    chrome.tabs.sendMessage(tabs[0].id, {type:"undo", count:1}, (res) => {
      window.close();
    });
  });
});

document.getElementById("export").addEventListener("click", ()=>{
  chrome.runtime.sendMessage({type: "exportKeywords"}, (res) => {
    // background will respond by fetching storage or we can fetch directly
    chrome.storage.sync.get(Object.keys(DEFAULTS), (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Anti-FactoryTube-keywords.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  });
});

const importFile = document.getElementById("importFile");
document.getElementById("importBtn").addEventListener("click", ()=> importFile.click());
importFile.addEventListener("change", (ev) => {
  const f = ev.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try{
      const obj = JSON.parse(e.target.result);
      // basic validation
      const allowKeys = ["keywords","blockByTitle","blockByChannel","blockByDescription","enabled","useRegex"];
      const payload = {};
      for(const k of allowKeys){
        if(obj[k] !== undefined) payload[k] = obj[k];
      }
      chrome.runtime.sendMessage({type:"importKeywords", value: payload}, (res) => {
        populate();
        window.close();
      });
    }catch(err){
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(f);
});

populate();