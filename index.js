const HEALTH_CHECK_INTERVAL = 120000;
const AUTHTOKEN = '##PLACE_HERE_YOUR_AUTH_TOKEN'
let intervalId = null;
let userIsActive = true;
let lastActivityTime = Date.now();
let browserHasFocus = true;
const INACTIVITY_TIMEOUT = 20000;

const HEALTH_CHECK_UI_CONTAINER_ID = "div__health-check-container";
const HEALTH_CHECK_UI_CONTAINER_FULL_SCREEN_CLASS = "div__health-check-container-full-screen";
const HEALTH_CHECK_DETAILS_UI_CONTAINER_ID = "div__health-check-details-container";
const HEALTH_CHECK_DETAILS_LEGEND_UI_CONTAINER_ID = "div__health-check-details-legend-container";
const HEALTH_CHECK_DETAILS_UI_CONTAINER_FULL_SCREEN_CLASS = "div__health-check-details-container-full-screen";
const HEALTH_CHECK_FOOTER_UI_CONTAINER_ID = "div__health-check-footer-details";

const HEALTH_CHECK_UI_INDICATOR__FULL_SCREEN_CLASS = "span__health-check-indicator-full-screen";

const HEALTH_CHECK_DETAILS_UI_BUTTON_ID = "button__health-check-details-container";
const HEALTH_CHECK_SEND_REPORT_UI_BUTTON_ID = "button__health-check-send-report";
const HEALTH_CHECK_COPY_DETAILS_UI_BUTTON_ID = "button__health-check-copy-details";

const HEALTH_CHECK_DETAILS_UI_BUTTON_ICON_ID = "i__health-check-details-container";

const HEALTH_CHECK_DETAILS_UI_TABLE_ID = "table__health-check-details-container";

const HEALTH_ENUM = {
    UNKNOWN: {color: 'gray', icon: 'fa-circle', description: 'No Data'},
    GOOD: {color: 'green', icon: 'fa-circle', description: 'Low'},
    WARN: {color: 'orange', icon: 'fa-circle', description: 'Medium'},
    CRITICAL: {color: 'red', icon: 'fa-circle', description: 'High'},
    FAILURE: {color: 'red', icon: 'fa-times', description: 'Not available'}
};

const METRIC_TYPE_ENUM = {CLIENT: "Client Ping", SERVER: "Server Ping"}
const WIDGET_MODE_ENUM = {WIDGET: "Widget", FULLSCREEN: "Full Screen"}
const WIDGET_MODE = document.currentScript.getAttribute("full-screen") !== null ? WIDGET_MODE_ENUM.FULLSCREEN : WIDGET_MODE_ENUM.WIDGET;

const METRICS = {
    SERVICE_ONE: createMetric('service-one-delay', 'API Service One', () => 'service_one/health-check/network', METRIC_TYPE_ENUM.CLIENT, 100, 1000, false, 'ms'),
    SERVICE_TWO: createMetric('service-two-delay', 'API Service Two', () => 'service_two/health-check/network', METRIC_TYPE_ENUM.CLIENT, 100, 1000, true, 'ms'),
    DATABASE_CONNECTIVITY: createMetric('database-alive-delay', 'Database', () => '/health-check/database', METRIC_TYPE_ENUM.SERVER, 2000, 5000, false, '&micro;s')
};

function createMetric(name, label, endpoint, type, warnThreshold, criticalThreshold, sendMetric = false, unit = 'ms') {
    return {
        name,
        label,
        endpoint,
        type,
        evaluateHealth: value => value < warnThreshold ? HEALTH_ENUM.GOOD : (value > criticalThreshold ? HEALTH_ENUM.CRITICAL : HEALTH_ENUM.WARN),
        value: '?',
        unit,
        sendMetric,
        lastCheck: null
    };
}

function startAutomaticHealthCheck() {
    createHealthCheckContainer();
    createHealthCheckIndicators();
    createOpenDetailsButton();
    createHealthCheckContainerDetails();
    createDetailsTable();
    createTableLegend();
    createFooter();

    setTimeout(() => healthCheck(false), 2000);

    checkUserActivity();
}

function startHealthCheck() {
    if (!intervalId) {
        intervalId = setInterval(() => healthCheck(false), HEALTH_CHECK_INTERVAL);
    }
}

function createHealthCheckIndicators() {
    Object.values(METRICS).forEach(metric => addHealthCheckIndicator(metric.name, metric.label, HEALTH_ENUM.UNKNOWN));
}

function healthCheck(manual = false) {
    Object.values(METRICS).forEach(metric => {
        switch (metric.type) {
            case METRIC_TYPE_ENUM.CLIENT:
            case METRIC_TYPE_ENUM.SERVER:
                doHealthCheck(metric, manual);
                break;
            default:
                console.error("Unsupported metric type");
        }
    })
}

function doHealthCheck(metric, manual = false) {
    console.debug(`Checking ${metric.label}`);

    const originalTimestamp = Date.now();
    fetch(metric.endpoint(), {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': "Bearer " + AUTHTOKEN,
        }
    })
        .then(response => metric.type === METRIC_TYPE_ENUM.SERVER ? response.json() : Date.now() - originalTimestamp)
        .then(delay => {
            metric.value = delay;
            metric.lastCheck = healthCheckFormattedDate();

            updateIndicator(metric);

            if (metric.sendMetric) {
                pushMetric(metric, manual);
            }
        })
        .catch(() => {
            metric.value = null;
            metric.lastCheck = healthCheckFormattedDate();

            updateIndicator(metric);
        });
}

function pushMetric(metric, manual) {
    fetch("/metrics", {
        method: "POST", headers: {
            'Content-Type': 'application/json',
            'Authorization': "Bearer " + AUTHTOKEN,
        }, body: JSON.stringify({"metricName": metric.name, value: metric.value, manuallyTriggered: manual})
    })
        .catch(() => console.error("Something went wrong while pushing metrics."));
}

function addHealthCheckIndicator(indicator, label, health) {
    const span = document.createElement("span");
    span.innerText = label;

    const icon = document.createElement('i');
    icon.id = indicator;
    icon.className = `fa kw-pulsing ${health.icon}`;
    icon.style.color = health.color;
    icon.style.padding = '10px';

    if (WIDGET_MODE === WIDGET_MODE_ENUM.FULLSCREEN) {
        span.classList.add(HEALTH_CHECK_UI_INDICATOR__FULL_SCREEN_CLASS)
    }

    span.insertAdjacentElement('afterbegin', icon);
    document.getElementById(HEALTH_CHECK_UI_CONTAINER_ID).appendChild(span);
}

function updateIndicator(metric) {
    const health = metric.value ? metric.evaluateHealth(metric.value) : HEALTH_ENUM.FAILURE;
    const indicatorElement = document.getElementById(metric.name);
    indicatorElement.style.color = health.color;
    indicatorElement.className = `fa kw-pulsing ${health.icon}`;

    updateDetail(metric);
}

function updateDetail(metric) {
    const statusTD = document.getElementById(`td__status-${metric.name}`);
    statusTD.innerHTML = document.getElementById(metric.name).outerHTML;

    const latencyTD = document.getElementById(`td__latency-${metric.name}`);
    latencyTD.innerHTML = metric.value ? metric.value + metric.unit : '-';

    const lastCheckTD = document.getElementById(`td__last-check-${metric.name}`);
    lastCheckTD.textContent = metric.lastCheck || '';
}

function healthCheckFormattedDate() {
    const date = new Date();

    const day = String(date.getDate()).padStart(2, '0'); // Day (DD)
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month (MM), add 1 because months are zero-indexed
    const year = String(date.getFullYear()).slice(-2); // Year (YY), take last two digits
    const hours = String(date.getHours()).padStart(2, '0'); // Hours (HH)
    const minutes = String(date.getMinutes()).padStart(2, '0'); // Minutes (mm)

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function createDetailsTable() {
    const table = document.createElement('table');
    table.id = HEALTH_CHECK_DETAILS_UI_TABLE_ID;
    table.className = "table table-striped";

    const thead = document.createElement('thead');

    const headerRow = document.createElement('tr');

    const statusTH = getTableHeader("Status", "center");
    const metricTH = getTableHeader("Service", "left");
    const typeTH = getTableHeader("Type", "left");
    const latencyTH = getTableHeader("Latency", "right");
    const lastCheckTH = getTableHeader("Last Check (DD/MM/YY HH:mm)", "right");

    headerRow.append(statusTH, metricTH, typeTH, latencyTH, lastCheckTH);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    Object.values(METRICS)
        .map(metric => getTableRow(metric)).forEach(row => tbody.appendChild(row));

    table.appendChild(tbody);

    document.getElementById(HEALTH_CHECK_DETAILS_UI_CONTAINER_ID).appendChild(table);
}

function getTableHeader(text, alignment = "left") {
    const th = document.createElement('th');
    th.textContent = text;
    th.style.textAlign = alignment;

    return th;
}

function getTableRow(metric) {
    const metricName = metric.name;

    const row = document.createElement('tr');

    const statusTD = getTableColumn(`td__status-${metricName}`, document.getElementById(metricName).outerHTML, 'center');
    const metricTD = getTableColumn(`td__metric-${metricName}`, metric.label, 'left');
    const typeTD = getTableColumn(`td__type-${metricName}`, metric.type.toUpperCase(), 'left');
    const latencyTD = getTableColumn(`td__latency-${metricName}`, "Evaluating...", 'right');
    const lastCheckTD = getTableColumn(`td__last-check-${metricName}`, metric.lastCheck, 'right');

    row.append(statusTD, metricTD, typeTD, latencyTD, lastCheckTD);

    return row;
}

function getTableColumn(id, content, alignment = 'left') {
    const column = document.createElement('td');
    column.id = id;
    column.innerHTML = content;
    column.style.textAlign = alignment;
    column.style.verticalAlign = "middle";

    return column;
}

function createHealthCheckContainerDetails() {
    const container = getContainerElement(HEALTH_CHECK_DETAILS_UI_CONTAINER_ID);

    if (WIDGET_MODE === WIDGET_MODE_ENUM.FULLSCREEN) {
        container.classList.add(HEALTH_CHECK_DETAILS_UI_CONTAINER_FULL_SCREEN_CLASS);
    }

    container.classList.add("table-responsive");

    document.getElementById(HEALTH_CHECK_UI_CONTAINER_ID).appendChild(getBreakElement());
    document.getElementById(HEALTH_CHECK_UI_CONTAINER_ID).appendChild(container);
}

function createTableLegend() {
    const container = getContainerElement(HEALTH_CHECK_DETAILS_LEGEND_UI_CONTAINER_ID);
    container.innerHTML = '<b>Latency</b> | ';

    Object.values(HEALTH_ENUM).forEach(metric => {
        const span = document.createElement("span");
        span.innerText = metric.description;

        const icon = document.createElement('i');
        icon.className = `fa ${metric.icon}`;
        icon.style.color = metric.color;
        icon.style.padding = '10px';

        span.insertAdjacentElement('afterbegin', icon);

        container.appendChild(span);
    })

    document.getElementById(HEALTH_CHECK_DETAILS_UI_CONTAINER_ID).appendChild(container);
}

function createFooter() {
    const container = getContainerElement(HEALTH_CHECK_FOOTER_UI_CONTAINER_ID);

    document.getElementById(HEALTH_CHECK_DETAILS_UI_CONTAINER_ID).appendChild(container);

    const createSendReportButton = () => {
        const container = createButton(HEALTH_CHECK_FOOTER_UI_CONTAINER_ID, HEALTH_CHECK_SEND_REPORT_UI_BUTTON_ID, ["btn", "btn-sm", "btn-warning"], sendReport, "Send Report", ["fa", "fa-bug"]);
        document.getElementById(HEALTH_CHECK_DETAILS_UI_CONTAINER_ID).appendChild(container);
    }

    const createCopyDetailsButton = () => {
        const container = createButton(HEALTH_CHECK_FOOTER_UI_CONTAINER_ID, HEALTH_CHECK_COPY_DETAILS_UI_BUTTON_ID, ["btn", "btn-sm", "btn-info"], copyDetails, "Copy Details", ["fa", "fa-files-o"]);
        document.getElementById(HEALTH_CHECK_DETAILS_UI_CONTAINER_ID).appendChild(container);
    }

    const createButton = (buttonContainerId, buttonId, buttonClasses = [], buttonEvent, buttonText, iconClasses = []) => {
        const container = document.getElementById(buttonContainerId);

        const button = getButtonElement(buttonId, buttonClasses, "click", buttonEvent)
        const icon = getIconElement(iconClasses);
        const span = getButtonLabelElement(buttonText);

        button.appendChild(icon);
        button.appendChild(span);
        container.appendChild(button);

        return container;
    }

    createCopyDetailsButton();
    createSendReportButton();
}

function getContainerElement(id) {
    const container = document.createElement('div');
    container.id = id;

    return container;
}

function getButtonElement(id, classes = [], eventName, eventListenerFunction) {
    const button = document.createElement('button');
    button.id = id;
    button.classList.add(...classes);

    if (eventName && eventListenerFunction) {
        button.addEventListener(eventName, eventListenerFunction)
    }

    return button;
}

function getButtonLabelElement(label) {
    const span = document.createElement("span");
    span.textContent = label;
    span.style.margin = "10px";

    return span;
}

function getIconElement(classes) {
    const icon = document.createElement("i");
    icon.classList.add(...classes);

    return icon;
}


function sendReport() {
    healthCheck(true);

    updateButtonOnClick(document.getElementById(HEALTH_CHECK_SEND_REPORT_UI_BUTTON_ID), 'Report Sent!')
}


function copyDetails() {
    const dummy = document.createElement("textarea");
    document.body.appendChild(dummy);
    dummy.innerHTML = getDetails();
    dummy.select();
    document.execCommand("copy");
    dummy.remove();

    updateButtonOnClick(document.getElementById(HEALTH_CHECK_COPY_DETAILS_UI_BUTTON_ID), 'Copied!')
}

function updateButtonOnClick(button, newbuttonText) {
    const info = button.classList.contains("btn-info")
    const warning = button.classList.contains("btn-warning");
    const primary = button.classList.contains("btn-primary");
    const success = button.classList.contains("btn-success");
    const danger = button.classList.contains("btn-danger");

    button.classList.remove("btn-info");
    button.classList.remove("btn-warning");
    button.classList.remove("btn-primary");
    button.classList.remove("btn-success");
    button.classList.remove("btn-danger");
    button.classList.add("btn-default");
    button.setAttribute("disabled", "disabled");

    const originalButtonText = button.getElementsByTagName("span")[0].textContent;
    button.getElementsByTagName("span")[0].textContent = newbuttonText;
    setTimeout(() => {
        button.getElementsByTagName("span")[0].textContent = originalButtonText;
        button.classList.remove("btn-default");
        button.removeAttribute("disabled");

        if (info) {
            button.classList.add("btn-info");
        }

        if (warning) {
            button.classList.add("btn-warning");
        }

        if (primary) {
            button.classList.add("btn-primary");
        }

        if (success) {
            button.classList.add("btn-success");
        }

        if (danger) {
            button.classList.add("btn-danger");
        }

    }, 1500);
}

function getDetails() {
    let latencies = "";
    Object.values(METRICS).forEach(metric => {
        if (metric.value) {
            latencies += `${metric.label} latency: ${metric.value} ${metric.unit};\n`
        } else {
            latencies += `${metric.label} seems not responding :( ;\n`
        }
    });

    const detectBrowser = () => {
        const userAgent = navigator.userAgent;
        if (userAgent.indexOf("Edg") > -1) {
            return "Microsoft Edge";
        } else if (userAgent.indexOf("Chrome") > -1) {
            return "Chrome";
        } else if (userAgent.indexOf("Firefox") > -1) {
            return "Firefox";
        } else if (userAgent.indexOf("Safari") > -1) {
            return "Safari";
        } else if (userAgent.indexOf("Opera") > -1) {
            return "Opera";
        } else if (userAgent.indexOf("Trident") > -1 || userAgent.indexOf("MSIE") > -1) {
            return "Internet Explorer";
        }

        return "Unknown [Your Browser]";
    }

    const additionalDetails = "\nBrowser: " + detectBrowser() +
        "\nCurrent Page: " + window.location.href +
        "\nLocation: [Your Country]" +
        "\nWorking from: [Office/Home]" +
        "\nOther details: [Insert any other useful information]" +
        "\nDate: " + healthCheckFormattedDate();

    return latencies + additionalDetails;
}

function createOpenDetailsButton() {
    if (WIDGET_MODE !== WIDGET_MODE_ENUM.FULLSCREEN) {
        const button = document.createElement("button");
        button.id = HEALTH_CHECK_DETAILS_UI_BUTTON_ID;
        button.className = "btn btn-sm btn-default";

        const icon = document.createElement("i");
        icon.id = HEALTH_CHECK_DETAILS_UI_BUTTON_ICON_ID;
        icon.classList.add("fa", "fa-angle-double-down");
        button.appendChild(icon);

        button.addEventListener('click', toggleDetailsVisibility);

        document.getElementById(HEALTH_CHECK_UI_CONTAINER_ID).appendChild(button);
    }
}

function toggleDetailsVisibility() {
    const container = document.getElementById(HEALTH_CHECK_DETAILS_UI_CONTAINER_ID);

    const isHidden = getComputedStyle(document.getElementById(HEALTH_CHECK_DETAILS_UI_CONTAINER_ID)).display === 'none';
    container.style.display = isHidden ? 'block' : 'none';

    const buttonIcon = document.getElementById(HEALTH_CHECK_DETAILS_UI_BUTTON_ICON_ID);
    const isStillHidden = getComputedStyle(document.getElementById(HEALTH_CHECK_DETAILS_UI_CONTAINER_ID)).display === 'none';
    buttonIcon.className = isStillHidden ? "fa fa-angle-double-down" : "fa fa-angle-double-up";
}

function createHealthCheckContainer() {
    const container = document.createElement('div');
    container.id = HEALTH_CHECK_UI_CONTAINER_ID;

    if (WIDGET_MODE === WIDGET_MODE_ENUM.FULLSCREEN) {
        container.classList.add(HEALTH_CHECK_UI_CONTAINER_FULL_SCREEN_CLASS);
    }

    container.classList.add("container-fluid");

    const icon = document.createElement("i");
    icon.className = "fa fa-heartbeat";
    icon.style.paddingRight = "10px";
    icon.style.borderRight = "1px solid black";
    icon.style.color = "red";

    if (WIDGET_MODE === WIDGET_MODE_ENUM.FULLSCREEN) {
        icon.classList.add(HEALTH_CHECK_UI_INDICATOR__FULL_SCREEN_CLASS);
    }

    container.appendChild(icon);

    document.body.appendChild(container);
}

function getBreakElement() {
    const breakElement = document.createElement("span");
    breakElement.style.height = "0";
    breakElement.style.flexBasis = "100%";
    return breakElement;
}

function checkUserActivity() {
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            setUserActive();
        } else {
            setUserInactive();
        }
    });

    document.addEventListener("keydown", setUserActive);
    document.addEventListener("scroll", setUserActive);
    document.addEventListener("click", setUserActive);
    window.addEventListener("focus", () => browserHasFocus = true);
    window.addEventListener("blur", () => {
        browserHasFocus = false;

        setUserInactive()
    });

    setInterval(() => {
        checkUserInactivity();
        checkActivity();
    }, 10000);
}

function stopHealthCheck() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

function checkActivity() {
    if (userIsActive && browserHasFocus) {
        startHealthCheck();
    } else {
        stopHealthCheck();
    }
}

function setUserActive() {
    userIsActive = true;
    lastActivityTime = Date.now();
}

function setUserInactive() {
    userIsActive = false;
}

function checkUserInactivity() {
    if (isUserInactive()) {
        userIsActive = false;
    }
}

function isUserInactive() {
    return Date.now() - lastActivityTime > INACTIVITY_TIMEOUT;
}


document.onreadystatechange = () => {
    if (document.readyState === "interactive") {
        setTimeout(() => startAutomaticHealthCheck(), 500);
    }
}
