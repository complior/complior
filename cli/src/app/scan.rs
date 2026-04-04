use crate::types::{ActivityKind, ChatMessage, MessageRole, ScanResult, Zone};

use super::App;

impl App {
    pub fn set_scan_result(&mut self, result: ScanResult) {
        let score = result.score.total_score;
        let old_score = self.score_history.last().copied().unwrap_or(0.0);
        self.push_activity(ActivityKind::Scan, format!("{score:.0}/100"));
        self.score_history.push(score);

        // T08: Push counter animation on score change
        if self.animation.enabled && (old_score - score).abs() > 0.5 {
            self.animation.push(crate::animation::Animation::new(
                crate::animation::AnimKind::Counter {
                    from: old_score as u32,
                    to: score as u32,
                },
                800,
            ));
        }
        if self.score_history.len() > 20 {
            self.score_history.remove(0);
        }

        let zone = match result.score.zone {
            Zone::Green => "GREEN",
            Zone::Yellow => "YELLOW",
            Zone::Red => "RED",
        };

        self.messages.push(ChatMessage::new(
            MessageRole::System,
            format!(
                "Scan complete: {:.0}/100 ({zone}) — {} files, {} checks ({} pass, {} fail)",
                score,
                result.files_scanned,
                result.score.total_checks,
                result.score.passed_checks,
                result.score.failed_checks,
            ),
        ));

        // Update scan view state
        self.scan_view.set_complete(result.files_scanned);
        self.scan_view.selected_finding = None;
        self.scan_view.detail_open = false;

        self.last_scan = Some(result);
        self.operation_start = None;
        self.chat_auto_scroll = true;

        // T07: Toast notification for scan completion
        let toast_msg = format!("Scan complete: {score:.0}/100 ({zone})");
        let kind = if score >= 80.0 {
            crate::components::toast::ToastKind::Success
        } else if score >= 50.0 {
            crate::components::toast::ToastKind::Warning
        } else {
            crate::components::toast::ToastKind::Error
        };
        self.toasts.push(kind, toast_msg);
    }

    /// Count findings matching the current scan view filter.
    pub(super) fn filtered_findings_count(&self) -> usize {
        self.last_scan.as_ref().map_or(0, |s| {
            s.findings
                .iter()
                .filter(|f| self.scan_view.findings_filter.matches(f.severity))
                .count()
        })
    }

    /// Cycle `focus_check_id` to prev/next fixable finding in single-fix mode.
    pub(super) fn cycle_single_fix(&mut self, direction: i32) {
        let len = self.fix_view.fixable_findings.len();
        if len == 0 {
            return;
        }

        let current_idx = self
            .fix_view
            .focus_check_id
            .as_ref()
            .and_then(|cid| {
                self.fix_view
                    .fixable_findings
                    .iter()
                    .position(|f| &f.check_id == cid)
            })
            .unwrap_or(0);

        // Deselect old item
        if let Some(item) = self.fix_view.fixable_findings.get_mut(current_idx) {
            item.selected = false;
        }

        // Compute new index with wrapping
        let new_idx = if direction > 0 {
            (current_idx + 1) % len
        } else {
            current_idx.checked_sub(1).unwrap_or(len - 1)
        };

        // Update focus and auto-stage
        self.fix_view.selected_index = new_idx;
        self.fix_view.focus_check_id =
            Some(self.fix_view.fixable_findings[new_idx].check_id.clone());
        self.fix_view.fixable_findings[new_idx].selected = true;
    }
}
