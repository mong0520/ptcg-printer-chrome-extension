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
      var totalImages = 0;
      var blankPage = true;
      images.forEach((imageInfo, index) => {
        const img = new Image();
        img.src = imageInfo.url;
        img.onload = function() {
          // for 7-11 ibon
          // const newWidth = 6.58;
          // const newHeight = 9.18;

          const newWidth = 6.3;
          const newHeight = 8.8;

          const imgWidth = newWidth;
          const imgHeight = newHeight;
          for (let i = 0; i < imageInfo.quantity; i++) {
            totalImages ++;
            doc.addImage(this, 'JPEG', xPos, yPos, imgWidth, imgHeight);
            blankPage = false;
            xPos += imgWidth;
            if (xPos >= 18) {
              xPos = 1;
              yPos += imgHeight;
            }
            if (yPos >= 20) {
              doc.addPage();
              blankPage = true;
              xPos = 1;
              yPos = 1;
            }
          }
          if (index === images.length - 1) {
            if (blankPage == true) {
                var pageCount = doc.internal.getNumberOfPages();
                doc.deletePage(pageCount);
            }
            doc.save("ptcg.pdf");
          }
        }
      });
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
