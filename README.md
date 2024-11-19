# Health Check Widget

## Requirements
This widget needs bootstrap and font-awesome to work correctly, some elements are rendered using buttons classes like:
- btn
- btn-sm
- btn-primary
- btn-warning
- btn-danger
- btn-info
- btn-default
- btn-success

## Overview
The Health Check Widget is a JavaScript-based tool designed to monitor the health of various services in real time. It evaluates the latency and availability of services (both client-side and server-side) and displays results in a compact UI or full-screen mode.

## Features
- **Real-Time Health Monitoring**: Tracks service health using customizable thresholds for warnings and critical states.
- **User Inactivity Detection**: Pauses health checks during user inactivity or when the browser loses focus.
- **UI Flexibility**: Supports both widget and full-screen modes.
- **Details & Reporting**: Provides detailed service health data, with options to send reports or copy details to the clipboard.
- **Customizable Metrics**: Add or modify monitored services easily using the `createMetric` function.

---

## Configuration

### Constants
- **`HEALTH_CHECK_INTERVAL`**: Frequency of automatic health checks (default: 120,000ms or 2 minutes).
- **`AUTHTOKEN`**: Authorization token for making authenticated requests. Replace `##PLACE_HERE_YOUR_AUTH_TOKEN` with your token.
- **`INACTIVITY_TIMEOUT`**: Time of inactivity before stopping health checks (default: 20,000ms or 20 seconds).

### UI Elements
The widget uses predefined element IDs and classes to organize the UI. Customize the following IDs and classes if needed:
- **`HEALTH_CHECK_UI_CONTAINER_ID`**: Main container for the health check widget.
- **`HEALTH_CHECK_DETAILS_UI_CONTAINER_ID`**: Container for detailed health check data.
- **Other IDs and classes**: Refer to the code for additional UI element configurations.

---

## Setup

### Include the Script
Add the widget script to your HTML page:
```html
<script src="path/to/health-check-widget.js" full-screen></script>
```
- Include the `full-screen` attribute if you want the widget to operate in full-screen mode.

### Customize Metrics
Define monitored services by modifying the `METRICS` object:
```javascript
const METRICS = {
    SERVICE_ONE: createMetric('service-one-delay', 'API Service One', () => 'service_one/health-check/network', METRIC_TYPE_ENUM.CLIENT, 100, 1000, false, 'ms'),
    // Add more metrics here
};
```

---

## Usage

### Automatic Start
The widget initializes automatically when the page is ready. It:
1. Creates the main container.
2. Sets up health indicators.
3. Starts periodic health checks.

### Manual Start/Stop
Use the following functions for manual control:
- **Start**: `startAutomaticHealthCheck()` - Initializes the widget.
- **Stop**: `stopHealthCheck()` - Stops all health checks.

---

## API

### `createMetric(name, label, endpoint, type, warnThreshold, criticalThreshold, sendMetric, unit)`
Creates a metric for monitoring.
- **Parameters**:
  - `name`: Unique identifier for the metric.
  - `label`: Display name.
  - `endpoint`: Function returning the service URL.
  - `type`: `METRIC_TYPE_ENUM.CLIENT` or `METRIC_TYPE_ENUM.SERVER`.
  - `warnThreshold`: Latency threshold for warnings.
  - `criticalThreshold`: Latency threshold for critical state.
  - `sendMetric`: Whether to send data to the `/metrics` endpoint.
  - `unit`: Unit of measurement (e.g., `ms`, `μs`).

### Options
**type**
- CLIENT : the delay will be measured directly within the client
- SERVER : the delay will be calculated by the service and returned to the client as a value

**sendMetric**
- true   : the metric value will be sent to a service of your choice ready to be saved or processed.
- false  : the metric will only be displayed on the client page.

**thresholds (_warnThreshold, criticalThreshold_)**

Those values are used by the widget to display the current status of the monitored service using colors.

## UI Interactions

### Details Table
- **Status**: Indicates service health with color-coded icons.
- **Service**: Name of the monitored service.
- **Type**: Whether the metric is client-side or server-side.
- **Latency**: Time taken to respond.
- **Last Check**: Timestamp of the last health check.

### Buttons
- **Toggle Details**: Expands or collapses the details table.
- **Send Report**: Sends a manual health report.
- **Copy Details**: Copies the health report to the clipboard.


#### Copy Details
This button copy the metric details into the clipboard with additional information like the current page, the browser and the evaluation date. 
Metrics are refreshed and pushed to any service (if configured) before being copied into the user clipboard.

---

## Developer Notes
### Debugging
Use the console for debugging:
- `console.debug` logs health check progress.
- `console.error` logs issues with fetching or reporting metrics.

### Extensibility
- Add new services by extending the `METRICS` object.
- Modify health evaluation logic in `evaluateHealth`.

---

## Browser Compatibility
This widget supports modern browsers, including:
- Chrome
- Firefox
- Edge
- Safari

---

## Security
Ensure the `AUTHTOKEN` value is kept secure and replace the placeholder value in production environments.
