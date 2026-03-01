use super::{OnboardingStep, StepKind, StepOption};

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

pub(super) fn build_steps() -> Vec<OnboardingStep> {
    vec![
        // Step 1: Welcome + Theme
        OnboardingStep {
            id: "welcome_theme",
            title: "Welcome + Theme",
            description: "Choose the text style that looks best with your terminal.\nTo change this later, run /theme",
            kind: StepKind::ThemeSelect,
            options: vec![
                StepOption::new("Complior Dark"),
                StepOption::new("Complior Light"),
                StepOption::new("Solarized Dark"),
                StepOption::new("Solarized Light"),
                StepOption::new("Dracula"),
                StepOption::new("Nord"),
                StepOption::new("Monokai"),
                StepOption::new("Gruvbox"),
            ],
            selected: vec![0],
        },
        // Step 2: Navigation
        OnboardingStep {
            id: "navigation",
            title: "Navigation Mode",
            description: "How do you want to navigate?",
            kind: StepKind::Radio,
            options: vec![
                StepOption::new("Standard")
                    .with_hint("Arrow keys, Enter, Esc. Tab to cycle, Space to toggle."),
                StepOption::new("Vim-style")
                    .with_hint("j/k to move, Enter to confirm. h/l for tabs, / to search."),
            ],
            selected: vec![0],
        },
        // Step 3: Project Type
        OnboardingStep {
            id: "project_type",
            title: "Project Type",
            description: "Is this a new project or an existing one?",
            kind: StepKind::Radio,
            options: vec![
                StepOption::new("Existing project")
                    .with_hint("Complior will scan and find AI tools now."),
                StepOption::new("New project")
                    .with_hint("Set up compliance from the start."),
                StepOption::new("Just exploring")
                    .with_hint("Quick demo with sample data."),
            ],
            selected: vec![0],
        },
        // Step 5: Workspace Trust
        OnboardingStep {
            id: "workspace_trust",
            title: "Workspace Trust",
            description: "Complior will scan files, detect AI tools, and generate reports.",
            kind: StepKind::Radio,
            options: vec![
                StepOption::new("Yes, I trust this folder"),
                StepOption::new("No, exit"),
            ],
            selected: vec![0],
        },
        // Step 6: Jurisdiction
        OnboardingStep {
            id: "jurisdiction",
            title: "Jurisdiction",
            description: "Where does your company operate?\nThis determines which regulations apply.",
            kind: StepKind::Radio,
            options: vec![
                StepOption::new("EU / EEA").with_hint("EU AI Act applies in full"),
                StepOption::new("UK").with_hint("UK AI framework").with_tag("coming soon"),
                StepOption::new("EU + UK").with_hint("Both frameworks").with_tag("coming soon"),
                StepOption::new("US").with_hint("State-level rules").with_tag("coming soon"),
                StepOption::new("Global").with_hint("All applicable frameworks").with_tag("coming soon"),
                StepOption::new("Not sure").with_hint("Default: EU AI Act"),
            ],
            selected: vec![0],
        },
        // Step 7: Role
        OnboardingStep {
            id: "role",
            title: "Role in AI Value Chain",
            description: "What is your company's role?\nEU AI Act assigns different obligations to each role.",
            kind: StepKind::Radio,
            options: vec![
                StepOption::new("We USE AI tools (Deployer)")
                    .with_hint("~10 obligations. Most companies are here."),
                StepOption::new("We BUILD AI systems (Provider)")
                    .with_hint("~30 obligations. Train/fine-tune/ship AI."),
                StepOption::new("Both (Provider + Deployer)")
                    .with_hint("Build your own AI AND use third-party AI."),
                StepOption::new("Not sure")
                    .with_hint("We'll detect from your codebase."),
            ],
            selected: vec![0],
        },
        // Step 8: Industry
        OnboardingStep {
            id: "industry",
            title: "Industry / Domain",
            description: "What industry does this project serve?\nSome industries trigger HIGH RISK under the EU AI Act.",
            kind: StepKind::Radio,
            options: vec![
                StepOption::new("General SaaS / Web app"),
                StepOption::new("HR / Recruitment / People").with_tag("HIGH RISK"),
                StepOption::new("Finance / Credit / Insurance").with_tag("HIGH RISK"),
                StepOption::new("Healthcare / Medical").with_tag("HIGH RISK"),
                StepOption::new("Education / EdTech").with_tag("HIGH RISK"),
                StepOption::new("Legal / Justice").with_tag("HIGH RISK"),
                StepOption::new("Security / Biometrics").with_tag("HIGH RISK"),
                StepOption::new("Marketing / Advertising"),
                StepOption::new("Customer Service"),
                StepOption::new("Other / Not sure"),
            ],
            selected: vec![0],
        },
        // Step 9: Scan Scope
        OnboardingStep {
            id: "scan_scope",
            title: "Scan Scope",
            description: "What should Complior scan?\nUse Space to toggle, Enter to confirm.",
            kind: StepKind::Checkbox,
            options: vec![
                StepOption::new("Dependencies")
                    .with_hint("package.json, requirements.txt, go.mod"),
                StepOption::new("Environment vars")
                    .with_hint(".env, docker-compose.yml, CI/CD configs"),
                StepOption::new("Source code")
                    .with_hint("imports, API calls, SDK patterns"),
                StepOption::new("Infrastructure")
                    .with_hint("Dockerfile, K8s manifests, Terraform"),
                StepOption::new("Documentation")
                    .with_hint("Check if compliance docs exist"),
            ],
            selected: vec![0, 1, 2], // first 3 on by default
        },
        // Step 10: Summary
        OnboardingStep {
            id: "summary",
            title: "Setup Complete",
            description: "Review your configuration and start Complior.",
            kind: StepKind::Summary,
            options: vec![],
            selected: vec![],
        },
    ]
}
