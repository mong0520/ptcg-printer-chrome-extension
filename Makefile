.PHONY: all
EXTENSION_NAME = ptct-printer-chrome-extension

ZIP_FILE = $(EXTENSION_NAME).zip

FILES = *.json *.js *.html *.css js/* icons/* _locales/*

all: clean
	mkdir dist
	zip -r dist/$(ZIP_FILE) $(FILES)

clean:
	rm -rf dist/
