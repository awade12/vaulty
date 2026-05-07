use std::sync::Arc;

use aws_sdk_s3::Client;
use tokio::sync::RwLock;

use crate::error::AppError;

#[derive(Default)]
pub struct AppState {
    inner: Arc<RwLock<Option<ActiveSession>>>,
}

struct ActiveSession {
    client: Client,
    bucket: String,
    connection_id: String,
}

impl AppState {
    pub async fn set_session(&self, client: Client, bucket: String, connection_id: String) {
        let mut lock = self.inner.write().await;
        *lock = Some(ActiveSession {
            client,
            bucket,
            connection_id,
        });
    }

    pub async fn clear_session(&self) {
        let mut lock = self.inner.write().await;
        *lock = None;
    }

    pub async fn client(&self) -> Result<Client, AppError> {
        let lock = self.inner.read().await;
        lock.as_ref()
            .map(|s| s.client.clone())
            .ok_or(AppError::NoActiveConnection)
    }

    pub async fn active_bucket(&self) -> String {
        let lock = self.inner.read().await;
        lock.as_ref()
            .map(|s| s.bucket.clone())
            .unwrap_or_default()
    }

    pub async fn active_connection_id(&self) -> Option<String> {
        let lock = self.inner.read().await;
        lock.as_ref()
            .map(|s| s.connection_id.clone())
    }
}
