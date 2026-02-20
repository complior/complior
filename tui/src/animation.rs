use std::time::Instant;

#[derive(Debug, Clone)]
pub enum AnimKind {
    ProgressBar { from: f64, to: f64 },
    Counter { from: u32, to: u32 },
    Flash,
    Splash,    // Fade-in for startup owl (0.0 → 1.0 opacity)
    Checkmark, // Green checkmark flash (3 blinks over 600ms)
}

#[derive(Debug, Clone)]
pub struct Animation {
    pub kind: AnimKind,
    pub started: Instant,
    pub duration_ms: u64,
    pub completed: bool,
}

impl Animation {
    pub fn new(kind: AnimKind, duration_ms: u64) -> Self {
        Self {
            kind,
            started: Instant::now(),
            duration_ms,
            completed: false,
        }
    }

    /// Progress 0.0..=1.0 with ease-out interpolation.
    #[allow(clippy::cast_precision_loss)]
    pub fn progress(&self) -> f64 {
        if self.completed {
            return 1.0;
        }
        let elapsed = self.started.elapsed().as_millis() as f64;
        let duration = self.duration_ms as f64;
        let t = (elapsed / duration).clamp(0.0, 1.0);
        // Ease-out: 1 - (1-t)^2
        (1.0 - t).powi(2).mul_add(-1.0, 1.0)
    }

    #[allow(clippy::cast_precision_loss)]
    pub fn current_value_f64(&self) -> f64 {
        let p = self.progress();
        match &self.kind {
            AnimKind::ProgressBar { from, to } => (to - from).mul_add(p, *from),
            AnimKind::Counter { from, to } => {
                let f = f64::from(*from);
                let t = f64::from(*to);
                (t - f).mul_add(p, f)
            }
            AnimKind::Flash | AnimKind::Splash => p,
            AnimKind::Checkmark => {
                // 3 blinks: on at 0-33%, off at 33-66%, on at 66-100%
                let phase = (p * 3.0) % 2.0;
                if phase < 1.0 { 1.0 } else { 0.0 }
            }
        }
    }

    #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
    pub fn current_value_u32(&self) -> u32 {
        self.current_value_f64().round() as u32
    }

    pub fn is_done(&self) -> bool {
        self.completed || self.started.elapsed().as_millis() >= u128::from(self.duration_ms)
    }
}

pub struct AnimationState {
    pub active: Vec<Animation>,
    pub enabled: bool,
}

impl AnimationState {
    pub const fn new(enabled: bool) -> Self {
        Self {
            active: Vec::new(),
            enabled,
        }
    }

    /// Returns true if there are active animations (used to gate the 50ms tick).
    pub const fn active(&self) -> bool {
        self.enabled && !self.active.is_empty()
    }

    /// Advance all animations, mark completed ones, garbage collect.
    pub fn step(&mut self) {
        for anim in &mut self.active {
            if anim.is_done() {
                anim.completed = true;
            }
        }
        self.active.retain(|a| !a.completed);
    }

    /// Push a new animation.
    pub fn push(&mut self, anim: Animation) {
        if self.enabled {
            self.active.push(anim);
        }
    }

    /// Get the latest counter animation value, or None if no counter active.
    pub fn counter_value(&self) -> Option<u32> {
        self.active
            .iter()
            .rev()
            .find_map(|a| match &a.kind {
                AnimKind::Counter { .. } => Some(a.current_value_u32()),
                _ => None,
            })
    }

    /// Get the latest progress bar value, or None.
    pub fn progress_value(&self) -> Option<f64> {
        self.active
            .iter()
            .rev()
            .find_map(|a| match &a.kind {
                AnimKind::ProgressBar { .. } => Some(a.current_value_f64()),
                _ => None,
            })
    }

    /// Splash fade-in opacity (0.0-1.0), or None if no splash active.
    pub fn splash_opacity(&self) -> Option<f64> {
        self.active
            .iter()
            .find_map(|a| match &a.kind {
                AnimKind::Splash => Some(a.progress()),
                _ => None,
            })
    }

    /// Checkmark visibility (true/false blink), or None if no checkmark active.
    pub fn checkmark_visible(&self) -> Option<bool> {
        self.active
            .iter()
            .find_map(|a| match &a.kind {
                AnimKind::Checkmark => Some(a.current_value_f64() > 0.5),
                _ => None,
            })
    }

    /// Start splash animation (500ms fade-in).
    pub fn start_splash(&mut self) {
        self.push(Animation::new(AnimKind::Splash, 500));
    }

    /// Start checkmark flash animation (600ms, 3 blinks).
    pub fn start_checkmark(&mut self) {
        self.push(Animation::new(AnimKind::Checkmark, 600));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn anim_interpolation() {
        let anim = Animation::new(
            AnimKind::Counter { from: 0, to: 100 },
            100, // 100ms
        );
        // Initially progress should be close to 0
        let v = anim.current_value_f64();
        assert!(v >= 0.0 && v <= 100.0);
    }

    #[test]
    fn anim_completion() {
        let mut anim = Animation::new(
            AnimKind::Counter { from: 50, to: 80 },
            1, // 1ms — effectively instant
        );
        std::thread::sleep(std::time::Duration::from_millis(5));
        assert!(anim.is_done());
        anim.completed = true;
        assert_eq!(anim.progress(), 1.0);
        assert_eq!(anim.current_value_u32(), 80);
    }

    #[test]
    fn anim_gc() {
        let mut state = AnimationState::new(true);
        state.push(Animation::new(
            AnimKind::Flash,
            1, // 1ms
        ));
        assert!(!state.active.is_empty());

        std::thread::sleep(std::time::Duration::from_millis(5));
        state.step();
        assert!(state.active.is_empty(), "Completed animations should be GC'd");
    }

    #[test]
    fn anim_disabled_noop() {
        let mut state = AnimationState::new(false);
        state.push(Animation::new(
            AnimKind::Counter { from: 0, to: 100 },
            500,
        ));
        assert!(state.active.is_empty(), "Disabled state should not accept animations");
        assert!(!state.active(), "Disabled state should report inactive");
    }

    #[test]
    fn splash_opacity_during_animation() {
        let mut state = AnimationState::new(true);
        state.start_splash();
        // Splash should be active immediately
        assert!(state.splash_opacity().is_some());
        let opacity = state.splash_opacity().unwrap();
        assert!(opacity >= 0.0 && opacity <= 1.0);
    }

    #[test]
    fn splash_completes_and_disappears() {
        let mut state = AnimationState::new(true);
        state.start_splash();
        assert!(state.splash_opacity().is_some());

        std::thread::sleep(std::time::Duration::from_millis(600)); // > 500ms splash duration
        state.step();
        assert!(state.splash_opacity().is_none(), "Splash should be GC'd after completion");
    }

    #[test]
    fn checkmark_blink_pattern() {
        let mut state = AnimationState::new(true);
        state.start_checkmark();
        // Checkmark should be active
        assert!(state.checkmark_visible().is_some());
    }

    #[test]
    fn checkmark_completes() {
        let mut state = AnimationState::new(true);
        state.start_checkmark();
        std::thread::sleep(std::time::Duration::from_millis(700)); // > 600ms
        state.step();
        assert!(state.checkmark_visible().is_none(), "Checkmark should be GC'd after completion");
    }
}
