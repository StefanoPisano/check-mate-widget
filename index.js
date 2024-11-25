class CheckMate {

    // UI ELEMENTS IDENTIFIERS
    HEALTH_CHECK_UI_CONTAINER_ID = "div__health-check-container";
    HEALTH_CHECK_UI_CONTAINER_FULL_SCREEN_CLASS = "div__health-check-container-full-screen";
    HEALTH_CHECK_DETAILS_UI_CONTAINER_ID = "div__health-check-details-container";
    HEALTH_CHECK_DETAILS_LEGEND_UI_CONTAINER_ID = "div__health-check-details-legend-container";
    HEALTH_CHECK_DETAILS_UI_CONTAINER_FULL_SCREEN_CLASS = "div__health-check-details-container-full-screen";
    HEALTH_CHECK_FOOTER_UI_CONTAINER_ID = "div__health-check-footer-details";

    HEALTH_CHECK_UI_INDICATOR__FULL_SCREEN_CLASS = "span__health-check-indicator-full-screen";

    HEALTH_CHECK_DETAILS_UI_BUTTON_ID = "button__health-check-details-container";
    HEALTH_CHECK_SEND_REPORT_UI_BUTTON_ID = "button__health-check-send-report";
    HEALTH_CHECK_COPY_DETAILS_UI_BUTTON_ID = "button__health-check-copy-details";

    HEALTH_CHECK_DETAILS_UI_BUTTON_ICON_ID = "i__health-check-details-container";

    HEALTH_CHECK_DETAILS_UI_TABLE_ID = "table__health-check-details-container";

    static HEALTH_ENUM = {
        UNKNOWN: {color: 'gray', icon: 'fa-circle', description: 'No Data'},
        GOOD: {color: 'green', icon: 'fa-circle', description: 'Low'},
        WARN: {color: 'orange', icon: 'fa-circle', description: 'Medium'},
        CRITICAL: {color: 'red', icon: 'fa-circle', description: 'High'},
        FAILURE: {color: 'red', icon: 'fa-times', description: 'Not available'}
    };

    static METRIC_TYPE_ENUM = {CLIENT: "Client Ping", SERVER: "Server Ping"}

    SESSION_STORAGE_METRICS = "cmate-metrics";
    SESSION_STORAGE_LAST_REFRESH = "cmate-last_refresh";
    HEALTH_CHECK_INTERVAL = 300_000; // 5 minutes
    BROWSERHASFOCUS = true;
    METRICS = [];

    constructor(authToken, pushMetricsUrl, fullScreen = false) {
        this.token = authToken;
        this.pushMetricsUrl = pushMetricsUrl;
        this.fullScreen = fullScreen;
    }

    hasBeenAlreadyInitialized =  () => !!sessionStorage.getItem(this.SESSION_STORAGE_METRICS)

    createMetric = (name, label, endpoint, type, warnThreshold, criticalThreshold, sendMetric = false, unit = 'ms') => {
        return {
            name,
            label,
            endpoint,
            type,
            warnThreshold,
            criticalThreshold,
            value: '?',
            unit,
            sendMetric,
            lastCheck: null
        }
    }

    getMetrics = () => this.METRICS

    loadMetricsFromStorage = () => {
        while (this.METRICS.length > 0) {
            this.METRICS.pop();
        }

        Array.prototype.push.apply(this.METRICS, JSON.parse(sessionStorage.getItem(this.SESSION_STORAGE_METRICS)));
    }

    setMetrics = (metrics = []) => {
        while (this.METRICS.length > 0) {
            this.METRICS.pop();
        }

        Array.prototype.push.apply(this.METRICS, metrics);

        this.#clearMetrics();

        sessionStorage.setItem(this.SESSION_STORAGE_METRICS, JSON.stringify(this.METRICS));
    }

    start = (reinitialize = false) => {
        setTimeout(() => {
            this.#createHealthCheckContainer();
            this.#createHealthCheckIndicators();
            this.#createOpenDetailsButton();
            this.#createHealthCheckContainerDetails();
            this.#createDetailsTable();
            this.#createTableLegend();
            this.#createFooter();

            if(reinitialize) {
                this.#healthCheck(false);
            } else {
                this.getMetrics().forEach(metric => this.#updateIndicator(metric))
            }

            this.#setUpInterval();
        }, this.fullScreen ? 500 : 3000);
    }

    #clearMetrics= () => {
        sessionStorage.removeItem(this.SESSION_STORAGE_METRICS);
        sessionStorage.removeItem(this.SESSION_STORAGE_LAST_REFRESH);
    }

    #evaluateHealth(metric, value) {
        return value < metric.warnThreshold
            ? CheckMate.HEALTH_ENUM.GOOD
            : (value > metric.criticalThreshold ? CheckMate.HEALTH_ENUM.CRITICAL : CheckMate.HEALTH_ENUM.WARN);
    }


    #startHealthCheck() {
        this.#healthCheck(false);
    }


    #createHealthCheckIndicators() {
        this.getMetrics().forEach(metric => this.#addHealthCheckIndicator(metric.name, metric.label, CheckMate.HEALTH_ENUM.UNKNOWN));
    }

    #healthCheck(manual = false) {
        this.getMetrics().forEach(metric => {
            switch (metric.type) {
                case CheckMate.METRIC_TYPE_ENUM.CLIENT:
                case CheckMate.METRIC_TYPE_ENUM.SERVER:
                    this.#doHealthCheck(metric, manual);
                    break;
                default:
                    console.error("Unsupported metric type");
            }
        })
    }

    #doHealthCheck(metric, manual = false) {
        const originalTimestamp = Date.now();
        fetch(metric.endpoint, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': "Bearer " + this.token,
            }
        })
            .then(response => metric.type === CheckMate.METRIC_TYPE_ENUM.SERVER ? response.json() : Date.now() - originalTimestamp)
            .then(delay => {
                metric.value = delay;
                metric.lastCheck = this.#healthCheckFormattedDate();

                this.#updateMetric(metric);

                this.#setLastRefreshTime();

                this.#updateIndicator(metric);

                if (metric.sendMetric) {
                    this.#pushMetric(metric, manual);
                }
            })
            .catch(() => {
                metric.value = null;
                metric.lastCheck = this.#healthCheckFormattedDate();

                this.#updateMetric(metric);

                this.#setLastRefreshTime();

                this.#updateIndicator(metric);
            });
    }

    #updateMetric(metric) {
        const metrics = JSON.parse(sessionStorage.getItem(this.SESSION_STORAGE_METRICS));
        const metricToUpdate = metrics.find(m => m.name === metric.name);
        metricToUpdate.value = metric.value
        metricToUpdate.lastCheck = metric.lastCheck;

        sessionStorage.setItem(this.SESSION_STORAGE_METRICS, JSON.stringify(metrics));
    }

    #pushMetric(metric, manual) {
        fetch(this.pushMetricsUrl, {
            method: "POST", headers: {
                'Content-Type': 'application/json',
                'Authorization': "Bearer " + this.token,
            }, body: JSON.stringify({"metricName": metric.name, value: metric.value, manuallyTriggered: manual})
        })
            .catch(() => console.error("Something went wrong while pushing metrics."));
    }

    #addHealthCheckIndicator(indicator, label, health) {
        const span = document.createElement("span");
        span.innerText = label;

        const icon = document.createElement('i');
        icon.id = indicator;
        icon.className = `fa kw-pulsing ${health.icon}`;
        icon.style.color = health.color;
        icon.style.padding = '10px';

        if (this.fullScreen) {
            span.classList.add(this.HEALTH_CHECK_UI_INDICATOR__FULL_SCREEN_CLASS)
        }

        span.insertAdjacentElement('afterbegin', icon);
        document.getElementById(this.HEALTH_CHECK_UI_CONTAINER_ID).appendChild(span);
    }

    #updateIndicator(metric) {
        const health = metric.value ? this.#evaluateHealth(metric, metric.value) : this.HEALTH_ENUM.FAILURE;
        const indicatorElement = document.getElementById(metric.name);
        indicatorElement.style.color = health.color;
        indicatorElement.className = `fa kw-pulsing ${health.icon}`;

        this.#updateDetail(metric);
    }

    #updateDetail(metric) {
        const statusTD = document.getElementById(`td__status-${metric.name}`);
        statusTD.innerHTML = document.getElementById(metric.name).outerHTML;

        const latencyTD = document.getElementById(`td__latency-${metric.name}`);
        latencyTD.innerHTML = metric.value ? metric.value + metric.unit : '-';

        const lastCheckTD = document.getElementById(`td__last-check-${metric.name}`);
        lastCheckTD.textContent = metric.lastCheck || '';
    }

    #healthCheckFormattedDate() {
        const date = new Date();

        const day = String(date.getDate()).padStart(2, '0'); // Day (DD)
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Month (MM), add 1 because months are zero-indexed
        const year = String(date.getFullYear()).slice(-2); // Year (YY), take last two digits
        const hours = String(date.getHours()).padStart(2, '0'); // Hours (HH)
        const minutes = String(date.getMinutes()).padStart(2, '0'); // Minutes (mm)

        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    #createDetailsTable() {
        const table = document.createElement('table');
        table.id = this.HEALTH_CHECK_DETAILS_UI_TABLE_ID;
        table.className = "table table-striped";

        const thead = document.createElement('thead');

        const headerRow = document.createElement('tr');

        const statusTH = this.#getTableHeader("Status", "center");
        const metricTH = this.#getTableHeader("Service", "left");
        const typeTH = this.#getTableHeader("Type", "left");
        const latencyTH = this.#getTableHeader("Latency", "right");
        const lastCheckTH = this.#getTableHeader("Last Check (DD/MM/YY HH:mm)", "right");

        headerRow.append(statusTH, metricTH, typeTH, latencyTH, lastCheckTH);
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        this.getMetrics()
            .map(metric => this.#getTableRow(metric)).forEach(row => tbody.appendChild(row));

        table.appendChild(tbody);

        document.getElementById(this.HEALTH_CHECK_DETAILS_UI_CONTAINER_ID).appendChild(table);
    }

    #getTableHeader(text, alignment = "left") {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.textAlign = alignment;

        return th;
    }

    #getTableRow(metric) {
        const metricName = metric.name;

        const row = document.createElement('tr');

        const statusTD = this.#getTableColumn(`td__status-${metricName}`, document.getElementById(metricName).outerHTML, 'center');
        const metricTD = this.#getTableColumn(`td__metric-${metricName}`, metric.label, 'left');
        const typeTD = this.#getTableColumn(`td__type-${metricName}`, metric.type.toUpperCase(), 'left');
        const latencyTD = this.#getTableColumn(`td__latency-${metricName}`, "Evaluating...", 'right');
        const lastCheckTD = this.#getTableColumn(`td__last-check-${metricName}`, metric.lastCheck, 'right');

        row.append(statusTD, metricTD, typeTD, latencyTD, lastCheckTD);

        return row;
    }

    #getTableColumn(id, content, alignment = 'left') {
        const column = document.createElement('td');
        column.id = id;
        column.innerHTML = content;
        column.style.textAlign = alignment;
        column.style.verticalAlign = "middle";

        return column;
    }

    #createHealthCheckContainerDetails() {
        const container = this.#getContainerElement(this.HEALTH_CHECK_DETAILS_UI_CONTAINER_ID);

        if (this.fullScreen) {
            container.classList.add(this.HEALTH_CHECK_DETAILS_UI_CONTAINER_FULL_SCREEN_CLASS);
        }

        container.classList.add("table-responsive");

        document.getElementById(this.HEALTH_CHECK_UI_CONTAINER_ID).appendChild(this.#getBreakElement());
        document.getElementById(this.HEALTH_CHECK_UI_CONTAINER_ID).appendChild(container);
    }

    #createTableLegend() {
        const container = this.#getContainerElement(this.HEALTH_CHECK_DETAILS_LEGEND_UI_CONTAINER_ID);
        container.innerHTML = '<b>Latency</b> | ';

        Object.values(CheckMate.HEALTH_ENUM).forEach(metric => {
            const span = document.createElement("span");
            span.innerText = metric.description;

            const icon = document.createElement('i');
            icon.className = `fa ${metric.icon}`;
            icon.style.color = metric.color;
            icon.style.padding = '10px';

            span.insertAdjacentElement('afterbegin', icon);

            container.appendChild(span);
        })

        document.getElementById(this.HEALTH_CHECK_DETAILS_UI_CONTAINER_ID).appendChild(container);
    }

    #createFooter() {
        const container = this.#getContainerElement(this.HEALTH_CHECK_FOOTER_UI_CONTAINER_ID);

        document.getElementById(this.HEALTH_CHECK_DETAILS_UI_CONTAINER_ID).appendChild(container);

        const createSendReportButton = () => {
            const container = createButton(this.HEALTH_CHECK_FOOTER_UI_CONTAINER_ID, this.HEALTH_CHECK_SEND_REPORT_UI_BUTTON_ID, ["btn", "btn-sm", "btn-warning"], this.#sendReport.bind(this), "Send Report", ["fa", "fa-bug"]);
            document.getElementById(this.HEALTH_CHECK_DETAILS_UI_CONTAINER_ID).appendChild(container);
        }

        const createCopyDetailsButton = () => {
            const container = createButton(this.HEALTH_CHECK_FOOTER_UI_CONTAINER_ID, this.HEALTH_CHECK_COPY_DETAILS_UI_BUTTON_ID, ["btn", "btn-sm", "btn-info"], this.#copyDetails.bind(this), "Copy Details", ["fa", "fa-files-o"]);
            document.getElementById(this.HEALTH_CHECK_DETAILS_UI_CONTAINER_ID).appendChild(container);
        }

        const createButton = (buttonContainerId, buttonId, buttonClasses = [], buttonEvent, buttonText, iconClasses = []) => {
            const container = document.getElementById(buttonContainerId);

            const button = this.#getButtonElement(buttonId, buttonClasses, "click", buttonEvent)
            const icon = this.#getIconElement(iconClasses);
            const span = this.#getButtonLabelElement(buttonText);

            button.appendChild(icon);
            button.appendChild(span);
            container.appendChild(button);

            return container;
        }

        createCopyDetailsButton();
        createSendReportButton();
    }

    #getContainerElement(id) {
        const container = document.createElement('div');
        container.id = id;

        return container;
    }

    #getButtonElement(id, classes = [], eventName, eventListenerFunction) {
        const button = document.createElement('button');
        button.id = id;
        button.classList.add(...classes);

        if (eventName && eventListenerFunction) {
            button.addEventListener(eventName, eventListenerFunction)
        }

        return button;
    }

    #getButtonLabelElement(label) {
        const span = document.createElement("span");
        span.textContent = label;
        span.style.margin = "10px";

        return span;
    }

    #getIconElement(classes) {
        const icon = document.createElement("i");
        icon.classList.add(...classes);

        return icon;
    }

    #sendReport() {
        this.#healthCheck(true);

        this.#updateButtonOnClick(document.getElementById(this.HEALTH_CHECK_SEND_REPORT_UI_BUTTON_ID), 'Report Sent!')
    }

    #copyDetails() {
        const dummy = document.createElement("textarea");
        document.body.appendChild(dummy);
        dummy.innerHTML = this.#getDetails();
        dummy.select();
        document.execCommand("copy");
        dummy.remove();

        this.#updateButtonOnClick(document.getElementById(this.HEALTH_CHECK_COPY_DETAILS_UI_BUTTON_ID), 'Copied!')
    }

    #updateButtonOnClick(button, newbuttonText) {
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

    #getDetails() {
        let latencies = "";
        this.getMetrics().forEach(metric => {
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
            "\nDate: " + this.#healthCheckFormattedDate();

        return latencies + additionalDetails;
    }

    #createOpenDetailsButton() {
        if (!this.fullScreen) {
            const button = document.createElement("button");
            button.id = this.HEALTH_CHECK_DETAILS_UI_BUTTON_ID;
            button.className = "btn btn-sm btn-default";

            const icon = document.createElement("i");
            icon.id = this.HEALTH_CHECK_DETAILS_UI_BUTTON_ICON_ID;
            icon.classList.add("fa", "fa-angle-double-down");
            button.appendChild(icon);

            button.addEventListener('click', this.#toggleDetailsVisibility.bind(this));

            document.getElementById(this.HEALTH_CHECK_UI_CONTAINER_ID).appendChild(button);
        }
    }

    #toggleDetailsVisibility() {
        const container = document.getElementById(this.HEALTH_CHECK_DETAILS_UI_CONTAINER_ID);

        const isHidden = getComputedStyle(document.getElementById(this.HEALTH_CHECK_DETAILS_UI_CONTAINER_ID)).display === 'none';
        container.style.display = isHidden ? 'block' : 'none';

        const buttonIcon = document.getElementById(this.HEALTH_CHECK_DETAILS_UI_BUTTON_ICON_ID);
        const isStillHidden = getComputedStyle(document.getElementById(this.HEALTH_CHECK_DETAILS_UI_CONTAINER_ID)).display === 'none';
        buttonIcon.className = isStillHidden ? "fa fa-angle-double-down" : "fa fa-angle-double-up";
    }

    #createHealthCheckContainer() {
        const container = document.createElement('div');
        container.id = this.HEALTH_CHECK_UI_CONTAINER_ID;

        if (this.fullScreen) {
            container.classList.add(this.HEALTH_CHECK_UI_CONTAINER_FULL_SCREEN_CLASS);
        }

        container.classList.add("container-fluid");

        const icon = document.createElement("i");
        icon.className = "fa fa-heartbeat";
        icon.style.paddingRight = "10px";
        icon.style.borderRight = "1px solid black";
        icon.style.color = "red";

        if (this.fullScreen) {
            icon.classList.add(this.HEALTH_CHECK_UI_INDICATOR__FULL_SCREEN_CLASS);
        }

        container.appendChild(icon);

        document.body.appendChild(container);
    }

    #getBreakElement() {
        const breakElement = document.createElement("span");
        breakElement.style.height = "0";
        breakElement.style.flexBasis = "100%";
        return breakElement;
    }

    #setUpInterval() {
        window.addEventListener("focus", () => this.BROWSERHASFOCUS = true);
        window.addEventListener("blur", () => this.BROWSERHASFOCUS = false);

        setInterval(this.#start.bind(this), 10000);
    }

    #start() {
        if (this.BROWSERHASFOCUS && this.#isTimeToRefresh()) {
            this.#startHealthCheck();
        }
    }

    #setLastRefreshTime() {
        sessionStorage.setItem(this.SESSION_STORAGE_LAST_REFRESH, Date.now());
    }

    #isTimeToRefresh() {
        if(!sessionStorage.getItem(this.SESSION_STORAGE_LAST_REFRESH)) {
            return true
        } else {
            return Date.now() - parseInt(sessionStorage.getItem(this.SESSION_STORAGE_LAST_REFRESH)) > this.HEALTH_CHECK_INTERVAL
        }
    }
}
