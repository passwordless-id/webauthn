import json
import base64
import os
import io
import requests
from cairosvg import svg2png
from PIL import Image
from PIL import ImageOps
import sys

ICON_SIZE=64

authenticators = requests.get('https://raw.githubusercontent.com/passkeydeveloper/passkey-authenticator-aaguids/main/combined_aaguid.json').json()
print(authenticators.keys())

authenticators['00000000-0000-0000-0000-000000000000'] = {
    "name": "Unknown authenticator",
    "icon_dark":  "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pgo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDIwMDEwOTA0Ly9FTiIKICJodHRwOi8vd3d3LnczLm9yZy9UUi8yMDAxL1JFQy1TVkctMjAwMTA5MDQvRFREL3N2ZzEwLmR0ZCI+CjxzdmcgdmVyc2lvbj0iMS4wIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiB3aWR0aD0iNTAwLjAwMDAwMHB0IiBoZWlnaHQ9IjUwMC4wMDAwMDBwdCIgdmlld0JveD0iMCAwIDUwMC4wMDAwMDAgNTAwLjAwMDAwMCIKIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIG1lZXQiPgoKPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsNTAwLjAwMDAwMCkgc2NhbGUoMC4xMDAwMDAsLTAuMTAwMDAwKSIKZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSJub25lIj4KPHBhdGggZD0iTTE5OTAgNDY2NiBjLTM0MSAtNzEgLTYyNiAtMzUwIC03MTMgLTY5NiAtMzAgLTEyMCAtMzAgLTMyMCAwIC00NDAKODggLTM1MSAzNzEgLTYyNCA3MjEgLTY5NiA1NyAtMTIgMTEzIC0xNSAyMjcgLTEyIDEyOCA1IDE2MiA5IDIzNSAzMyAyMDIgNjUKMzUyIDE2OSA0NzAgMzI3IDc1IDk5IDEyMSAxOTAgMTU3IDMwNSAyNSA4MSAyNyAxMDEgMjcgMjYzIDAgMTYyIC0yIDE4MiAtMjcKMjYzIC05NSAzMDggLTMxNiA1MzEgLTYyNyA2MzIgLTc2IDI1IC0xMDIgMjggLTI0NSAzMSAtMTA3IDIgLTE4MSAtMSAtMjI1Ci0xMHoiLz4KPHBhdGggZD0iTTM4MTAgMzUyNiBjLTE0MyAtMzAgLTI2OCAtMTAwIC0zNzUgLTIxMSAtMTk4IC0yMDMgLTI1OCAtNTEyIC0xNTAKLTc3NyA1NSAtMTM2IDE3OSAtMjc4IDMwMyAtMzQ4IGw2MSAtMzUgMSAtNTYwIDAgLTU2MCAxNTMgLTE1MiAxNTMgLTE1MyAyNTkKMjYwIDI2MCAyNjAgLTE1NSAxNTUgLTE1NSAxNTUgMTUzIDE1MyBjODMgODQgMTUyIDE1NyAxNTIgMTYyIDAgNSAtNTUgNjUKLTEyMiAxMzIgLTY3IDY3IC0xMjAgMTI0IC0xMTggMTI2IDMgMiA0MSAyMyA4NSA0OCAxNjYgOTIgMjk5IDI2NCAzNDUgNDQ1IDI0Cjk0IDI3IDI2OSA1IDM1OSAtNTkgMjUyIC0yNjMgNDYxIC01MTcgNTMxIC03NyAyMSAtMjU5IDI2IC0zMzggMTB6IG0yNjMgLTMzMgpjNDkgLTM0IDk3IC0xMTkgOTcgLTE3MyAwIC01MSAtNDIgLTEzNCAtODMgLTE2NSAtNDYgLTM1IC0xMjkgLTUyIC0xODIgLTM4Ci04NiAyNCAtMTU0IDExMiAtMTU1IDIwMCAtMSAxNjYgMTg4IDI2OSAzMjMgMTc2eiIvPgo8cGF0aCBkPSJNMTY4NSAyNDg0IGMtNDYyIC03MSAtODUwIC00MDEgLTk5NiAtODQ3IC01MCAtMTU0IC01OSAtMjMyIC01OQotNTI4IGwwIC0yNjkgMTM1MCAwIDEzNTAgMCAwIDU3MCAwIDU3MCAtODAgNzYgYy05MCA4NiAtMTYxIDE3OCAtMjEyIDI3NApsLTM0IDY1IC0xMTAgMzcgYy0xNzkgNjAgLTI2NCA2OCAtNzIwIDY3IC0yODUgLTEgLTQyNSAtNSAtNDg5IC0xNXoiLz4KPC9nPgo8L3N2Zz4=",
    "icon_light": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pgo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDIwMDEwOTA0Ly9FTiIKICJodHRwOi8vd3d3LnczLm9yZy9UUi8yMDAxL1JFQy1TVkctMjAwMTA5MDQvRFREL3N2ZzEwLmR0ZCI+CjxzdmcgdmVyc2lvbj0iMS4wIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciCiB3aWR0aD0iNTAwLjAwMDAwMHB0IiBoZWlnaHQ9IjUwMC4wMDAwMDBwdCIgdmlld0JveD0iMCAwIDUwMC4wMDAwMDAgNTAwLjAwMDAwMCIKIHByZXNlcnZlQXNwZWN0UmF0aW89InhNaWRZTWlkIG1lZXQiPgoKPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMC4wMDAwMDAsNTAwLjAwMDAwMCkgc2NhbGUoMC4xMDAwMDAsLTAuMTAwMDAwKSIKZmlsbD0iIzAwMDAwMCIgc3Ryb2tlPSJub25lIj4KPHBhdGggZD0iTTE5OTAgNDY2NiBjLTM0MSAtNzEgLTYyNiAtMzUwIC03MTMgLTY5NiAtMzAgLTEyMCAtMzAgLTMyMCAwIC00NDAKODggLTM1MSAzNzEgLTYyNCA3MjEgLTY5NiA1NyAtMTIgMTEzIC0xNSAyMjcgLTEyIDEyOCA1IDE2MiA5IDIzNSAzMyAyMDIgNjUKMzUyIDE2OSA0NzAgMzI3IDc1IDk5IDEyMSAxOTAgMTU3IDMwNSAyNSA4MSAyNyAxMDEgMjcgMjYzIDAgMTYyIC0yIDE4MiAtMjcKMjYzIC05NSAzMDggLTMxNiA1MzEgLTYyNyA2MzIgLTc2IDI1IC0xMDIgMjggLTI0NSAzMSAtMTA3IDIgLTE4MSAtMSAtMjI1Ci0xMHoiLz4KPHBhdGggZD0iTTM4MTAgMzUyNiBjLTE0MyAtMzAgLTI2OCAtMTAwIC0zNzUgLTIxMSAtMTk4IC0yMDMgLTI1OCAtNTEyIC0xNTAKLTc3NyA1NSAtMTM2IDE3OSAtMjc4IDMwMyAtMzQ4IGw2MSAtMzUgMSAtNTYwIDAgLTU2MCAxNTMgLTE1MiAxNTMgLTE1MyAyNTkKMjYwIDI2MCAyNjAgLTE1NSAxNTUgLTE1NSAxNTUgMTUzIDE1MyBjODMgODQgMTUyIDE1NyAxNTIgMTYyIDAgNSAtNTUgNjUKLTEyMiAxMzIgLTY3IDY3IC0xMjAgMTI0IC0xMTggMTI2IDMgMiA0MSAyMyA4NSA0OCAxNjYgOTIgMjk5IDI2NCAzNDUgNDQ1IDI0Cjk0IDI3IDI2OSA1IDM1OSAtNTkgMjUyIC0yNjMgNDYxIC01MTcgNTMxIC03NyAyMSAtMjU5IDI2IC0zMzggMTB6IG0yNjMgLTMzMgpjNDkgLTM0IDk3IC0xMTkgOTcgLTE3MyAwIC01MSAtNDIgLTEzNCAtODMgLTE2NSAtNDYgLTM1IC0xMjkgLTUyIC0xODIgLTM4Ci04NiAyNCAtMTU0IDExMiAtMTU1IDIwMCAtMSAxNjYgMTg4IDI2OSAzMjMgMTc2eiIvPgo8cGF0aCBkPSJNMTY4NSAyNDg0IGMtNDYyIC03MSAtODUwIC00MDEgLTk5NiAtODQ3IC01MCAtMTU0IC01OSAtMjMyIC01OQotNTI4IGwwIC0yNjkgMTM1MCAwIDEzNTAgMCAwIDU3MCAwIDU3MCAtODAgNzYgYy05MCA4NiAtMTYxIDE3OCAtMjEyIDI3NApsLTM0IDY1IC0xMTAgMzcgYy0xNzkgNjAgLTI2NCA2OCAtNzIwIDY3IC0yODUgLTEgLTQyNSAtNSAtNDg5IC0xNXoiLz4KPC9nPgo8L3N2Zz4="
}

#with open('authenticators.json') as file:
#    data = json.load(file)

img_format_counts = {
    'svg': 0,
    'png': 0,
    'jpeg': 0
}

downscaled = 0
upscaled = 0
failed = []

for key, item in sorted(authenticators.items()):
    for mode in ['light', 'dark']:
        prop = 'icon_' + mode
        img_data = item.get(prop, None)
        if img_data is None:
            continue
        if not img_data.startswith("data:"):
            continue

        format, img_data = img_data.split(';base64,')
        img_format = format.split('/')[-1].split('+')[0]  # Extract the image format from the data URI
        img_format_counts[img_format] += 1

        # Decode the base64-encoded image data
        try:
            if len(img_data) % 4 > 0:
                # Some have base64 encoded images with incorrect padding
                img_data += '=' * (4 - len(img_data) % 4)
                print(f"Padding added: {len(img_data)}")
            img_bytes = base64.b64decode(img_data) 
        except:
            print(f'Failed to decode {key}')
            failed += [key]
            continue

        # Save the image to a file
        save_as = f'../authenticators/{key}-{mode}.png'
        try:
            if img_format == 'svg':
                print(f'Converting SVG to PNG {save_as}...')
                svg2png(bytestring=img_bytes, write_to=save_as, output_width=ICON_SIZE, output_height=ICON_SIZE)
            else:
                print(f'Converting PNG to {ICON_SIZE}x{ICON_SIZE} {save_as}...')
                img = Image.open(io.BytesIO(img_bytes))
                if img.size[0] < ICON_SIZE:
                    upscaled += 1
                else:
                    downscaled += 1
                img = img.convert("RGBA")
                # Some icons are rectangular and require padding
                img = ImageOps.pad(img, (ICON_SIZE, ICON_SIZE)) #, color='rgba(0,0,0,0)')
                img.save(save_as)
                #with open(save_as, 'wb') as img:            
                #    img.write(img_bytes)
        except:
            print(f'Failed to convert/resize {key}')
            failed += [key]
            continue


print('----------- List of authenticators ---------------')
for key, value in sorted(authenticators.items()):
    print(f'  "{key}": "' + value['name'] + '",')


print('--------------- Stats --------------')
print(img_format_counts)
print(f'Upscaled: {upscaled}')
print(f'Downscaled: {downscaled}')

if len(failed) > 0:
    print('---------- Failed ----------')
    for key in failed:
        print(key)
    sys.exit(1)