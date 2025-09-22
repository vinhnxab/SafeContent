
document.addEventListener("DOMContentLoaded", () => {
  const runButton = document.getElementById("run");
  
  if (runButton) {
    runButton.addEventListener("click", async () => {
      try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        if (!tab.url.includes('youtube.com')) {
          alert("Vui lòng mở YouTube trước khi sử dụng extension này!");
          return;
        }
        
        // Execute the content filtering function
        await chrome.scripting.executeScript({
          target: {tabId: tab.id},
          function: () => {
            // Re-run the content filtering
            if (typeof hideSafeContent === 'function') {
              hideSafeContent();
            }
            
            // Show feedback to user
            const notification = document.createElement('div');
            notification.textContent = 'Đã lọc lại YouTube!';
            notification.style.cssText = `
              position: fixed;
              top: 20px;
              right: 20px;
              background: #4CAF50;
              color: white;
              padding: 10px 20px;
              border-radius: 5px;
              z-index: 10000;
              font-family: Arial, sans-serif;
            `;
            document.body.appendChild(notification);
            
            setTimeout(() => {
              notification.remove();
            }, 3000);
          }
        });
        
        // Update button text temporarily
        const originalText = runButton.textContent;
        runButton.textContent = "Đã lọc!";
        runButton.disabled = true;
        
        setTimeout(() => {
          runButton.textContent = originalText;
          runButton.disabled = false;
        }, 2000);
        
      } catch (error) {
        console.error("SafeContent: Error executing script", error);
        alert("Có lỗi xảy ra khi lọc nội dung. Vui lòng thử lại!");
      }
    });
  }
});
