use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferProgressPayload {
    pub op: String,
    pub key: String,
    pub phase: String,
    pub transferred: u64,
    pub total: Option<u64>,
    pub message: Option<String>,
}

pub struct TransferEmitter {
    app: AppHandle,
    last_emit: Instant,
    last_transferred: u64,
}

impl TransferEmitter {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            last_emit: Instant::now(),
            last_transferred: 0,
        }
    }

    fn emit(&self, payload: TransferProgressPayload) {
        let _ = self.app.emit("transfer-progress", payload);
    }

    pub fn start(&self, op: &str, key: &str, total: Option<u64>) {
        self.emit(TransferProgressPayload {
            op: op.to_string(),
            key: key.to_string(),
            phase: "start".to_string(),
            transferred: 0,
            total,
            message: None,
        });
    }

    pub fn progress(&mut self, op: &str, key: &str, transferred: u64, total: Option<u64>) {
        let dt = self.last_emit.elapsed();
        let delta = transferred.saturating_sub(self.last_transferred);
        if dt >= Duration::from_millis(180) || delta >= 256 * 1024 {
            self.emit(TransferProgressPayload {
                op: op.to_string(),
                key: key.to_string(),
                phase: "progress".to_string(),
                transferred,
                total,
                message: None,
            });
            self.last_emit = Instant::now();
            self.last_transferred = transferred;
        }
    }

    pub fn end(&self, op: &str, key: &str, transferred: u64, total: Option<u64>) {
        self.emit(TransferProgressPayload {
            op: op.to_string(),
            key: key.to_string(),
            phase: "end".to_string(),
            transferred,
            total,
            message: None,
        });
    }

    pub fn error(&self, op: &str, key: &str, message: String) {
        self.emit(TransferProgressPayload {
            op: op.to_string(),
            key: key.to_string(),
            phase: "error".to_string(),
            transferred: 0,
            total: None,
            message: Some(message),
        });
    }
}
