# Build docs
pip install -r docs/requirements.txt
mkdocs build
ls -l site

# Build JS libs
npm install
npm run build
# Copy the bundled minimized modules of both client and server needed for the demos
cp dist/*.js site/js

# Build Icons
pip install -r misc/requirements.txt
python misc/icons.py site/authenticators


