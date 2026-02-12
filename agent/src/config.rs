#[derive(Debug, Clone)]
pub struct AgentConfig {
    pub endpoint: String,
    pub api_key: String,
    pub service: String,
    pub host: String,
    pub batch_size: usize,
    pub flush_interval_ms: u64,
}
