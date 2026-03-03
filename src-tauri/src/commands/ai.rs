use futures_util::StreamExt;
use serde::Serialize;
use tauri::ipc::Channel;

#[derive(Clone, Serialize)]
pub struct StreamChunk {
    pub content: String,
    pub done: bool,
}

#[tauri::command]
pub async fn chat_stream(
    messages: Vec<serde_json::Value>,
    api_key: String,
    api_base: String,
    model: String,
    on_chunk: Channel<StreamChunk>,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/v1/chat/completions", api_base.trim_end_matches('/'));

    let body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": true,
        "max_tokens": 4096,
    });

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, text));
    }

    let mut stream = response.bytes_stream();
    let mut full_content = String::new();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
        let text = String::from_utf8_lossy(&chunk).to_string();

        for line in text.lines() {
            if let Some(data) = line.strip_prefix("data: ") {
                if data.trim() == "[DONE]" {
                    let _ = on_chunk.send(StreamChunk {
                        content: String::new(),
                        done: true,
                    });
                    return Ok(full_content);
                }

                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                    if let Some(delta) = parsed["choices"][0]["delta"]["content"].as_str() {
                        full_content.push_str(delta);
                        let _ = on_chunk.send(StreamChunk {
                            content: delta.to_string(),
                            done: false,
                        });
                    }
                }
            }
        }
    }

    let _ = on_chunk.send(StreamChunk {
        content: String::new(),
        done: true,
    });
    Ok(full_content)
}

#[tauri::command]
pub async fn recognize_invoice(
    image_base64: String,
    api_key: String,
    api_base: String,
    model: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/v1/chat/completions", api_base.trim_end_matches('/'));

    let prompt = r#"You are a professional invoice recognition assistant. Analyze this invoice image carefully and return the extracted data as JSON:

{
  "invoice_number": "Invoice number",
  "invoice_code": "Invoice code (if available)",
  "invoice_date": "Issue date in YYYY-MM-DD format",
  "amount": "Amount before tax (numeric)",
  "tax_amount": "Tax amount (numeric)",
  "total_amount": "Total amount including tax (numeric)",
  "seller_name": "Seller name",
  "buyer_name": "Buyer name",
  "invoice_type": "Invoice type (for example: VAT ordinary invoice, VAT special invoice)",
  "remarks": "Additional notes"
}

Requirements:
- Return numbers only for amount fields, without currency symbols.
- If a field cannot be recognized, return an empty string.
- Date format must be YYYY-MM-DD.
- Return JSON only, without extra commentary."#;

    let body = serde_json::json!({
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": format!("data:image/jpeg;base64,{}", image_base64)
                        }
                    }
                ]
            }
        ],
        "max_tokens": 2048,
    });

    let response = client
        .post(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, text));
    }

    let result: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    let content = result["choices"][0]["message"]["content"]
        .as_str()
        .unwrap_or("{}")
        .to_string();

    Ok(content)
}
