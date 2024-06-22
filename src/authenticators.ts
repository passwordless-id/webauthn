import { authenticatorMetadata } from './authenticatorMetadata'


/**
 * Kept for compatibility purposes.
 * @deprecated
 */
export function resolveAuthenticatorName(aaguid :string) :string {
    const aaguidMetadata = updatedAuthenticatorMetadata ?? authenticatorMetadata //await getAaguidMetadata()
    return aaguidMetadata[aaguid]
}

let updatedAuthenticatorMetadata :any = null

/**O
 * Updates the built-in metadata according to raw data available at https://mds.fidoalliance.org/
 * This service delivers a list of AAGUIDs encoded as a JWT.
 * Kept for compatibility purposes.
 * @deprecated
 */
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

        aaguidMetadata[e.aaguid] = e.metadataStatement.description
    }

    console.debug(aaguidMetadata)
    updatedAuthenticatorMetadata = aaguidMetadata
}
