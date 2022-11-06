"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAttestation = exports.parseAuthenticator = exports.parseClient = void 0;
const authenticators = __importStar(require("./authenticators"));
const utils = __importStar(require("./utils"));
const utf8Decoder = new TextDecoder('utf-8');
function parseClient(data) {
    if (typeof data == 'string')
        data = utils.parseBase64url(data);
    return JSON.parse(utf8Decoder.decode(data));
}
exports.parseClient = parseClient;
function parseAuthenticator(data) {
    if (typeof data == 'string')
        data = utils.parseBase64url(data);
    return authenticators.parseAuthBuffer(data);
}
exports.parseAuthenticator = parseAuthenticator;
function parseAttestation(data) {
    if (typeof data == 'string')
        data = utils.parseBase64url(data);
    return 'Really complex to parse. Good luck with that one!';
}
exports.parseAttestation = parseAttestation;
