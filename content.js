chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "getImageQuantity") {
      const quantity = prompt(chrome.i18n.getMessage("count_to_add"));

      if (quantity !== null) {
        chrome.runtime.sendMessage({
          type: "saveImage",
          srcUrl: message.srcUrl,
          quantity: parseInt(quantity, 10)
        });
      }
    }
  });
