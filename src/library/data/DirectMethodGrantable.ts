import { DeviceMethodParams } from 'azure-iothub';
import { DirectMethodGrantRequest, IoTHubResponse } from '../ux4iot-shared';
import { Grantable, GrantableArgs } from './Grantable';

export type DirectMethodArgs = GrantableArgs & {
	directMethodName: string;
};

export class DirectMethodGrantable extends Grantable {
	directMethodName: string;

	constructor(args: DirectMethodArgs) {
		super(args);
		this.directMethodName = args.directMethodName;
	}

	createGrant(): Omit<DirectMethodGrantRequest, 'sessionId'> {
		return {
			grantType: 'invokeDirectMethod',
			deviceId: this.deviceId,
			directMethodName: this.directMethodName,
		};
	}

	async invokeDirectMethod(
		options: DeviceMethodParams
	): Promise<IoTHubResponse | void> {
		if (!this.granted) await this.askForGrant();
		if (this.granted) {
			return await this.api.invokeDirectMethod(this.deviceId, options);
		}
	}
}
