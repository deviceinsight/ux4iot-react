type Subscriptions = {
	deviceTwin: string;
	connectionState: string;
	d2cMessage: string;
	telemetry: Record<string, string[]>;
};

type DeviceID = string;

type SubscriptionForState = {
	deviceId: string;
	kind: 'deviceTwin' | 'connectionState' | 'd2cMessage' | 'telemetry';
	onData: (deviceId: string, ts: string, data: any) => void;
	telemetryKeys: string[];
};

type Ux4iotState = {
	grants: {
		deviceTwin: DeviceID[];
		connectionState: DeviceID[];
		d2cMessage: DeviceID[];
		telemetry: {
			[deviceId: DeviceID]: string[];
		};
		desiredProperties: DeviceID[];
		directMethod: {
			[deviceId: DeviceID]: string[];
		};
	};
	subscriptions: {
		[subscriptionId: string]: SubscriptionForState;
	};
};

/*
  Ux4iot:
    - patchDesiredProperties( deviceId, patch)
      - catch notReady: Error
      - catch notGranted: Youre not authorized
    - invokeDirectMethod(deviceId, directMethod)
      - catch notReady: Error
      - catch notGranted: Youre not authorized
    - state: Ux4iotState
      - methods:
        - private hasGrantFor(deviceId, telemetryKey): checks if theres a need to ask for grant
        - private hasSubscriptionFor(deviceId, telemetryKey): checks if theres a need to subscribe
        - onStateChange
    // - ungrant(grant)
    - grant(grant)
      if ux4iot.ready === false:
        - enqueue grantrequest
      else 
        - requests grant if grant isnt already in state
          - success: add grant to ux4iotState
          - failure: onGrantError
    - subscribe(subscriberId, subReq)
      - subscribes data if data isnt already subscribed to
        - success: add subscription to ux4iotState
        - failure: onSubscriptionError
    - unsubscribe(subscriberId, subReq)
      - unsubscribes data if data isnt still subscribed by anyone else
        - success: remove subscription to ux4iotState
        - failure: onSubscriptionError
    - onData:
      for each subscriptionId.onDataCallback in ux4iotState.subscriptions
        - match deviceId, match type, aggregate telemetry
          - onDataCallback(deviceId, data)

/*

useTelemetry:

state:
  - telemetryValue
  - ux4iot context

effects
  ux4iot.onIsReadyChange
    - is ready?
      yes:
      - ux4iot.askGrant
        - true: granted
        - false: onGrantError
      - ux4iot.askSubscription:
        - true: subscribed
        - false: onSubscriptionError
      no:
      - idle

 */

/*
useMultiTelemetry
  for each deviceId:
    for each telemetryKey of deviceId:
      addTelemetry();
  
  addTelemetry:
    - ux4iot.subscribe(subscriberId, subReq) -> replace subrequest!!!
*/

function subscribe(subscriberId: string, onData: () => void) {
	// update subscription state
}

export const subscriptionState = {};
