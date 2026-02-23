use std::collections::VecDeque;

const DEFAULT_CAPACITY: usize = 50_000;

/// A fixed-capacity ring buffer for PTY output bytes.
///
/// When the buffer overflows, the oldest bytes are dropped.
pub struct RingBuffer {
    buf: VecDeque<u8>,
    cap: usize,
}

impl RingBuffer {
    pub fn new() -> Self {
        Self {
            buf: VecDeque::with_capacity(DEFAULT_CAPACITY),
            cap: DEFAULT_CAPACITY,
        }
    }

    /// Append bytes, evicting oldest when capacity is exceeded.
    pub fn push(&mut self, data: &[u8]) {
        let total = self.buf.len() + data.len();
        if total > self.cap {
            if data.len() >= self.cap {
                // New data alone exceeds capacity — keep only its last `cap` bytes
                self.buf.clear();
                let start = data.len() - self.cap;
                self.buf.extend(&data[start..]);
            } else {
                // Drain enough from front to make room
                let to_drop = total - self.cap;
                self.buf.drain(..to_drop);
                self.buf.extend(data.iter().copied());
            }
        } else {
            self.buf.extend(data.iter().copied());
        }
    }

    /// Return the last `n` lines of UTF-8 text from the buffer.
    ///
    /// Non-UTF-8 bytes are replaced with `?`.
    pub fn visible_lines(&self, n: usize) -> Vec<String> {
        if self.buf.is_empty() {
            return Vec::new();
        }
        // Collect all bytes into a contiguous slice (two-slice VecDeque)
        let (a, b) = self.buf.as_slices();
        let mut text = String::with_capacity(self.buf.len());
        text.push_str(&String::from_utf8_lossy(a));
        text.push_str(&String::from_utf8_lossy(b));

        // Strip ANSI escape codes for display
        let clean = strip_ansi(&text);

        // Return last n lines
        let lines: Vec<String> = clean.lines().map(String::from).collect();
        if lines.len() <= n {
            lines
        } else {
            lines[lines.len() - n..].to_vec()
        }
    }

    pub fn is_empty(&self) -> bool {
        self.buf.is_empty()
    }
}

impl Default for RingBuffer {
    fn default() -> Self {
        Self::new()
    }
}

/// Very simple ANSI escape code stripper (handles CSI sequences).
fn strip_ansi(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\x1b' {
            // ESC — skip until end of escape sequence
            if chars.peek() == Some(&'[') {
                chars.next(); // consume '['
                // CSI sequence: skip until a letter
                for inner in chars.by_ref() {
                    if inner.is_ascii_alphabetic() {
                        break;
                    }
                }
            } else {
                // Other ESC: skip next char
                chars.next();
            }
        } else {
            result.push(c);
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ring_buffer_push_and_lines() {
        let mut rb = RingBuffer::new();
        rb.push(b"line1\nline2\nline3\n");
        let lines = rb.visible_lines(10);
        assert!(lines.iter().any(|l| l.contains("line1")));
        assert!(lines.iter().any(|l| l.contains("line3")));
    }

    #[test]
    fn test_ring_buffer_overflow_evicts() {
        let mut rb = RingBuffer { buf: VecDeque::new(), cap: 10 };
        rb.push(b"hello_world!"); // 12 bytes > cap 10
        assert!(rb.buf.len() <= 10);
    }

    #[test]
    fn test_strip_ansi() {
        let s = "\x1b[32mGreen text\x1b[0m";
        assert_eq!(strip_ansi(s), "Green text");
    }
}
