# Build docs
pip install -r docs/requirements.txt
mkdocs build
ls -l site

# Build JS libs
npm install
npm run build
mv dist site/dist

# Build Icons
cd misc
pip install -rrequirements.txt
python icons.py
mv authenticators site/authenticators



# Move icons & libs to docs site
mv misc/authenticators site/authenticatores

