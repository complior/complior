/// Manages text input state (cursor position, content).
pub struct InputBox {
    pub content: String,
    pub cursor: usize,
}

impl InputBox {
    pub const fn new() -> Self {
        Self {
            content: String::new(),
            cursor: 0,
        }
    }

    pub fn insert(&mut self, c: char) {
        self.content.insert(self.cursor, c);
        self.cursor += c.len_utf8();
    }

    pub fn delete_back(&mut self) {
        if self.cursor > 0 {
            let prev = self.content[..self.cursor]
                .char_indices()
                .next_back()
                .map(|(i, _)| i)
                .unwrap_or(0);
            self.content.drain(prev..self.cursor);
            self.cursor = prev;
        }
    }

    pub fn move_left(&mut self) {
        if self.cursor > 0 {
            self.cursor = self.content[..self.cursor]
                .char_indices()
                .next_back()
                .map(|(i, _)| i)
                .unwrap_or(0);
        }
    }

    pub fn move_right(&mut self) {
        if self.cursor < self.content.len() {
            self.cursor = self.content[self.cursor..]
                .char_indices()
                .nth(1)
                .map(|(i, _)| self.cursor + i)
                .unwrap_or(self.content.len());
        }
    }

    pub fn take(&mut self) -> String {
        self.cursor = 0;
        std::mem::take(&mut self.content)
    }

    pub fn clear(&mut self) {
        self.content.clear();
        self.cursor = 0;
    }
}

impl Default for InputBox {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_input_insert_and_delete() {
        let mut input = InputBox::new();
        input.insert('H');
        input.insert('i');
        assert_eq!(input.content, "Hi");
        assert_eq!(input.cursor, 2);

        input.delete_back();
        assert_eq!(input.content, "H");
        assert_eq!(input.cursor, 1);
    }

    #[test]
    fn test_input_cursor_movement() {
        let mut input = InputBox::new();
        input.insert('a');
        input.insert('b');
        input.insert('c');
        assert_eq!(input.cursor, 3);

        input.move_left();
        assert_eq!(input.cursor, 2);
        input.move_left();
        assert_eq!(input.cursor, 1);
        input.move_right();
        assert_eq!(input.cursor, 2);
    }

    #[test]
    fn test_input_take() {
        let mut input = InputBox::new();
        input.insert('t');
        input.insert('e');
        input.insert('s');
        input.insert('t');

        let val = input.take();
        assert_eq!(val, "test");
        assert!(input.content.is_empty());
        assert_eq!(input.cursor, 0);
    }
}
