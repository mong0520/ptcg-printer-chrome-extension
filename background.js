chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "bookmarkImage",
      title: chrome.i18n.getMessage("add_to_collection"),
      contexts: ["image"]
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "bookmarkImage") {
      chrome.tabs.sendMessage(tab.id, { type: "getImageQuantity", srcUrl: info.srcUrl });
    }
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "saveImage") {
      const imageInfo = {
        url: message.srcUrl,
        quantity: message.quantity
      };

      chrome.storage.sync.get({ images: [] }, (data) => {
        const images = data.images;
        images.push(imageInfo);
        chrome.storage.sync.set({ images: images }, () => {
          console.log("Image URL and quantity saved");
        });
      });
    }
  });
