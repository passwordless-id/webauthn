# Build docs
pip install -r docs/requirements.txt
mkdocs build
ls -l site

# Build JS libs
npm install
npm run build
mv dist site/dist

# Build Icons
pip install -r misc/requirements.txt
python misc/icons.py site/authenticators


