# ux4iot-react

ux4iot is a tool for directly communicating with your IoT devices from your web frontend. Your React frontend gets access to Azure IoT Hub's 
communication primitives without having a custom-built backend middleware translating between IoT Hub and your user interface. 
No need to design a REST API so that your UI can offer IoT functionality.

Use the hooks in this library to implement your use cases for live data and for controlling devices. 

As an example: Using live data in your React application will be as easy as writing

```js
const myTelemetry = useTelemetry('myDevice', 'myTelemetry');
```

in your React components.

This library provides hooks for:

- `useTelemetry` - Subscribe to a single telemetry key of a device
- `useMultiTelemetry` - Subscribe to telemetry of multiple devices
- `useDeviceTwin` - Subscribe to device twin changes
- `useConnectionState` - Subscribe to connection state updates of a device
- `useDirectMethod` - Execute a direct method on a device
- `usePatchDesiredProperties` - Update the desired properties of the device twin
- `useD2CMessages` - Use the raw messages sent by your devices

## Installation

```
npm install ux4iot-react
```

## Documentation

Check out the [Documentation](https://docs.ux4iot.com/using-react/introduction) for

- Additional options
- Hook API
- ux4iot API
- reference to other related libraries of the ux4iot service
