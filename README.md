# ux4iot-react

Streaming live data from an azure iothub can be a lot of work. ux4iot solves this problem by providing a service, easy to deploy and use, to interact frictionless with your Azure IoTHub. Use the hooks in this library to implement your use cases for live data and device methods. As an example: Using live data in your react application will be as easy as writing

```js
const myTelemetry = useSingleTelemetry('myDevice', 'myTelemetry');
```

in your react components.

This library provides hooks for:

- `useTelemetry` - Subscribe to telemetry of multiple devices
- `useSingleTelemetry` - Subscribe to a single telemetry key of a device
- `useDeviceTwin` - Subscribe to device twin changes of a device
- `useConnectionState` - Subscribe to connection state updates of a device
- `useDirectMethod` - Execute a direct method on a device
- `usePatchDesiredProperties` - Update the desired properties of a device
- `useD2CMessage` - Use the raw messages sent by your devices

## Installation

```
npm install ux4iot-react
```

## Check out the [Documentation](https://docs.ux4iot.com/using-react/introduction) for

- Additional options
- Hook API
- ux4iot API
- reference to other related libraries of the ux4iot service
