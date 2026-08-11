use std::io::{Read, Write};
use std::net::TcpListener;
use std::thread;
use std::time::Duration;

#[test]
fn local_openai_compatible_http_round_trip() {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind local AI test server");
    let address = listener.local_addr().expect("read local AI test address");

    let server = thread::spawn(move || {
        let (mut stream, _) = listener.accept().expect("accept local AI request");
        stream
            .set_read_timeout(Some(Duration::from_secs(5)))
            .expect("set local AI read timeout");

        let mut request_bytes = [0_u8; 8192];
        let count = stream.read(&mut request_bytes).expect("read local AI request");
        let request = String::from_utf8_lossy(&request_bytes[..count]);
        assert!(request.starts_with("POST /v1/chat/completions "));
        assert!(request.to_ascii_lowercase().contains("content-type: application/json"));

        let body = r#"{"choices":[{"message":{"content":"local-ok"}}]}"#;
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            body.len(),
            body,
        );
        stream
            .write_all(response.as_bytes())
            .expect("write local AI response");
    });

    let url = format!("http://{address}/v1/chat/completions");
    let response_body = tauri::async_runtime::block_on(async {
        tauri_plugin_http::reqwest::Client::new()
            .post(url)
            .header("Content-Type", "application/json")
            .body(r#"{"model":"local-test","messages":[]}"#)
            .send()
            .await
            .expect("send local AI request")
            .error_for_status()
            .expect("local AI response status")
            .text()
            .await
            .expect("read local AI response")
    });

    assert_eq!(
        serde_json::from_str::<serde_json::Value>(&response_body).expect("parse local AI response")
            ["choices"][0]["message"]["content"],
        "local-ok",
    );
    server.join().expect("join local AI test server");
}
