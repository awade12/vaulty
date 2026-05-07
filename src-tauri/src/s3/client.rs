use aws_config::BehaviorVersion;
use aws_credential_types::Credentials;
use aws_sdk_s3::config::Region;
use aws_sdk_s3::Client;

use crate::error::AppError;
use crate::storage::connections::ConnectionConfig;

pub fn normalize_r2_endpoint(raw: &str) -> String {
    let stripped = raw.trim().trim_end_matches('/');
    if stripped.starts_with("https://") || stripped.starts_with("http://") {
        stripped.to_owned()
    } else {
        format!("https://{stripped}")
    }
}

fn resolved_endpoint(provider: &str, endpoint: &str) -> String {
    match provider {
        "r2" => normalize_r2_endpoint(endpoint),
        "minio" => endpoint.trim().trim_end_matches('/').to_owned(),
        "s3" => {
            let e = endpoint.trim();
            if e.is_empty() {
                "https://s3.amazonaws.com".to_owned()
            } else if e.starts_with("http://") || e.starts_with("https://") {
                e.trim_end_matches('/').to_owned()
            } else {
                format!("https://{}", e.trim_end_matches('/'))
            }
        }
        _ => endpoint.trim().trim_end_matches('/').to_owned(),
    }
}

pub async fn build_client_raw(
    provider: &str,
    endpoint: &str,
    access_key_id: &str,
    secret_access_key: &str,
    region: Option<&str>,
) -> Result<Client, AppError> {
    let endpoint_url = resolved_endpoint(provider, endpoint);
    let region_str = region
        .map(|s| s.to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "auto".to_string());

    let creds = Credentials::new(
        access_key_id,
        secret_access_key,
        None,
        None,
        "vaulty",
    );

    let config = aws_sdk_s3::Config::builder()
        .behavior_version(BehaviorVersion::latest())
        .region(Region::new(region_str))
        .credentials_provider(creds)
        .endpoint_url(endpoint_url)
        .force_path_style(provider == "minio")
        .build();

    Ok(Client::from_conf(config))
}

pub async fn build_client(
    conn: &ConnectionConfig,
    secret: &str,
) -> Result<Client, AppError> {
    let region = conn.region.as_deref();
    build_client_raw(
        &conn.provider,
        &conn.endpoint,
        &conn.access_key_id,
        secret,
        region,
    )
    .await
}
