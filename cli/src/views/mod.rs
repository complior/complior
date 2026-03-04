pub mod chat;
pub mod code_viewer;
pub mod dashboard;
pub mod file_browser;
pub mod fix;
pub mod obligations;
pub mod onboarding;
pub mod passport;
pub mod report;
pub mod scan;
pub mod sidebar;
pub mod terminal;
pub mod timeline;

/// Word-wrap text into lines that fit within the given width.
/// Splits on whitespace boundaries. Returns at least one (possibly empty) line.
pub fn wrap_text_lines(text: &str, width: usize) -> Vec<String> {
    if width == 0 {
        return vec![text.to_string()];
    }
    let mut lines = Vec::new();
    let mut current = String::new();
    for word in text.split_whitespace() {
        if current.is_empty() {
            current = word.to_string();
        } else if current.len() + 1 + word.len() <= width {
            current.push(' ');
            current.push_str(word);
        } else {
            lines.push(current);
            current = word.to_string();
        }
    }
    if !current.is_empty() {
        lines.push(current);
    }
    if lines.is_empty() {
        lines.push(String::new());
    }
    lines
}
