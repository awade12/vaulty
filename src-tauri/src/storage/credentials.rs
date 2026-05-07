use keyring::Entry;

use crate::error::AppError;

const SERVICE: &str = "s3-drive";

pub fn store_secret(connection_id: &str, secret: &str) -> Result<(), AppError> {
    Entry::new(SERVICE, connection_id)
        .map_err(|e| AppError::Keyring(e.to_string()))?
        .set_password(secret)
        .map_err(|e| AppError::Keyring(e.to_string()))
}

pub fn get_secret(connection_id: &str) -> Result<String, AppError> {
    Entry::new(SERVICE, connection_id)
        .map_err(|e| AppError::Keyring(e.to_string()))?
        .get_password()
        .map_err(|e| AppError::Keyring(e.to_string()))
}

pub fn delete_secret(connection_id: &str) -> Result<(), AppError> {
    Entry::new(SERVICE, connection_id)
        .map_err(|e| AppError::Keyring(e.to_string()))?
        .delete_password()
        .map_err(|e| AppError::Keyring(e.to_string()))
}
