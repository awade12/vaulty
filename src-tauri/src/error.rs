use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("S3 error: {0}")]
    S3(String),

    #[error("Connection not found: {id}")]
    ConnectionNotFound { id: String },

    #[error("No active connection")]
    NoActiveConnection,

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serde(#[from] serde_json::Error),

    #[error("Keyring error: {0}")]
    Keyring(String),

    #[error("Path error: {0}")]
    Path(String),

    #[error("Invalid key: {0}")]
    InvalidKey(String),

    #[error("Too many objects for this operation (max {max})")]
    TooManyObjects { max: u32 },

    #[error("Transfer queue unavailable")]
    TransferLimiterClosed,
}

impl AppError {
    pub fn into_string(self) -> String {
        self.to_string()
    }
}
