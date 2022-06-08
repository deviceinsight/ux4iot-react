import axios, { AxiosInstance } from 'axios';
import { DeviceMethodParams } from 'azure-iothub';
import {
	GrantRequestFunctionType,
	GRANT_RESPONSES,
	InitializationOptions,
	isDevOptions,
} from '../types';
import { printDevModeWarning } from '../utils';
import {
	GrantRequest,
	IoTHubResponse,
	parseConnectionString,
	SubscriptionRequest,
} from '../ux4iot-shared';

export class Ux4iotApi {
	private axiosInstance: AxiosInstance;
	private grantRequestFunction: GrantRequestFunctionType;
	private ux4iotUrl: string;
	private sessionId?: string;

	constructor(initializationOptions: InitializationOptions) {
		printDevModeWarning();
		if (isDevOptions(initializationOptions)) {
			const { Endpoint, SharedAccessKey } = parseConnectionString(
				initializationOptions.adminConnectionString
			);
			this.axiosInstance = axios.create({
				baseURL: Endpoint,
				headers: { 'Shared-Access-Key': SharedAccessKey },
			});
			this.ux4iotUrl = Endpoint;
			this.grantRequestFunction = this.defaultGrantRequestFunction;
		} else {
			const { ux4iotURL, grantRequestFunction } = initializationOptions;
			this.axiosInstance = axios.create({
				baseURL: ux4iotURL,
			});
			this.ux4iotUrl = ux4iotURL;
			this.grantRequestFunction = grantRequestFunction;
		}
	}

	setSessionId(sessionId: string) {
		this.sessionId = sessionId;
	}

	public async requestGrant(
		grantBase:
			| Omit<GrantRequest, 'sessionId'>
			| Omit<GrantRequest, 'sessionId'>[]
	) {
		if (!this.sessionId) {
			return Promise.reject('Ux4iot has no session');
		}
		if (Array.isArray(grantBase)) {
		}
		const grant = { ...grantBase, sessionId: this.sessionId } as GrantRequest;
		return this.grantRequestFunction(grant);
	}

	private async defaultGrantRequestFunction(grant: GrantRequest) {
		try {
			await this.axiosInstance.put('/grants', grant);
		} catch (error) {
			if (axios.isAxiosError(error)) {
				if (error.response) {
					if (error.response.status === 401) {
						return GRANT_RESPONSES.UNAUTHORIZED;
					} else if (error.response.status === 403) {
						return GRANT_RESPONSES.FORBIDDEN;
					}
				}
			}
			return GRANT_RESPONSES.ERROR;
		}
		return GRANT_RESPONSES.GRANTED;
	}

	public async getSessionId(): Promise<string> {
		const response = await this.axiosInstance.post('/session');
		return response.data.sessionId;
	}

	public getSocketURL(sessionId: string) {
		return `${this.ux4iotUrl}?sessionId=${sessionId}`;
	}

	public async subscribe(
		subscriptionRequestBase:
			| Omit<SubscriptionRequest, 'sessionId'>
			| Omit<SubscriptionRequest, 'sessionId'>[]
	) {
		if (!this.sessionId) {
			return Promise.reject('Ux4iot has no session');
		}
		const subscriptionRequest = Array.isArray(subscriptionRequestBase)
			? subscriptionRequestBase.map(sr => ({
					...sr,
					sessionId: this.sessionId,
			  }))
			: {
					...subscriptionRequestBase,
					sessionId: this.sessionId,
			  };
		await this.axiosInstance.put('/subscribe', subscriptionRequest);
	}

	public async unsubscribe(
		subscriptionRequestBase:
			| Omit<SubscriptionRequest, 'sessionId'>
			| Omit<SubscriptionRequest, 'sessionId'>[]
	) {
		if (!this.sessionId) {
			return Promise.reject('Ux4iot has no session');
		}
		const subscriptionRequest = Array.isArray(subscriptionRequestBase)
			? subscriptionRequestBase.map(sr => ({
					...sr,
					sessionId: this.sessionId,
			  }))
			: {
					...subscriptionRequestBase,
					sessionId: this.sessionId,
			  };
		await this.axiosInstance.put('/unsubscribe', subscriptionRequest);
	}

	public async invokeDirectMethod(
		deviceId: string,
		options: DeviceMethodParams
	): Promise<IoTHubResponse | void> {
		if (!this.sessionId) {
			return Promise.reject('Ux4iot has no session');
		}
		const response = await this.axiosInstance.post(
			'/directMethod',
			{
				deviceId,
				methodParams: options,
			},
			{
				headers: {
					sessionId: this.sessionId,
				},
			}
		);

		return response.data;
	}

	public async patchDesiredProperties(
		deviceId: string,
		desiredPropertyPatch: Record<string, unknown>
	): Promise<IoTHubResponse | void> {
		if (!this.sessionId) {
			return Promise.reject('Ux4iot has no session');
		}
		const response = await this.axiosInstance.patch<IoTHubResponse | void>(
			'/deviceTwinDesiredProperties',
			{ deviceId, desiredPropertyPatch },
			{
				headers: {
					sessionId: this.sessionId,
				},
			}
		);

		return response.data;
	}
}
