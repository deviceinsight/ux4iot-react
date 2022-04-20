# ux4iot-react

ux4iot is a tool for directly communicating with your IoT devices from your web frontend. Your React frontend gets access to Azure IoT Hub's 
communication primitives without having a custom-built backend middleware translating between IoT Hub and your user interface. 
No need to design a REST API so that your UI can offer IoT functionality.

Use the hooks in this library to implement your use cases for live data and for controlling devices. 

As an example: Using live data in your React application is as easy as writing

```js
const temperature = useTelemetry('myDevice', 'temperature');
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
- `useUx4iot` - Convenience hook to get the Ux4iot instance

## Prerequisites

In order to use this library you need to have an ux4iot instance deployed in your Azure subscription. [Here](https://docs.ux4iot.com/quickstart) 
is a link to a quickstart that explains how to deploy one. [Here](https://azuremarketplace.microsoft.com/en-us/marketplace/apps/deviceinsightgmbh-4961725.ux4iot)
is the link to the Azure Marketplace offering.

## Installation

Install `ux4iot-react` in your frontend application:

```
npm install ux4iot-react
```

## Documentation

Check out the [Documentation](https://docs.ux4iot.com/using-react/introduction) for

- Additional options
- Hook API
- ux4iot Admin SDKs
- ux4iot Admin API
- Reference to other related libraries of the ux4iot service

## Releasing

If you want to release a new version
- `git checkout master`
- Increase the version based on your changed in package.json (usually minor)
- `git commit -m 'Release VERSION'`
- `git tag VERSION -m 'Release VERSION'`
- `git push`
- `git push --tags`

The tag pipeline of github actions will build the package and publish it to npm.
