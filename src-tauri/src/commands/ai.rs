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

    let prompt = r#"你是一个专业的发票识别助手。请仔细分析这张发票图片，提取以下信息并以JSON格式返回：

{
  "invoice_number": "发票号码",
  "invoice_code": "发票代码（如果有）",
  "invoice_date": "开票日期，格式YYYY-MM-DD",
  "amount": "不含税金额（数字）",
  "tax_amount": "税额（数字）",
  "total_amount": "价税合计（数字）",
  "seller_name": "销售方名称",
  "buyer_name": "购买方名称",
  "invoice_type": "发票类型（如：增值税普通发票、增值税专用发票等）",
  "remarks": "备注信息"
}

注意：
- 金额字段请只返回数字，不要包含货币符号
- 如果某个字段无法识别，请返回空字符串
- 日期格式必须是YYYY-MM-DD
- 只返回JSON，不要有其他文字"#;

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
