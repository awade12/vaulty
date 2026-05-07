use aws_smithy_runtime_api::client::orchestrator::HttpResponse;
use aws_smithy_runtime_api::client::result::SdkError;
use aws_smithy_types::error::metadata::ProvideErrorMetadata;

use crate::error::AppError;

pub fn map_s3_sdk_error<E>(err: SdkError<E, HttpResponse>) -> AppError
where
    E: std::error::Error + ProvideErrorMetadata + Send + Sync + 'static,
{
    let summary = user_visible_summary(&err);
    tracing::error!(
        target: "vaulty::s3",
        summary = %summary,
        aws_code = err.code(),
        aws_message = err.message(),
        http_status = err.raw_response().map(|r| r.status().as_u16()),
        ?err,
        "S3 request failed"
    );
    AppError::S3(summary)
}

fn user_visible_summary<E>(err: &SdkError<E, HttpResponse>) -> String
where
    E: std::error::Error + ProvideErrorMetadata + Send + Sync + 'static,
{
    let code = err.code();
    let message = err.message();
    let http = err
        .raw_response()
        .map(|r| r.status().as_u16())
        .filter(|&s| s != 0);

    if let (Some(c), Some(m)) = (code, message) {
        if m.is_empty() {
            return c.to_string();
        }
        return format!("{c}: {m}");
    }
    if let Some(c) = code {
        return c.to_string();
    }
    if let Some(m) = message {
        if !m.is_empty() {
            return m.to_string();
        }
    }
    if let Some(svc) = err.as_service_error() {
        let inner = svc.to_string();
        if inner != "unhandled error" && !inner.is_empty() {
            return inner;
        }
    }
    if let Some(h) = http {
        return format!("HTTP {h}");
    }
    err.to_string()
}
