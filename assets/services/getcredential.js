// @ts-check
// Bindings for GetCredentialService
/**
 * GreetService is a service that demonstrates bound methods over WebSocket transport
 * @module
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unused imports
import { Call as $Call, CancellablePromise as $CancellablePromise, Create as $Create } from "/wails/runtime.js";

/**
 * @typedef {{ type: string, user?: string, pass?: string, api_key?: string }} Credential
 * @typedef {{ name: string, ftp: string, upload: string, credentoial: Credential[] }} HostConfig
 */

/**
 * GetHosts returns all configured upload hosts from host.json
 * @returns {$CancellablePromise<HostConfig[]>}
 */
export function GetHosts() {
    return $Call.ByID(657375927);
}
