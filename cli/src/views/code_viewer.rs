/// Find all line indices matching a search query.
pub fn find_search_matches(content: &str, query: &str) -> Vec<usize> {
    if query.is_empty() {
        return Vec::new();
    }
    let lower_query = query.to_lowercase();
    content
        .lines()
        .enumerate()
        .filter(|(_, line)| line.to_lowercase().contains(&lower_query))
        .map(|(i, _)| i)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_find_search_matches() {
        let content = "hello world\nfoo bar\nhello again";
        let matches = find_search_matches(content, "hello");
        assert_eq!(matches, vec![0, 2]);
    }

    #[test]
    fn test_find_search_matches_empty() {
        let matches = find_search_matches("hello", "");
        assert!(matches.is_empty());
    }

    #[test]
    fn test_find_search_case_insensitive() {
        let content = "Hello World\nhello world";
        let matches = find_search_matches(content, "HELLO");
        assert_eq!(matches.len(), 2);
    }
}
