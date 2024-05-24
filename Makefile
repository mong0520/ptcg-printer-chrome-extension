.PHONY: all
EXTENSION_NAME = ptct-printer-chrome-extension

ZIP_FILE = $(EXTENSION_NAME).zip

FILES = *.json *.js *.html *.css js/*. icons/*

all: clean
	zip -r $(ZIP_FILE) $(FILES)

clean:
	rm -f $(ZIP_FILE)
