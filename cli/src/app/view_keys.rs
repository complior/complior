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
                    self.scan_view.preview_scroll = 0;
                } else if c == 'f' {
                    // Apply fix: go to Fix view with finding pre-selected
                    if let Some(idx) = self.scan_view.selected_finding {
                        if let Some(scan) = &self.last_scan {
                            if let Some(finding) = crate::views::scan::resolve_selected_finding(
                                &scan.findings,
                                self.scan_view.findings_filter,
                                idx,
                                &self.passport_view.loaded_passports,
                            ) {
                                if finding.fix.is_some() {
                                    let target_check_id = finding.check_id.clone();
                                    // Navigate to fix view in single-fix mode
                                    self.scan_view.detail_open = false;
                                    self.view_state = ViewState::Fix;
                                    self.fix_view = FixViewState::from_scan(&scan.findings);
                                    self.fix_view.focus_check_id = Some(target_check_id.clone());

                                    // Pre-select this finding in fix list
                                    if let Some(fix_idx) = self.fix_view.fixable_findings.iter()
                                        .position(|f| f.check_id == target_check_id)
                                    {
                                        self.fix_view.selected_index = fix_idx;
                                        self.fix_view.fixable_findings[fix_idx].selected = true;
                                    }
                                } else {
                                    self.toasts.push(
                                        crate::components::toast::ToastKind::Info,
                                        "No auto-fix available for this finding",
                                    );
                                }
                            }
                        }
                    }
                } else if c == 'n' && self.scan_view.detail_open {
                    // Next finding (within detail view)
                    let count = self.filtered_findings_count();
                    self.scan_view.navigate_down(count);
                    self.scan_view.preview_scroll = 0;
                } else if c == 'N' && self.scan_view.detail_open {
                    // Previous finding (within detail view)
                    self.scan_view.navigate_up();
                    self.scan_view.preview_scroll = 0;
                } else if c == 'x' {
                    // Quick action: Explain selected finding (static explanation)
                    if let Some(idx) = self.scan_view.selected_finding {
                        if let Some(scan) = &self.last_scan {
                            if let Some(finding) = crate::views::scan::resolve_selected_finding(
                                &scan.findings,
                                self.scan_view.findings_filter,
                                idx,
                                &self.passport_view.loaded_passports,
                            ) {
                                let explanation = crate::views::scan::explain_finding(finding);
                                self.messages.push(ChatMessage::new(
                                    MessageRole::System,
                                    explanation,
                                ));
                                self.toasts.push(
                                    crate::components::toast::ToastKind::Info,
                                    "Explanation added to Status Log (L)",
                                );
                            }
                        }
                    }
                } else if c == 'o' {
                    // Quick action: Open related file in code viewer
                    if let Some(idx) = self.scan_view.selected_finding {
                        if let Some(scan) = &self.last_scan {
                            if let Some(finding) = crate::views::scan::resolve_selected_finding(
                                &scan.findings,
                                self.scan_view.findings_filter,
                                idx,
                                &self.passport_view.loaded_passports,
                            ) {
                                if let Some(ref file_path) = finding.file {
                                    return Some(AppCommand::OpenFile(file_path.clone()));
                                } else {
                                    self.toasts.push(
                                        crate::components::toast::ToastKind::Info,
                                        "No file associated with this finding",
                                    );
                                }
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
                } else if c == 'p' {
                    // Toggle show/hide passed checks
                    self.scan_view.show_passed = !self.scan_view.show_passed;
                } else if c == '<' {
                    // Resize scan split — shrink left panel
                    self.scan_view.scan_split_pct =
                        self.scan_view.scan_split_pct.saturating_sub(5).max(25);
                } else if c == '>' {
                    // Resize scan split — grow left panel
                    self.scan_view.scan_split_pct =
                        (self.scan_view.scan_split_pct + 5).min(75);
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
            ViewState::Report => match c {
                'e' if self.last_scan.is_some() => {
                    return Some(AppCommand::ExportReport);
                }
                c @ ('1'..='9') => {
                    let idx = (c as u8 - b'1') as usize;
                    if idx < crate::views::report::GENERATORS.len() {
                        self.report_view.selected_generator = idx;
                    }
                }
                _ => {}
            }
            ViewState::Obligations => {
                use crate::views::obligations::ObligationFilter;
                match c {
                    'f' => {
                        self.obligations_view.filter = self.obligations_view.filter.cycle();
                        self.obligations_view.selected_index = 0;
                        self.obligations_view.scroll_offset = 0;
                    }
                    'a' => {
                        self.obligations_view.filter = ObligationFilter::All;
                        self.obligations_view.selected_index = 0;
                        self.obligations_view.scroll_offset = 0;
                    }
                    'p' => {
                        self.obligations_view.filter = ObligationFilter::RoleProvider;
                        self.obligations_view.selected_index = 0;
                        self.obligations_view.scroll_offset = 0;
                    }
                    'd' => {
                        self.obligations_view.filter = ObligationFilter::RoleDeployer;
                        self.obligations_view.selected_index = 0;
                        self.obligations_view.scroll_offset = 0;
                    }
                    'h' => {
                        self.obligations_view.filter = ObligationFilter::RiskHigh;
                        self.obligations_view.selected_index = 0;
                        self.obligations_view.scroll_offset = 0;
                    }
                    'm' => {
                        self.obligations_view.filter = ObligationFilter::RiskLimited;
                        self.obligations_view.selected_index = 0;
                        self.obligations_view.scroll_offset = 0;
                    }
                    'c' => {
                        self.obligations_view.filter = ObligationFilter::CoveredOnly;
                        self.obligations_view.selected_index = 0;
                        self.obligations_view.scroll_offset = 0;
                    }
                    'x' => {
                        self.obligations_view.filter = ObligationFilter::UncoveredOnly;
                        self.obligations_view.selected_index = 0;
                        self.obligations_view.scroll_offset = 0;
                    }
                    'l' => return Some(AppCommand::LoadObligations),
                    _ => {}
                }
            }
            ViewState::Passport => match c {
                'o' => {
                    use crate::views::passport::PassportDetailMode;
                    self.passport_view.detail_mode = match self.passport_view.detail_mode {
                        PassportDetailMode::FieldDetail => PassportDetailMode::ObligationChecklist,
                        PassportDetailMode::ObligationChecklist => PassportDetailMode::FieldDetail,
                        // From Registry or AuditTrail, toggle back to FieldDetail
                        PassportDetailMode::Registry | PassportDetailMode::AuditTrail => {
                            PassportDetailMode::ObligationChecklist
                        }
                    };
                    if self.passport_view.detail_mode == PassportDetailMode::ObligationChecklist {
                        return Some(AppCommand::LoadPassportCompleteness);
                    }
                }
                'g' => {
                    use crate::views::passport::PassportDetailMode;
                    self.passport_view.detail_mode = PassportDetailMode::Registry;
                    return Some(AppCommand::LoadRegistry);
                }
                'a' => {
                    use crate::views::passport::PassportDetailMode;
                    self.passport_view.detail_mode = PassportDetailMode::AuditTrail;
                    return Some(AppCommand::LoadAuditTrail);
                }
                'r' => {
                    self.passport_view.passport_error = None;
                    return Some(AppCommand::LoadPassports);
                }
                'c' => return Some(AppCommand::ValidatePassport),
                'f' => return Some(AppCommand::GeneratePassportFria),
                'x' => return Some(AppCommand::ExportPassport),
                _ => {}
            },
            _ => {}
        }
        None
    }

    /// Handle Enter key in view context.
    pub(crate) fn handle_view_enter(&mut self) -> Option<AppCommand> {
        match self.view_state {
            ViewState::Scan => {
                if self.scan_view.detail_open {
                    // Close detail → back to preview
                    self.scan_view.detail_open = false;
                    self.scan_view.preview_scroll = 0;
                } else if self.last_scan.is_some() {
                    // Open finding detail in right panel
                    self.scan_view.detail_open = true;
                    self.scan_view.preview_scroll = 0;
                }
            }
            ViewState::Fix => {
                if self.fix_view.results.is_some() {
                    // Dismiss results
                    self.fix_view.results = None;
                } else if self.fix_view.is_single_fix() {
                    // Single-fix mode: auto-select focused item and apply
                    if let Some(cid) = self.fix_view.focus_check_id.clone() {
                        if let Some(item) = self.fix_view.fixable_findings.iter_mut().find(|f| f.check_id == cid) {
                            item.selected = true;
                        }
                    }
                    self.fix_view.applying = true;
                    return Some(AppCommand::ApplyFixes);
                } else if self.fix_view.selected_count() > 0 {
                    self.fix_view.applying = true;
                    return Some(AppCommand::ApplyFixes);
                }
            }
            ViewState::Passport => {
                use crate::views::passport::PassportViewMode;
                if self.passport_view.view_mode == PassportViewMode::AgentList
                    && !self.passport_view.loaded_passports.is_empty()
                {
                    // Drill down into field editor for selected passport
                    self.passport_view.view_mode = PassportViewMode::FieldEditor;
                    self.passport_view.load_from_passports();
                    self.passport_view.selected_index = 0;
                    self.passport_view.scroll_offset = 0;
                }
            }
            ViewState::Obligations => {
                // Toggle detail panel open/closed for selected obligation
                self.obligations_view.detail_open = !self.obligations_view.detail_open;
            }
            ViewState::Report => {
                if self.report_view.viewing_report {
                    // Close report detail view
                    self.report_view.viewing_report = false;
                } else if self.last_scan.is_some() {
                    // Export selected report
                    return Some(AppCommand::ExportReport);
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
                    self.scan_view.preview_scroll = 0;
                }
            }
            ViewState::Fix => {
                if self.fix_view.results.is_some() {
                    self.fix_view.results = None;
                } else if self.fix_view.is_single_fix() {
                    self.fix_view.focus_check_id = None;
                    self.view_state = ViewState::Scan;
                }
            }
            ViewState::Passport => {
                use crate::views::passport::{PassportDetailMode, PassportViewMode};
                match self.passport_view.detail_mode {
                    PassportDetailMode::ObligationChecklist
                    | PassportDetailMode::Registry
                    | PassportDetailMode::AuditTrail => {
                        self.passport_view.detail_mode = PassportDetailMode::FieldDetail;
                    }
                    PassportDetailMode::FieldDetail => {
                        if self.passport_view.view_mode == PassportViewMode::FieldEditor {
                            self.passport_view.view_mode = PassportViewMode::AgentList;
                        }
                    }
                }
            }
            ViewState::Obligations => {
                if self.obligations_view.detail_open {
                    self.obligations_view.detail_open = false;
                } else if self.obligations_view.filter != crate::views::obligations::ObligationFilter::All {
                    self.obligations_view.filter = crate::views::obligations::ObligationFilter::All;
                    self.obligations_view.selected_index = 0;
                    self.obligations_view.scroll_offset = 0;
                }
            }
            ViewState::Report => {
                if self.report_view.viewing_report {
                    self.report_view.viewing_report = false;
                }
            }
            _ => {}
        }
    }
}
