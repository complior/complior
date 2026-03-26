use super::{OnboardingStep, StepKind, StepOption};

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

pub(super) fn build_steps() -> Vec<OnboardingStep> {
    vec![
        // Step 0: Welcome + Theme
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
            text_value: String::new(),
        },
        // Step 1: Project Type
        OnboardingStep {
            id: "project_type",
            title: "Project Type",
            description: "What are you working on?",
            kind: StepKind::Radio,
            options: vec![
                StepOption::new("My project")
                    .with_hint("Scan your codebase for compliance issues."),
                StepOption::new("Demo mode")
                    .with_hint("Explore Complior with sample data."),
            ],
            selected: vec![0],
            text_value: String::new(),
        },
        // Step 2: Workspace Trust
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
            text_value: String::new(),
        },
        // Step 3: Role
        OnboardingStep {
            id: "role",
            title: "Role in AI Value Chain",
            description: "What is your company's role under the EU AI Act?\nThis determines which obligations apply to you.",
            kind: StepKind::Radio,
            options: vec![
                StepOption::new("Deployer — we USE AI systems")
                    .with_hint("~10 obligations. You integrate AI APIs (OpenAI, Anthropic, Google) or use AI tools. Examples: SaaS with AI chatbot, internal AI tool."),
                StepOption::new("Provider — we BUILD AI systems")
                    .with_hint("~30 obligations. You develop, train, or rebrand AI under your name. Art.25: if you put your brand on it, you are a provider."),
                StepOption::new("Both provider and deployer")
                    .with_hint("You build your own AI AND use third-party AI. Full obligation set."),
                StepOption::new("Not sure")
                    .with_hint("We'll detect from your codebase."),
            ],
            selected: vec![0],
            text_value: String::new(),
        },
        // Step 4: Industry
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
            text_value: String::new(),
        },
        // Step 5: AI Provider
        OnboardingStep {
            id: "ai_provider",
            title: "AI Connection",
            description: "How should Complior connect to AI?\nAI enables deep analysis, chat assistant, and intelligent fixes.",
            kind: StepKind::TextInput { masked: true },
            options: vec![
                StepOption::new("OpenRouter")
                    .with_hint("Access 100+ models via openrouter.ai. Recommended for flexibility."),
                StepOption::new("Anthropic")
                    .with_hint("Claude models directly from Anthropic."),
                StepOption::new("OpenAI")
                    .with_hint("GPT models directly from OpenAI."),
                StepOption::new("Complior Guard API")
                    .with_hint("Full AI analysis via Complior cloud. Login required.")
                    .with_tag("RECOMMENDED"),
                StepOption::new("Offline mode")
                    .with_hint("Rule-based scanning only (~70% coverage). No API key needed."),
            ],
            selected: vec![],
            text_value: String::new(),
        },
        // Step 6: Summary
        OnboardingStep {
            id: "summary",
            title: "Setup Complete",
            description: "Review your configuration and start Complior.",
            kind: StepKind::Summary,
            options: vec![],
            selected: vec![],
            text_value: String::new(),
        },
    ]
}
