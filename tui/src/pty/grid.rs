use ratatui::layout::Rect;

/// Maximum number of agent panels that fit in the given terminal dimensions.
pub fn calculate_max(w: u16, h: u16) -> usize {
    let cols = (w.saturating_sub(2)) / 45;
    let rows = h.saturating_sub(6) / 10;
    (cols as usize * rows as usize).max(1).min(6)
}

/// Divide `area` into `count` equal rectangles (left-to-right, top-to-bottom).
pub fn calculate_rects(area: Rect, count: usize) -> Vec<Rect> {
    if count == 0 {
        return Vec::new();
    }

    // Determine column / row counts
    let cols: u16 = match count {
        1 => 1,
        2 => 2,
        3 | 4 => 2,
        _ => 3,
    };
    let rows: u16 = ((count as u16) + cols - 1) / cols;

    let cell_w = area.width / cols;
    let cell_h = area.height / rows;

    let mut rects = Vec::with_capacity(count);
    for i in 0..count {
        let col = (i as u16) % cols;
        let row = (i as u16) / cols;
        rects.push(Rect {
            x: area.x + col * cell_w,
            y: area.y + row * cell_h,
            width: cell_w,
            height: cell_h,
        });
    }
    rects
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_max_small_terminal() {
        // 80x24: (80-2)/45 = 1 col, (24-6)/10 = 1 row → max=1
        assert_eq!(calculate_max(80, 24), 1);
    }

    #[test]
    fn test_calculate_max_large_terminal() {
        // 200x50: (200-2)/45 = 4 cols, (50-6)/10 = 4 rows → 16, capped at 6
        assert_eq!(calculate_max(200, 50), 6);
    }

    #[test]
    fn test_calculate_rects_single() {
        let area = Rect::new(0, 0, 100, 40);
        let rects = calculate_rects(area, 1);
        assert_eq!(rects.len(), 1);
        assert_eq!(rects[0], area);
    }

    #[test]
    fn test_calculate_rects_two() {
        let area = Rect::new(0, 0, 100, 40);
        let rects = calculate_rects(area, 2);
        assert_eq!(rects.len(), 2);
        assert_eq!(rects[0].x, 0);
        assert_eq!(rects[1].x, 50);
    }
}
