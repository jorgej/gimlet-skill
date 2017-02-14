#!/bin/bash

rm -rf _build
mkdir _build

echo 'Copying files...'
cp -r js _build/src
cd _build/src

echo 'Compressing files...'
zip -rq ../package.zip *
cd ../..
rm -rf _build/src

echo 'Done. File is at `_build/package.zip`'
