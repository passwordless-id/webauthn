import * as authenticatorMetadata from './authenticatorMetadata.json'
import * as utils from './utils'

//console.debug(authenticatorMetadata)

export function parseAuthData(authData :ArrayBuffer) {
    console.debug(authData)
    let flags = new DataView(authData.slice(32,33)).getUint8(0)
    console.debug(flags)

    // https://w3c.github.io/webauthn/#sctn-authenticator-data
    let parsed :any = {
        rpIdHash: utils.toBase64url(authData.slice(0,32)),
            flags: {
                 userPresent: !!(flags & 1),
                 //reserved1: !!(flags & 2),
                 userVerified: !!(flags &  4),
                 backupEligibility: !!(flags & 8),
                 backupState: !!(flags & 16),
                 //reserved2: !!(flags & 32),
                 attestedData: !!(flags & 64),
                 extensionsIncluded: !!(flags & 128)
            },
            counter: new DataView(authData.slice(33,37)).getUint32(0, false),  // Big-Endian!
    }

    if(authData.byteLength > 37) {
        // https://w3c.github.io/webauthn/#attested-credential-data
        let credentialLength = new DataView(authData.slice(53,55)).getUint16(0, false) // Big-Endian!
        parsed = {
            ...parsed,
            aaguid: extractAaguid(authData),
            credentialId: utils.toBase64url(authData.slice(55, 55+credentialLength)),
            publicKey: utils.toBase64url(authData.slice(55+credentialLength, authData.byteLength)) // probably breaks if extensions are invoked
        }
    }

    return parsed
}

export function extractAaguid(authData :ArrayBuffer) :string {
    return formatAaguid(authData.slice(37, 53))
}

function formatAaguid(buffer :ArrayBuffer) :string {
    let aaguid = utils.bufferToHex(buffer)
    aaguid = aaguid.substring(0,8) + '-' + aaguid.substring(8,12) + '-' + aaguid.substring(12,16) + '-' + aaguid.substring(16,20) + '-' + aaguid.substring(20,24)
    return aaguid // example: "d41f5a69-b817-4144-a13c-9ebd6d9254d6"
}

export function resolveAuthenticatorName(authData :ArrayBuffer) :string {
    const aaguid = extractAaguid(authData)
    const aaguidMetadata = updatedAuthenticatorMetadata ?? authenticatorMetadata //await getAaguidMetadata()
    return aaguidMetadata[aaguid]?.name
}

let updatedAuthenticatorMetadata :any = null

// List of AAGUIDs are encoded as JWT here: https://mds.fidoalliance.org/
export async function updateDevicesMetadata() {
    // this function is rather resource intensive and time consuming
    // therefore, the result is cached in local storage
    const jwt = await (await fetch("https://mds.fidoalliance.org")).text()

    // the response is a JWT including all AAGUIDs and their metadata
    console.debug(jwt)

    // let us ignore the JWT verification, since this is solely for descriptive purposes, not signed data
    const payload = jwt.split('.')[1].replaceAll('-', '+').replaceAll('_', '/')
    const json = JSON.parse(atob(payload))
    console.debug(json)

    let aaguidMetadata :any = {}
    for(const e of json.entries) {
        if(!e.aaguid || !e.metadataStatement)
            continue

        aaguidMetadata[e.aaguid] = {name: e.metadataStatement.description}
    }

    console.debug(aaguidMetadata)
    updatedAuthenticatorMetadata = aaguidMetadata
}
