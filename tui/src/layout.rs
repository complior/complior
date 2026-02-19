use ratatui::layout::{Constraint, Direction, Layout, Rect};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Breakpoint {
    Tiny,   // <60 cols
    Small,  // 60-99 cols
    Medium, // 100-159 cols
    Large,  // >=160 cols
}

impl Breakpoint {
    pub const fn from_width(width: u16) -> Self {
        match width {
            0..60 => Self::Tiny,
            60..100 => Self::Small,
            100..160 => Self::Medium,
            _ => Self::Large,
        }
    }

    pub const fn sidebar_width(self) -> u16 {
        match self {
            Self::Tiny | Self::Small => 0,
            Self::Medium | Self::Large => 20,
        }
    }

    pub const fn show_sidebar(self) -> bool {
        matches!(self, Self::Medium | Self::Large)
    }

    pub const fn show_detail(self) -> bool {
        matches!(self, Self::Large)
    }
}

pub struct ResponsiveLayout {
    #[allow(dead_code)]
    pub breakpoint: Breakpoint,
    pub main_area: Rect,
    pub sidebar_area: Option<Rect>,
    pub detail_area: Option<Rect>,
}

pub fn compute_layout(area: Rect, sidebar_forced: Option<bool>) -> ResponsiveLayout {
    let bp = Breakpoint::from_width(area.width);
    let show_sb = sidebar_forced.unwrap_or_else(|| bp.show_sidebar());
    let show_detail = bp.show_detail();

    if !show_sb {
        return ResponsiveLayout {
            breakpoint: bp,
            main_area: area,
            sidebar_area: None,
            detail_area: None,
        };
    }

    let sb_w = bp.sidebar_width();
    let detail_w: u16 = if show_detail { 30 } else { 0 };

    let mut constraints = vec![Constraint::Min(30)];
    if sb_w > 0 {
        constraints.push(Constraint::Length(sb_w));
    }
    if detail_w > 0 {
        constraints.push(Constraint::Length(detail_w));
    }

    let chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints(constraints)
        .split(area);

    let sidebar_area = if sb_w > 0 { Some(chunks[1]) } else { None };
    let detail_area = if detail_w > 0 && chunks.len() > 2 {
        Some(chunks[2])
    } else {
        None
    };

    ResponsiveLayout {
        breakpoint: bp,
        main_area: chunks[0],
        sidebar_area,
        detail_area,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn breakpoint_from_width() {
        assert_eq!(Breakpoint::from_width(40), Breakpoint::Tiny);
        assert_eq!(Breakpoint::from_width(59), Breakpoint::Tiny);
        assert_eq!(Breakpoint::from_width(60), Breakpoint::Small);
        assert_eq!(Breakpoint::from_width(80), Breakpoint::Small);
        assert_eq!(Breakpoint::from_width(99), Breakpoint::Small);
        assert_eq!(Breakpoint::from_width(100), Breakpoint::Medium);
        assert_eq!(Breakpoint::from_width(120), Breakpoint::Medium);
        assert_eq!(Breakpoint::from_width(159), Breakpoint::Medium);
        assert_eq!(Breakpoint::from_width(160), Breakpoint::Large);
        assert_eq!(Breakpoint::from_width(200), Breakpoint::Large);
    }

    #[test]
    fn compute_layout_tiny() {
        let area = Rect::new(0, 0, 50, 30);
        let layout = compute_layout(area, None);
        assert_eq!(layout.breakpoint, Breakpoint::Tiny);
        assert_eq!(layout.main_area, area);
        assert!(layout.sidebar_area.is_none());
        assert!(layout.detail_area.is_none());
    }

    #[test]
    fn compute_layout_large() {
        let area = Rect::new(0, 0, 180, 40);
        let layout = compute_layout(area, None);
        assert_eq!(layout.breakpoint, Breakpoint::Large);
        assert!(layout.sidebar_area.is_some());
        assert!(layout.detail_area.is_some());
        let sb = layout.sidebar_area.unwrap();
        assert_eq!(sb.width, 20);
        let detail = layout.detail_area.unwrap();
        assert_eq!(detail.width, 30);
    }

    #[test]
    fn compute_layout_medium_no_detail() {
        let area = Rect::new(0, 0, 120, 40);
        let layout = compute_layout(area, None);
        assert_eq!(layout.breakpoint, Breakpoint::Medium);
        assert!(layout.sidebar_area.is_some());
        assert!(layout.detail_area.is_none());
    }

    #[test]
    fn compute_layout_sidebar_forced() {
        let area = Rect::new(0, 0, 50, 30);
        // Force sidebar on a tiny terminal
        let layout = compute_layout(area, Some(true));
        assert_eq!(layout.breakpoint, Breakpoint::Tiny);
        // Tiny has sidebar_width=0, so even forced it won't have a sidebar area
        assert!(layout.sidebar_area.is_none());
    }
}
