
document.getElementById("run").addEventListener("click", () => {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    chrome.scripting.executeScript({
      target: {tabId: tabs[0].id},
      function: () => {
        alert("Đã lọc lại YouTube!");
      }
    });
  });
});
