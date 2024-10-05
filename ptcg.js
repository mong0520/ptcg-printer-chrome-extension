window.jsPDF = window.jspdf.jsPDF

document.addEventListener('DOMContentLoaded', function() {
  // Function to apply i18n translations
  function applyTranslations() {
      const elements = document.querySelectorAll('[data-i18n]');
      elements.forEach(function(element) {
          const messageKey = element.getAttribute('data-i18n');
          const message = chrome.i18n.getMessage(messageKey);
          if (message) {
              element.textContent = message;
          }
      });
  }

  // Apply translations
  applyTranslations();
});


document.addEventListener('DOMContentLoaded', () => {
  const imageList = document.getElementById('imageList');
  const clearAllButton = document.getElementById('clearAll');
  const exportPdfButton = document.getElementById('exportPdf');
  const exportCsvButton = document.getElementById('exportCsv');
  const sizeSelect = document.getElementById('sizeSelect');


  chrome.storage.sync.get({ images: [] }, (data) => {
    const images = data.images;
    images.forEach((imageInfo, index) => {
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.alignItems = 'center';

      const imgElement = document.createElement('img');
      imgElement.src = imageInfo.url;
      imgElement.style.width = '80px';
      imgElement.style.margin = '3px';

      const quantityElement = document.createElement('span');
      quantityElement.textContent = `Count: ${imageInfo.quantity}`;
      quantityElement.style.marginLeft = '10px';

      const increaseButton = document.createElement('button');
      increaseButton.textContent = '+';
      increaseButton.style.marginLeft = '10px';
      increaseButton.addEventListener('click', () => {
        imageInfo.quantity++;
        quantityElement.textContent = `Count: ${imageInfo.quantity}`;
        chrome.storage.sync.set({ images: images });
      });

      const decreaseButton = document.createElement('button');
      decreaseButton.textContent = '-';
      decreaseButton.style.marginLeft = '5px';
      decreaseButton.addEventListener('click', () => {
        if (imageInfo.quantity > 1) {
          imageInfo.quantity--;
          quantityElement.textContent = `Count: ${imageInfo.quantity}`;
          chrome.storage.sync.set({ images: images });
        }
      });

      const deleteButton = document.createElement('button');
      deleteButton.textContent = chrome.i18n.getMessage("remove_card");
      deleteButton.id = 'deleteButton'
      deleteButton.style.marginLeft = '10px';
      deleteButton.addEventListener('click', () => {
        images.splice(index, 1);
        chrome.storage.sync.set({ images: images }, () => {
          container.remove();
        });
      });

      container.appendChild(imgElement);
      container.appendChild(quantityElement);
      container.appendChild(increaseButton);
      container.appendChild(decreaseButton);
      container.appendChild(deleteButton);
      imageList.appendChild(container);
    });
  });

  clearAllButton.addEventListener('click', () => {
    chrome.storage.sync.set({ images: [] }, () => {
      while (imageList.firstChild) {
        imageList.firstChild.remove();
      }
    });
  });

  exportPdfButton.addEventListener('click', () => {
    chrome.storage.sync.get({ images: [] }, async (data) => {
        const images = data.images;
        const doc = new jsPDF('p', 'cm', 'A4');
        let xPos = 1;
        let yPos = 1;
        let totalImages = 0;
        let currentPageHasContent = false; // 用來追蹤當前頁面是否有內容

        // 加載浮水印圖片
        const watermarkImg = new Image();
        watermarkImg.src = 'icons/proxy.png';
        watermarkImg.crossOrigin = "Anonymous";

        try {
            await new Promise((resolve, reject) => {
                watermarkImg.onload = resolve;
                watermarkImg.onerror = reject;
            });
        } catch (error) {
            console.error("Failed to load watermark image.");
            return;
        }

        const loadImage = (imageInfo) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = imageInfo.url;
                img.crossOrigin = "Anonymous";
                img.onload = () => resolve({ img, imageInfo });
                img.onerror = () => {
                    console.error(`Failed to load image: ${imageInfo.url}`);
                    resolve(null); // 略過加載失敗的圖片，而不中斷整個流程
                };
            });
        };

        const loadedImages = await Promise.all(images.map(loadImage));
        loadedImages.forEach((loadedImage) => {
            if (!loadedImage) return; // 跳過未能加載的圖片

            const { img, imageInfo } = loadedImage;
            const selectedSize = sizeSelect.value;
            let newWidth, newHeight;

            if (selectedSize === 'standard') {
                newWidth = 6.3;
                newHeight = 8.8;
            } else if (selectedSize === 'ibon') {
                newWidth = 6.58;
                newHeight = 9.18;
            }

            const imgWidth = newWidth;
            const imgHeight = newHeight;

            for (let i = 0; i < imageInfo.quantity; i++) {
                totalImages++;
                doc.addImage(img, 'JPEG', xPos, yPos, imgWidth, imgHeight);
                currentPageHasContent = true; // 當有圖片添加時，標記當前頁面有內容
                doc.setGState(new doc.GState({ opacity: 0.8 }));

                // 添加浮水印圖片
                const watermarkWidth = 0.5;
                const watermarkHeight = 0.5;
                const x_padding = 0.5;
                const y_padding = 1.2;
                const watermarkX = xPos + imgWidth - watermarkWidth - x_padding;
                const watermarkY = yPos + imgHeight - watermarkHeight - y_padding;

                doc.addImage(watermarkImg, 'PNG', watermarkX, watermarkY, watermarkWidth, watermarkHeight);
                doc.setGState(new doc.GState({ opacity: 1 }));

                // 繪製網格線
                doc.setLineWidth(0.01);
                doc.setLineDashPattern([0.1, 0.1], 0);
                doc.setDrawColor(200, 200, 200);
                for (let line = 0; line < 4; line++) {
                    const yPosLine = 1 + newHeight * line;
                    doc.line(0, yPosLine, 100, yPosLine);
                }
                for (let line = 0; line < 4; line++) {
                    const xPosLine = 1 + newWidth * line;
                    doc.line(xPosLine, 0, xPosLine, 100);
                }

                xPos += imgWidth;
                if (xPos >= 18) { // 根據A4尺寸調整頁面邊界
                    xPos = 1;
                    yPos += imgHeight;
                }
                if (yPos >= 20) { // 根據A4尺寸調整頁面邊界
                    doc.addPage();
                    currentPageHasContent = false; // 新的一頁開始時，重置內容標記
                    xPos = 1;
                    yPos = 1;
                }
            }
        });

        // 檢查最後一頁是否為空白頁
        if (!currentPageHasContent) {
            const pageCount = doc.internal.getNumberOfPages();
            doc.deletePage(pageCount); // 如果當前頁面沒有內容，刪除最後一頁
        }

        doc.save("ptcg.pdf");
    });
});


  exportCsvButton.addEventListener('click', () => {
    chrome.storage.sync.get({ images: [] }, (data) => {
      const images = data.images;
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "url,count\n"; // Add CSV headers
      images.forEach((imageInfo) => {
        csvContent += `${imageInfo.url},${imageInfo.quantity}\n`;
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', 'ptcg.csv');
      document.body.appendChild(link); // Required for FF
      link.click();
      document.body.removeChild(link); // Clean up
    });
  });
});
