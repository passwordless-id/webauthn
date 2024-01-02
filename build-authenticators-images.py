import json
import base64
import os

with open('authenticators.json') as file:
    data = json.load(file)

for key, item in data.items():
    for mode in ['light', 'dark']:
        prop = 'icon_' + mode
        img_data = item.get(prop, None)
        if img_data is None:
            continue
        if not img_data.startswith("data:"):
            continue

        format, img_data = img_data.split(';base64,')
        img_format = format.split('/')[-1].split('+')[0]  # Extract the image format from the data URI

        # Decode the base64-encoded image data
        try:
            img_bytes = base64.urlsafe_b64decode(img_data)
        except:
            print(f'Failed to decode {key}')
            continue

        # Save the image to a file
        save_as = f'authenticators/{key}_{mode}.{img_format}'
        with open(save_as, 'wb') as img:
            img.write(img_bytes)

        print(f'Saved {save_as}.')

