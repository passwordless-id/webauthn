import * as utils from './utils'
import { Base64URLString, CollectedClientData, NamedAlgo, AuthenticatorParsed, RegistrationJSON, RegistrationInfo, UserInfo, AuthenticationInfo, AuthenticationJSON } from './types'
import { authenticatorMetadata } from './authenticatorMetadata'

const utf8Decoder = new TextDecoder('utf-8')


interface ClientInfo {
    type: "webauthn.create" | "webauthn.get"
    challenge: string
    origin: string
    crossOrigin: boolean
    tokenBindingId?: {
      id: string
      status: string
    }
    extensions?: any
}

  
export function parseClient(data :Base64URLString|ArrayBuffer) :CollectedClientData {
    if(typeof data == 'string')
        data = utils.parseBase64url(data)
    return JSON.parse(utf8Decoder.decode(data))
}


export function parseAuthenticator(authData :Base64URLString|ArrayBuffer) :AuthenticatorParsed {
    if(typeof authData == 'string')
        authData = utils.parseBase64url(authData)
    
    //console.debug(authData)
    let flags = new DataView(authData.slice(32,33)).getUint8(0)
    //console.debug(flags)

    // https://w3c.github.io/webauthn/#sctn-authenticator-data
    return {
        rpIdHash: extractRpIdHash(authData),
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
        signCount: new DataView(authData.slice(33,37)).getUint32(0, false),  // Big-Endian!
        aaguid: extractAaguid(authData),
        //credentialId: extractCredentialId() 
    }
}

function extractRpIdHash(authData :ArrayBuffer) :Base64URLString {
    return utils.toBase64url(authData.slice(0,32))
}

/**
 * Returns the AAGUID in the format "00000000-0000-0000-0000-000000000000"
 */
function extractAaguid(authData :ArrayBuffer) :string {
    if(authData.byteLength < 53)
        return "00000000-0000-0000-0000-000000000000"
    const buffer = authData.slice(37, 53) // 16 byte
    const hex = utils.bufferToHex(buffer)
    const aaguid :string = `${hex.substring(0,8)}-${hex.substring(8,12)}-${hex.substring(12,16)}-${hex.substring(16,20)}-${hex.substring(20,32)}`
    return aaguid // example: "d41f5a69-b817-4144-a13c-9ebd6d9254d6"
}



export function getAlgoName(num :COSEAlgorithmIdentifier) :NamedAlgo {
    switch(num) {
        case -7: return "ES256"
        case -8: return "EdDSA"
        case -257: return "RS256"
        default: throw new Error(`Unknown algorithm code: ${num}`)
    }
}


export function parseRegistration(registrationJson :RegistrationJSON) :RegistrationInfo {
    const authenticator = parseAuthenticator(registrationJson.response.authenticatorData);
    return toRegistrationInfo(registrationJson, authenticator);
}

export function toRegistrationInfo(registrationJson :RegistrationJSON, authenticator :AuthenticatorParsed) :RegistrationInfo {
    const aaguid = authenticator.aaguid
    return {
        authenticator: {
            aaguid,
            counter: authenticator.signCount,
            icon_light: 'https://webauthn.passwordless.id/authenticators/' + aaguid + '-light.png',
            icon_dark: 'https://webauthn.passwordless.id/authenticators/' + aaguid + '-dark.png',
            name: authenticatorMetadata[aaguid] ?? 'Unknown',
        },
        credential: {
            id: registrationJson.id,
            publicKey: registrationJson.response.publicKey,
            algorithm: getAlgoName(registrationJson.response.publicKeyAlgorithm),
            transports: registrationJson.response.transports
        },
        synced: authenticator.flags.backupEligibility,
        user: registrationJson.user as UserInfo, // That's specific to this library
        userVerified: authenticator.flags.userVerified,
    }
}

export function toAuthenticationInfo(authenticationJson :AuthenticationJSON, authenticator :AuthenticatorParsed) :AuthenticationInfo {
    return {
        credentialId: authenticationJson.id,
        userId: authenticationJson.response.userHandle,
        counter: authenticator.signCount,
        userVerified: authenticator.flags.userVerified,
        authenticatorAttachment: authenticationJson.authenticatorAttachment
    }
}


export function parseAuthentication(authenticationJson :AuthenticationJSON) :AuthenticationInfo {
    const authenticator = parseAuthenticator(authenticationJson.response.authenticatorData);
    return toAuthenticationInfo(authenticationJson, authenticator);
}
