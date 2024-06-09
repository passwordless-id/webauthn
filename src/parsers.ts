import * as authenticators from './authenticators.js'
import * as utils from './utils.js'
import { AuthenticatorInfo, RegistrationInfo, AuthenticationInfo, Base64URLString, RegistrationJSON, UserInfo, CollectedClientData } from './types'

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


export function parseAuthenticator(data :Base64URLString|ArrayBuffer) :Authe {
    if(typeof data == 'string')
        data = utils.parseBase64url(data)
    return authenticators.parseAuthBuffer(data)
}


export function parseAttestation(data :Base64URLString|ArrayBuffer) :unknown {
    //if(typeof data == 'string')
    //    data = utils.parseBase64url(data)
    // Useless comment, let's at least provide the raw value 
    // return "The device attestation proves the authenticity of the device model / aaguid. It's not guaranteed to be included and really complex to parse / verify. Good luck with that one!"
    return data;
}


function getAlgoName(num :NumAlgo) :NamedAlgo {
    switch(num) {
        case -7: return "ES256"
        // case -8 ignored to to its rarity
        case -257: return "RS256"
        default: throw new Error(`Unknown algorithm code: ${num}`)
    }
}

export function parseRegistration(registration :RegistrationJSON) :RegistrationInfo {
    const parsed :RegistrationInfo = {
        user: registration.user as UserInfo,
        credential: {
            id: registration.id,
            algorithm: registration.response.publicKeyAlgorithm
        },
        client:        parseClient(registration.clientData),
        authenticator: parseAuthenticator(registration.authenticatorData),
        attestation:   registration.attestationData ? parseAttestation(registration.attestationData) : null
    }

    // because this is more descriptive than a "backupState" flag bit
    parsed.credential.synced = parsed.authenticator.flags.backupState
    return parsed
}

export function parseAuthentication(authentication :AuthenticationJS) :AuthenticationParsed {
    return {
        credentialId:  authentication.credentialId,
        client:        parseClient(authentication.clientData),
        authenticator: parseAuthenticator(authentication.authenticatorData),
        signature: authentication.signature
    }
}