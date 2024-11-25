#  💉 CheckMate Widget 💔 or 💗

CheckMate is a JavaScript-based health check monitoring system designed to track the latency and status of various services (client or server). It provides an intuitive user interface that displays service statuses, latency information, and includes features like generating reports, copying details, and refreshing metrics at set intervals.

Yeah, that's not a dating widget c:

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

## Features

- **Real-time health checks**: Continuously monitor the health of services by pinging their endpoints.
- **Service Status Indicators**: Show status indicators with icons representing the health of each service.
- **Customizable thresholds**: Set warning and critical thresholds for latency and automatically update service health status.
- **Full-Screen Mode**: Toggle full-screen mode for more detailed health check views.
- **Metric Push**: Send the health check data to an external server (push metrics).
- **Service Details**: View detailed latency and last check time in a table.
- **Copy Report**: Copy the current health check details to your clipboard.
- **Send Report**: Manually trigger health checks and send a report to a specified URL.
- **Responsive Layout**: Works well on both desktop and mobile devices.

## Installation

To use CheckMate, simply include the JavaScript file in your HTML, or install it via NPM if you are working within a Node.js environment.


### Include the Script
Add the widget script to your HTML page:
```html
<script src="path/to/health-check-widget.js"></script>
```

## Usage

### Initialization

To create a new instance of `CheckMate`, provide the required parameters for authentication and pushing metrics:

```javascript
const healthCheck = new CheckMate('YOUR_AUTH_TOKEN', 'YOUR_METRICS_PUSH_URL');
```

#### Parameters:
- **authToken**: (String) The authentication token for your API.
- **pushMetricsUrl**: (String) The URL to push the health metrics.
- **fullScreen**: (Boolean, optional) Set to `true` for full-screen mode. Default is `false`.

### Creating Metrics

You can create custom metrics for monitoring by calling the `createMetric` function:

```javascript
healthCheck.createMetric(
    'service1',          // Metric name
    'Service 1',         // Display label
    '/api/health',       // API endpoint to check
    CheckMate.METRIC_TYPE_ENUM.SERVER,  // Metric type (CLIENT/SERVER)
    100,                 // Warning threshold (in ms)
    300,                 // Critical threshold (in ms)
    true,                // Whether to send the metric to external server
    'ms'                 // Unit of measurement (optional)
);
```


### Options
**type**
- CLIENT : the delay will be measured directly within the client
- SERVER : the delay will be calculated by the service and returned to the client as a value

**sendMetric**
- true   : the metric value will be sent to a service of your choice ready to be saved or processed.
- false  : the metric will only be displayed on the client page.

**thresholds (_warnThreshold, criticalThreshold_)**

Those values are used by the widget to display the current status of the monitored service using colors.

### Start Health Monitoring

Once metrics are created, you can start health checks:

```javascript
healthCheck.start();  // Start monitoring
```

You can also specify if you want to reinitialize the health check:

```javascript
healthCheck.start(true); // Reinitialize and start fresh
```

You can call the function `hasBeenAlreadyInitialized()` to check if the widget has been already initialized with all the metrics, based on the return value, which is a boolean, you can decide if initialize it again or not.

```javascript
checkMate.hasBeenAlreadyInitialized();
```

**Example:**
```javascript
const checkMate = new CheckMate("my-token", "/metrics-service", false);
const hasBeenAlreadyInizialized = checkMate.hasBeenAlreadyInitialized();

if(!hasBeenAlreadyInizialized) {
    const DEFAULT_METRICS = [
        checkMate.createMetric('service-one', 'API', '/service-one/network', CheckMate.METRIC_TYPE_ENUM.CLIENT, 100, 1000, false, 'ms'),
        checkMate.createMetric('service-two', 'DATABASE', '/service-one/database', CheckMate.METRIC_TYPE_ENUM.CLIENT, 100, 1000, true, 'ms')
    ]


    checkMate.setMetrics(DEFAULT_METRICS);

} else {
    checkMate.loadMetricsFromStorage();
}

checkMate.start(!hasBeenAlreadyInizialized)
```


#### Copy Details
This button copy the metric details into the clipboard with additional information like the current page, the browser and the evaluation date. 
Metrics are refreshed and pushed to any service (if configured) before being copied into the user clipboard.

#### Send Report
This button copy force a new metric evaluation and it then push them to the configured service.

## Health Check Details

The health check system shows a variety of details, including:

- **Status**: Current status of the service (Good, Warning, Critical, or Failure).
- **Service**: Name/Label of the service.
- **Type**: Type of metric (Client Ping or Server Ping).
- **Latency**: The latency or delay (in milliseconds).
- **Last Check**: Timestamp of the last health check.


## Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Health Check</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" rel="stylesheet">
</head>
<body>
    <script src="path/to/CheckMate.js"></script>
    <script>
        // Create instance of CheckMate
        const healthCheck = new CheckMate('YOUR_AUTH_TOKEN', 'YOUR_METRICS_PUSH_URL');

        // Create metrics
        healthCheck.createMetric(
            'service1',
            'Service 1',
            '/api/health',
            CheckMate.METRIC_TYPE_ENUM.SERVER,
            100,
            300,
            true,
            'ms'
        );

        // Start monitoring
        healthCheck.start();
    </script>
</body>
</html>
```

## Contributing

If you'd like to contribute to this project, feel free to fork the repository and create a pull request with your improvements. Please ensure to write unit tests for any new features or bug fixes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Feel free to adjust or add any information specific to your use case or project!
