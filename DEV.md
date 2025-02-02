### To build the lib

`npm run build`

### To update the icons

```
pip install -r misc/requirements.txt
python misc/icons.py
```

The resulting list of authenticators will be printed in the console.
It has to be copied in `src/authenticatorsMetadata.ts` to update it.

The docs will be updated with `build.sh`