const AI_API_KEY_SECRET: &str = "ai.apiKey";
const CREDENTIAL_SERVICE: &str = "PromptNote";

pub fn initialize() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        let store = windows_native_keyring_store::Store::new().map_err(error_message)?;
        keyring_core::set_default_store(store);
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("PromptNote Desktop SecretStore 仅支持 Windows。".to_string())
    }
}

pub fn get(name: &str) -> Result<Option<String>, String> {
    validate_name(name)?;
    get_entry(name)
}

pub fn set(name: &str, value: &str) -> Result<(), String> {
    validate_name(name)?;
    if value.is_empty() {
        return Err("空 API Key 应通过 remove 删除，而不是写入 Credential Manager。".to_string());
    }
    set_entry(name, value)
}

pub fn remove(name: &str) -> Result<(), String> {
    validate_name(name)?;
    remove_entry(name)
}

fn validate_name(name: &str) -> Result<(), String> {
    if name == AI_API_KEY_SECRET {
        Ok(())
    } else {
        Err(format!("不支持的 Desktop secret：{name}"))
    }
}

#[cfg(target_os = "windows")]
fn entry(user: &str) -> Result<keyring_core::Entry, String> {
    keyring_core::Entry::new(CREDENTIAL_SERVICE, user).map_err(error_message)
}

#[cfg(target_os = "windows")]
fn get_entry(user: &str) -> Result<Option<String>, String> {
    match entry(user)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring_core::Error::NoEntry) => Ok(None),
        Err(error) => Err(error_message(error)),
    }
}

#[cfg(not(target_os = "windows"))]
fn get_entry(_user: &str) -> Result<Option<String>, String> {
    Err("Windows Credential Manager 当前不可用。".to_string())
}

#[cfg(target_os = "windows")]
fn set_entry(user: &str, value: &str) -> Result<(), String> {
    entry(user)?.set_password(value).map_err(error_message)
}

#[cfg(not(target_os = "windows"))]
fn set_entry(_user: &str, _value: &str) -> Result<(), String> {
    Err("Windows Credential Manager 当前不可用。".to_string())
}

#[cfg(target_os = "windows")]
fn remove_entry(user: &str) -> Result<(), String> {
    match entry(user)?.delete_credential() {
        Ok(()) | Err(keyring_core::Error::NoEntry) => Ok(()),
        Err(error) => Err(error_message(error)),
    }
}

#[cfg(not(target_os = "windows"))]
fn remove_entry(_user: &str) -> Result<(), String> {
    Err("Windows Credential Manager 当前不可用。".to_string())
}

fn error_message(error: impl std::fmt::Display) -> String {
    error.to_string()
}

#[cfg(all(test, target_os = "windows"))]
mod tests {
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::*;

    #[test]
    fn windows_credential_manager_round_trip() {
        initialize().unwrap();
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let test_user = format!("promptnote.test.{}.{}", std::process::id(), nonce);
        let value = "promptnote-ci-secret";

        remove_entry(&test_user).unwrap();
        set_entry(&test_user, value).unwrap();
        assert_eq!(get_entry(&test_user).unwrap().as_deref(), Some(value));
        remove_entry(&test_user).unwrap();
        assert_eq!(get_entry(&test_user).unwrap(), None);
    }
}
