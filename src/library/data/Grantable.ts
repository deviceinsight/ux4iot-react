import { GrantErrorCallback, GRANT_RESPONSES } from '../types';
import { GrantRequest } from '../base/ux4iot-shared';
import { Ux4iotApi } from '../base/Ux4iotApi';

export type GrantableArgs = {
	api: Ux4iotApi;
	deviceId: string;
	onGrantError?: GrantErrorCallback;
};

export abstract class Grantable {
	api: Ux4iotApi;
	deviceId: string;
	granted: boolean;
	onGrantError?: GrantErrorCallback;

	protected abstract createGrant():
		| Omit<GrantRequest, 'sessionId'>
		| Omit<GrantRequest, 'sessionId'>[];

	constructor(args: GrantableArgs) {
		this.api = args.api;
		this.granted = false;
		this.onGrantError = args.onGrantError;
		this.deviceId = args.deviceId;
	}

	async askForGrant() {
		if (this.granted) {
			return;
		}
		const grant = this.createGrant();
		if (Array.isArray(grant)) {
			let allGranted = true;
			for (const g of grant) {
				const result = await this.api.requestGrant(g);
				if (result !== GRANT_RESPONSES.GRANTED) {
					this.onGrantError && this.onGrantError(result);
					allGranted = false;
				}
			}
			this.granted = allGranted;
		} else {
			const result = await this.api.requestGrant(grant);
			if (result !== GRANT_RESPONSES.GRANTED) {
				this.onGrantError && this.onGrantError(result);
			} else {
				this.granted = true;
			}
		}
	}

	hasGrant() {
		return this.granted;
	}
}
