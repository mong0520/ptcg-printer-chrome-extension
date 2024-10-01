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
    chrome.storage.sync.get({ images: [] }, (data) => {
        const images = data.images;
        const doc = new jsPDF('p', 'cm', 'A4');
        let xPos = 1;
        let yPos = 1;
        let totalImages = 0;
        let blankPage = true;

        // 加載浮水印圖片
        const watermarkImg = new Image();
        watermarkImg.src = 'icons/proxy.png'; // 替換為浮水印圖片的URL或路徑
        watermarkImg.crossOrigin = "Anonymous"; // 如果浮水印圖片來自不同來源，可能需要設置跨域

        watermarkImg.onload = function () {
            images.forEach((imageInfo, index) => {
                const img = new Image();
                img.src = imageInfo.url;
                img.crossOrigin = "Anonymous"; // 如果圖片來自不同來源，可能需要設置跨域
                img.onload = function () {
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
                        doc.addImage(this, 'JPEG', xPos, yPos, imgWidth, imgHeight);
                        doc.setGState(new doc.GState({ opacity: 0.6 }));

                        // 添加浮水印圖片
                        const watermarkWidth = 0.5; // 設置浮水印圖片寬度
                        const watermarkHeight = 0.5; // 設置浮水印圖片高度
                        // 計算浮水印圖片的位置：右下角，考慮內邊距
                        const padding = 0.3; // 浮水印距離圖片邊緣的距離（以厘米為單位）
                        const watermarkX = xPos + imgWidth - watermarkWidth - (padding*2);
                        const watermarkY = yPos + imgHeight - watermarkHeight - padding;
                        doc.addImage(watermarkImg, 'PNG', watermarkX, watermarkY, watermarkWidth, watermarkHeight);
                        // 恢復不透明度，防止影響後續的內容
                        doc.setGState(new doc.GState({ opacity: 1 }));

                        // 繪製網格線（如果需要）
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
                            blankPage = true;
                            xPos = 1;
                            yPos = 1;
                        }
                    }
                    blankPage = false;
                    if (index === images.length - 1) {
                        if (blankPage === true) {
                            const pageCount = doc.internal.getNumberOfPages();
                            doc.deletePage(pageCount);
                        }
                        doc.save("ptcg.pdf");
                    }
                };
                img.onerror = function () {
                    console.error(`Failed to load image: ${imageInfo.url}`);
                    // 處理圖片加載錯誤（例如，跳過這張圖片或顯示錯誤信息）
                };
            });
        };
        watermarkImg.onerror = function () {
            console.error("Failed to load watermark image.");
        };
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
