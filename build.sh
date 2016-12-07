#!/bin/bash

rm -rf _build
mkdir _build

echo 'Copying files...'
cp -r js _build/src
cd _build/src

echo 'Inserting production skill ID...'
sed -i '.bak' 's/fb7cbf45-1f45-4307-b2ce-b36bc871625f/a16e1bcb-690b-470d-97a8-061251c559e0/g' constants.js
rm constants.js.bak

echo 'Compressing files...'
zip -rq ../package.zip *
cd ../..
rm -rf _build/src

echo 'Done. File is at `_build/package.zip`'
