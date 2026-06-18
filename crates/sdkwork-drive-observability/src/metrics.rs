use std::sync::atomic::{AtomicU64, Ordering};

static HTTP_REQUESTS_TOTAL: AtomicU64 = AtomicU64::new(0);
static HTTP_REQUEST_ERRORS_TOTAL: AtomicU64 = AtomicU64::new(0);
static DOMAIN_OUTBOX_PENDING_TOTAL: AtomicU64 = AtomicU64::new(0);
static DOMAIN_OUTBOX_DELIVERED_TOTAL: AtomicU64 = AtomicU64::new(0);
static CONTENT_SCAN_PENDING_TOTAL: AtomicU64 = AtomicU64::new(0);

pub fn record_http_request() {
    HTTP_REQUESTS_TOTAL.fetch_add(1, Ordering::Relaxed);
}

pub fn record_http_request_error() {
    HTTP_REQUEST_ERRORS_TOTAL.fetch_add(1, Ordering::Relaxed);
}

pub fn record_outbox_pending() {
    DOMAIN_OUTBOX_PENDING_TOTAL.fetch_add(1, Ordering::Relaxed);
}

pub fn record_outbox_delivered() {
    DOMAIN_OUTBOX_DELIVERED_TOTAL.fetch_add(1, Ordering::Relaxed);
}

pub fn record_content_scan_pending() {
    CONTENT_SCAN_PENDING_TOTAL.fetch_add(1, Ordering::Relaxed);
}

pub fn render_prometheus(service: &str) -> String {
    let environment = std::env::var("SDKWORK_DRIVE_RUNTIME_PROFILE")
        .unwrap_or_else(|_| "development".to_string());
    let deployment_mode =
        std::env::var("SDKWORK_DRIVE_DEPLOYMENT_MODE").unwrap_or_else(|_| "local".to_string());

    format!(
        "# HELP drive_http_requests_total Total HTTP requests handled by Drive routers.\n\
         # TYPE drive_http_requests_total counter\n\
         drive_http_requests_total{{service=\"{service}\",environment=\"{environment}\",deployment_mode=\"{deployment_mode}\"}} {}\n\
         # HELP drive_http_request_errors_total Total HTTP request errors handled by Drive routers.\n\
         # TYPE drive_http_request_errors_total counter\n\
         drive_http_request_errors_total{{service=\"{service}\",environment=\"{environment}\",deployment_mode=\"{deployment_mode}\"}} {}\n\
         # HELP drive_domain_outbox_pending_total Domain outbox events accepted for delivery.\n\
         # TYPE drive_domain_outbox_pending_total counter\n\
         drive_domain_outbox_pending_total{{service=\"{service}\",environment=\"{environment}\",deployment_mode=\"{deployment_mode}\"}} {}\n\
         # HELP drive_domain_outbox_delivered_total Domain outbox events delivered successfully.\n\
         # TYPE drive_domain_outbox_delivered_total counter\n\
         drive_domain_outbox_delivered_total{{service=\"{service}\",environment=\"{environment}\",deployment_mode=\"{deployment_mode}\"}} {}\n\
         # HELP drive_content_scan_pending_total Uploads evaluated by MIME upload content policy.\n\
         # TYPE drive_content_scan_pending_total counter\n\
         drive_content_scan_pending_total{{service=\"{service}\",environment=\"{environment}\",deployment_mode=\"{deployment_mode}\"}} {}\n",
        HTTP_REQUESTS_TOTAL.load(Ordering::Relaxed),
        HTTP_REQUEST_ERRORS_TOTAL.load(Ordering::Relaxed),
        DOMAIN_OUTBOX_PENDING_TOTAL.load(Ordering::Relaxed),
        DOMAIN_OUTBOX_DELIVERED_TOTAL.load(Ordering::Relaxed),
        CONTENT_SCAN_PENDING_TOTAL.load(Ordering::Relaxed),
    )
}
