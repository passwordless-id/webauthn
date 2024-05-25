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
pip install -r requirements.txt
python icons.py
mv authenticators ../site/authenticators


