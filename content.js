chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getImageQuantity") {
      const quantity = prompt("Count:");

      if (quantity !== null) {
        chrome.runtime.sendMessage({
          type: "saveImage",
          srcUrl: message.srcUrl,
          quantity: parseInt(quantity, 10)
        });
      }
    }
  });
