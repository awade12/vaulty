use std::sync::Arc;

use aws_sdk_s3::Client;
use tokio::sync::{OwnedSemaphorePermit, RwLock, Semaphore};

use crate::error::AppError;

pub const DEFAULT_TRANSFER_CONCURRENCY: usize = 3;

pub struct AppState {
    inner: Arc<RwLock<Option<ActiveSession>>>,
    transfer_limiter: Arc<Semaphore>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            inner: Arc::new(RwLock::new(None)),
            transfer_limiter: Arc::new(Semaphore::new(DEFAULT_TRANSFER_CONCURRENCY)),
        }
    }
}

struct ActiveSession {
    client: Client,
    bucket: String,
    connection_id: String,
}

impl AppState {
    pub async fn acquire_transfer_permit(&self) -> Result<OwnedSemaphorePermit, AppError> {
        self.transfer_limiter
            .clone()
            .acquire_owned()
            .await
            .map_err(|_| AppError::TransferLimiterClosed)
    }

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
        lock.as_ref().map(|s| s.bucket.clone()).unwrap_or_default()
    }

    pub async fn active_connection_id(&self) -> Option<String> {
        let lock = self.inner.read().await;
        lock.as_ref().map(|s| s.connection_id.clone())
    }
}
