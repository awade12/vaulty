use keyring::{Entry, Error as KeyringError};

use crate::error::AppError;

const SERVICE: &str = "com.vaulty.credentials";
const LEGACY_SERVICE: &str = "s3-drive";

fn profile_account(profile_id: &str) -> String {
    format!("credential-profile:{profile_id}:secret-access-key")
}

fn legacy_connection_account(connection_id: &str) -> String {
    format!("connection:{connection_id}:secret-access-key")
}

fn entry(service: &str, account: &str) -> Result<Entry, AppError> {
    Entry::new(service, account).map_err(keyring_error)
}

fn keyring_error(error: KeyringError) -> AppError {
    AppError::Keyring(error.to_string())
}

pub fn store_profile_secret(profile_id: &str, secret: &str) -> Result<(), AppError> {
    entry(SERVICE, &profile_account(profile_id))?
        .set_password(secret)
        .map_err(keyring_error)
}

pub fn get_profile_secret(profile_id: &str) -> Result<String, AppError> {
    entry(SERVICE, &profile_account(profile_id))?
        .get_password()
        .map_err(keyring_error)
}

pub fn delete_profile_secret(profile_id: &str) -> Result<(), AppError> {
    delete_entry(SERVICE, &profile_account(profile_id))
}

pub fn profile_secret_exists(profile_id: &str) -> Result<bool, AppError> {
    match entry(SERVICE, &profile_account(profile_id))?.get_password() {
        Ok(_) => Ok(true),
        Err(KeyringError::NoEntry) => Ok(false),
        Err(error) => Err(keyring_error(error)),
    }
}

pub fn migrate_connection_secret(
    connection_id: &str,
    profile_id: &str,
) -> Result<Option<String>, AppError> {
    let current_account = legacy_connection_account(connection_id);
    match entry(SERVICE, &current_account)?.get_password() {
        Ok(secret) => {
            store_profile_secret(profile_id, &secret)?;
            delete_entry(SERVICE, &current_account)?;
            Ok(Some(secret))
        }
        Err(KeyringError::NoEntry) => match entry(LEGACY_SERVICE, connection_id)?.get_password() {
            Ok(secret) => {
                store_profile_secret(profile_id, &secret)?;
                let _ = delete_entry(LEGACY_SERVICE, connection_id);
                Ok(Some(secret))
            }
            Err(KeyringError::NoEntry) => Ok(None),
            Err(error) => Err(keyring_error(error)),
        },
        Err(error) => Err(keyring_error(error)),
    }
}

pub fn delete_legacy_connection_secret(connection_id: &str) -> Result<(), AppError> {
    delete_entry(SERVICE, &legacy_connection_account(connection_id))?;
    delete_entry(LEGACY_SERVICE, connection_id)
}

fn delete_entry(service: &str, account: &str) -> Result<(), AppError> {
    match entry(service, account)?.delete_password() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(error) => Err(keyring_error(error)),
    }
}
