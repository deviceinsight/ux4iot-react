import {
	DesiredPropertyGrantRequest,
	IoTHubResponse,
} from '../base/ux4iot-shared';
import { Grantable, GrantableArgs } from './Grantable';

export type PatchDesiredPropertiesArgs = GrantableArgs;

export class PatchDesiredPropertiesGrantable extends Grantable {
	createGrant(): Omit<DesiredPropertyGrantRequest, 'sessionId'> {
		return { grantType: 'modifyDesiredProperties', deviceId: this.deviceId };
	}

	async patchDesiredProperties(
		desiredPropertyPatch: Record<string, unknown>
	): Promise<IoTHubResponse | void> {
		if (!this.granted) await this.askForGrant();
		if (this.granted) {
			return await this.api.patchDesiredProperties(
				this.deviceId,
				desiredPropertyPatch
			);
		}
	}
}
