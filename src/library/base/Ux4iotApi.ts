import axios, { AxiosInstance } from 'axios';
import { DeviceMethodParams } from 'azure-iothub';
import {
	GrantRequestFunctionType,
	GRANT_RESPONSES,
	InitializationOptions,
	isDevOptions,
} from './types';
import { printDevModeWarning } from './utils';
import {
	CachedValueType,
	GrantRequest,
	IoTHubResponse,
	LastValueConnectionStateResponse,
	LastValueDeviceTwinResponse,
	LastValueObj,
	LastValueTelemetryResponse,
	parseConnectionString,
	SubscriptionRequest,
} from './ux4iot-shared';

export class Ux4iotApi {
	private axiosInstance: AxiosInstance;
	private grantRequestFunction: GrantRequestFunctionType;
	private ux4iotUrl: string;
	private sessionId?: string;

	constructor(initializationOptions: InitializationOptions) {
		if (isDevOptions(initializationOptions)) {
			printDevModeWarning();
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

	public setSessionId(sessionId: string) {
		this.sessionId = sessionId;
	}

	public async getSessionId(): Promise<string> {
		const response = await this.axiosInstance.post('/session');
		return response.data.sessionId;
	}

	public getSocketURL(sessionId: string) {
		return `${this.ux4iotUrl}?sessionId=${sessionId}`;
	}

	public async requestGrant(
		grantBase: Omit<GrantRequest, 'sessionId'>
	): Promise<GRANT_RESPONSES> {
		if (!this.sessionId) return Promise.reject('There is no ux4iot session');

		const grant = { ...grantBase, sessionId: this.sessionId } as GrantRequest;
		return this.grantRequestFunction(grant);
	}

	public async subscribe(
		subscriptionRequestBase: Omit<SubscriptionRequest, 'sessionId'>
	): Promise<void> {
		if (!this.sessionId) return Promise.reject('There is no ux4iot session');

		await this.axiosInstance.put('/subscription', {
			...subscriptionRequestBase,
			sessionId: this.sessionId,
		});
	}

	public async unsubscribe(
		subscriptionRequestBase: Omit<SubscriptionRequest, 'sessionId'>
	): Promise<void> {
		if (!this.sessionId) return Promise.reject('There is no ux4iot session');

		await this.axiosInstance.delete('/subscription', {
			data: { ...subscriptionRequestBase, sessionId: this.sessionId },
		});
	}

	public async subscribeAll(
		subscriptionRequests: SubscriptionRequest[]
	): Promise<void> {
		if (!this.sessionId) return Promise.reject('There is no ux4iot session');

		await this.axiosInstance.put(
			'/subscriptions',
			subscriptionRequests.map(sr => ({ ...sr, sessionId: this.sessionId }))
		);
	}

	public async unsubscribeAll(
		subscriptionRequests: SubscriptionRequest[]
	): Promise<void> {
		if (!this.sessionId) return Promise.reject('There is no ux4iot session');

		await this.axiosInstance.delete('/subscriptions', {
			data: subscriptionRequests.map(sr => ({
				...sr,
				sessionId: this.sessionId,
			})),
		});
	}

	public async getLastTelemetryValue(
		deviceId: string,
		telemetryKey: string
	): Promise<LastValueTelemetryResponse> {
		if (!this.sessionId) return Promise.reject('There is no ux4iot session');

		const response = await this.axiosInstance.get(
			`/lastValue/${deviceId}/${telemetryKey}`,
			{ headers: { sessionId: this.sessionId } }
		);
		return response.data;
	}

	public async getLastTelemetryValues(
		deviceId: string,
		telemetryKeys: string[]
	): Promise<LastValueTelemetryResponse> {
		const response = await this.axiosInstance.get(`/lastValue/${deviceId}`, {
			headers: { sessionId: this.sessionId },
		});
		const telemetryValues: Record<string, LastValueObj<CachedValueType>> = {};
		for (const [key, value] of Object.entries(response.data.data)) {
			if (telemetryKeys.includes(key)) {
				telemetryValues[key as string] = value as LastValueObj<CachedValueType>;
			}
		}
		return {
			deviceId: response.data.deviceId,
			data: telemetryValues,
			timestamp: response.data.timestamp,
		};
	}

	public async getLastDeviceTwin(
		deviceId: string
	): Promise<LastValueDeviceTwinResponse> {
		if (!this.sessionId) return Promise.reject('There is no ux4iot session');

		const response = await this.axiosInstance.get(`/deviceTwin/${deviceId}`, {
			headers: { sessionId: this.sessionId },
		});
		return response.data;
	}

	public async getLastConnectionState(
		deviceId: string
	): Promise<LastValueConnectionStateResponse> {
		if (!this.sessionId) return Promise.reject('There is no ux4iot session');

		const response = await this.axiosInstance.get(
			`/connectionState/${deviceId}`,
			{ headers: { sessionId: this.sessionId } }
		);

		return response.data;
	}

	public async invokeDirectMethod(
		deviceId: string,
		options: DeviceMethodParams
	): Promise<IoTHubResponse | void> {
		if (!this.sessionId) return Promise.reject('There is no ux4iot session');

		const response = await this.axiosInstance.post(
			'/directMethod',
			{ deviceId, methodParams: options },
			{ headers: { sessionId: this.sessionId } }
		);

		return response.data;
	}

	public async patchDesiredProperties(
		deviceId: string,
		desiredPropertyPatch: Record<string, unknown>
	): Promise<IoTHubResponse | void> {
		if (!this.sessionId) return Promise.reject('There is no ux4iot session');

		const response = await this.axiosInstance.patch<IoTHubResponse | void>(
			'/deviceTwinDesiredProperties',
			{ deviceId, desiredPropertyPatch },
			{ headers: { sessionId: this.sessionId } }
		);

		return response.data;
	}
}
