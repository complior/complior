use crate::types::{ChatMessage, MessageRole, Overlay, ViewState};
use crate::views::fix::FixViewState;

use super::{App, AppCommand};

impl App {
    /// Handle view-specific single-char key presses (Normal mode).
    pub fn handle_view_key(&mut self, c: char) -> Option<AppCommand> {
        match self.view_state {
            ViewState::Scan => {
                if let Some(filter) =
                    crate::views::scan::FindingsFilter::from_key(c)
                {
                    self.scan_view.findings_filter = filter;
                    self.scan_view.selected_finding = Some(0);
                } else if c == 'f' && self.scan_view.detail_open {
                    // Go to Fix View with current finding
                    self.scan_view.detail_open = false;
                    self.view_state = ViewState::Fix;
                    if let Some(scan) = &self.last_scan {
                        self.fix_view = FixViewState::from_scan(&scan.findings);
                    }
                } else if c == 'x' {
                    // Quick action: Explain selected finding
                    if let Some(idx) = self.scan_view.selected_finding {
                        if let Some(scan) = &self.last_scan {
                            if let Some(finding) = scan.findings.get(idx) {
                                let msg =
                                    format!("Explain this finding: {}", finding.message);
                                self.messages.push(ChatMessage::new(
                                    MessageRole::User,
                                    msg.clone(),
                                ));
                                self.toasts.push(
                                    crate::components::toast::ToastKind::Info,
                                    "Explaining finding...",
                                );
                            }
                        }
                    }
                } else if c == 'o' {
                    // Quick action: Open related file
                    if let Some(idx) = self.scan_view.selected_finding {
                        if let Some(scan) = &self.last_scan {
                            if let Some(finding) = scan.findings.get(idx) {
                                self.toasts.push(
                                    crate::components::toast::ToastKind::Info,
                                    format!("Finding: {}", finding.check_id),
                                );
                            }
                        }
                    }
                } else if c == 'd' {
                    // Quick action: Dismiss finding (open dismiss modal)
                    if let Some(idx) = self.scan_view.selected_finding {
                        self.dismiss_modal = Some(
                            crate::components::quick_actions::DismissModal::new(idx),
                        );
                        self.overlay = Overlay::DismissModal;
                    }
                }
            }
            ViewState::Fix => match c {
                ' ' => self.fix_view.toggle_current(),
                'a' => self.fix_view.select_all(),
                'n' => self.fix_view.deselect_all(),
                'd' => self.fix_view.diff_visible = !self.fix_view.diff_visible,
                '<' => {
                    self.fix_split_pct =
                        self.fix_split_pct.saturating_sub(5).max(25);
                }
                '>' => {
                    self.fix_split_pct = (self.fix_split_pct + 5).min(75);
                }
                _ => {}
            },
            ViewState::Dashboard => match c {
                'e' => {
                    // Toggle widget zoom
                    self.zoom.toggle();
                }
                _ => {}
            },
            ViewState::Report => {
                if c == 'e' && self.last_scan.is_some() {
                    return Some(AppCommand::ExportReport);
                }
            }
            _ => {}
        }
        None
    }

    /// Handle Enter key in view context.
    pub(crate) fn handle_view_enter(&mut self) -> Option<AppCommand> {
        match self.view_state {
            ViewState::Scan => {
                if self.scan_view.detail_open {
                    // Close detail
                    self.scan_view.detail_open = false;
                } else if self.last_scan.is_some() {
                    // Open finding detail
                    self.scan_view.detail_open = true;
                }
            }
            ViewState::Fix => {
                if self.fix_view.results.is_some() {
                    // Dismiss results
                    self.fix_view.results = None;
                } else if self.fix_view.selected_count() > 0 {
                    // Apply selected fixes + auto-validate (T904)
                    let selected = self.fix_view.selected_count() as u32;
                    let old_score = self
                        .last_scan
                        .as_ref()
                        .map(|s| s.score.total_score)
                        .unwrap_or(0.0);
                    let impact = self.fix_view.total_predicted_impact() as f64;

                    // Mark items as applied
                    for item in &mut self.fix_view.fixable_findings {
                        if item.selected {
                            item.status = crate::views::fix::FixItemStatus::Applied;
                        }
                    }

                    self.fix_view.results =
                        Some(crate::views::fix::FixResults {
                            applied: selected,
                            failed: 0,
                            old_score,
                            new_score: (old_score + impact).min(100.0),
                        });

                    // Store pre-fix score for T904 auto-validate delta
                    self.pre_fix_score = Some(old_score);

                    self.toasts.push(
                        crate::components::toast::ToastKind::Success,
                        format!("Applied {selected} fixes. Re-scanning..."),
                    );

                    // T904: Auto-trigger re-scan to validate fixes
                    return Some(AppCommand::AutoScan);
                }
            }
            _ => {}
        }
        None
    }

    /// Handle Esc key in view context.
    pub(crate) fn handle_view_escape(&mut self) {
        match self.view_state {
            ViewState::Dashboard => {
                if self.zoom.is_zoomed() {
                    self.zoom.close();
                }
            }
            ViewState::Scan => {
                if self.scan_view.detail_open {
                    self.scan_view.detail_open = false;
                }
            }
            ViewState::Fix => {
                if self.fix_view.results.is_some() {
                    self.fix_view.results = None;
                }
            }
            _ => {}
        }
    }
}
