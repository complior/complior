const FRAMES: &[&str] = &[".", "..", "...", ".."];

pub struct Spinner {
    tick: usize,
}

impl Spinner {
    pub const fn new() -> Self {
        Self { tick: 0 }
    }

    pub fn advance(&mut self) {
        self.tick = (self.tick + 1) % FRAMES.len();
    }

    pub fn frame(&self) -> &'static str {
        FRAMES[self.tick % FRAMES.len()]
    }
}

impl Default for Spinner {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spinner_cycles() {
        let mut spinner = Spinner::new();
        assert_eq!(spinner.frame(), ".");
        spinner.advance();
        assert_eq!(spinner.frame(), "..");
        spinner.advance();
        assert_eq!(spinner.frame(), "...");
        spinner.advance();
        assert_eq!(spinner.frame(), "..");
        spinner.advance();
        assert_eq!(spinner.frame(), ".");
    }
}
