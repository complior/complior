export default function Home() {
  return (
    <main>
      {/* Hero */}
      <section style={{ textAlign: "center", padding: "120px 20px 80px", maxWidth: 800, margin: "0 auto" }}>
        <h1 style={{ fontSize: "3.5rem", fontWeight: 800, lineHeight: 1.1, margin: 0 }}>
          AI Compliance
          <br />
          <span style={{ color: "#22c55e" }}>in your terminal.</span>
        </h1>
        <p style={{ fontSize: "1.25rem", color: "#a1a1aa", marginTop: 20 }}>
          Scan your AI project for EU AI Act compliance. Fix violations automatically.
          <br />
          Ship with confidence.
        </p>
        <pre style={{
          background: "#18181b", border: "1px solid #27272a", borderRadius: 8,
          padding: "16px 24px", display: "inline-block", marginTop: 32, fontSize: "1.1rem", color: "#a1a1aa",
        }}>
          <code>
            <span style={{ color: "#22c55e" }}>$</span> curl -fsSL https://complior.ai/install.sh | sh
          </code>
        </pre>
      </section>

      {/* Demo GIF placeholder */}
      <section style={{ textAlign: "center", padding: "40px 20px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{
          background: "#18181b", border: "1px solid #27272a", borderRadius: 12,
          padding: 60, color: "#52525b", fontSize: "1rem",
        }}>
          [ 30-second demo GIF ]
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: "80px 20px", maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "2rem", marginBottom: 48 }}>
          Three commands. Full compliance.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
          {[
            { step: "1", cmd: "complior scan", desc: "Scan 108 obligations in <10s" },
            { step: "2", cmd: "complior fix --all", desc: "Auto-fix 80%+ of violations" },
            { step: "3", cmd: "complior report", desc: "Generate audit-ready PDF" },
          ].map(({ step, cmd, desc }) => (
            <div key={step} style={{
              background: "#18181b", border: "1px solid #27272a", borderRadius: 12, padding: 24,
            }}>
              <div style={{ color: "#22c55e", fontSize: "2rem", fontWeight: 700 }}>{step}</div>
              <code style={{ color: "#ededed", fontSize: "1rem" }}>{cmd}</code>
              <p style={{ color: "#a1a1aa", marginTop: 8, fontSize: "0.9rem" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "80px 20px", maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "2rem", marginBottom: 48 }}>Features</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }}>
          {[
            { title: "5-Layer Scanner", desc: "L1 file presence to L5 LLM deep analysis" },
            { title: "Auto-Fixer", desc: "One command generates missing docs, adds components, fixes configs" },
            { title: "Interactive TUI", desc: "Beautiful 6-view terminal dashboard with themes" },
            { title: "CI/CD Ready", desc: "complior scan --ci --threshold 70, SARIF output" },
            { title: "SDK Middleware", desc: "Runtime compliance for OpenAI, Anthropic, Google, Vercel AI" },
            { title: "Watch Mode", desc: "Continuous monitoring — fix violations as you code" },
            { title: "MCP Server", desc: "7 tools for Claude, Cursor, Windsurf integration" },
            { title: "PDF Reports", desc: "Audit-ready compliance reports with executive summary" },
          ].map(({ title, desc }) => (
            <div key={title} style={{
              background: "#18181b", border: "1px solid #27272a", borderRadius: 8, padding: 20,
            }}>
              <h3 style={{ margin: "0 0 4px", fontSize: "1rem" }}>{title}</h3>
              <p style={{ margin: 0, color: "#a1a1aa", fontSize: "0.85rem" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: "80px 20px", maxWidth: 900, margin: "0 auto" }}>
        <h2 style={{ textAlign: "center", fontSize: "2rem", marginBottom: 48 }}>Pricing</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            {
              name: "Free", price: "$0", desc: "For individual developers",
              features: ["L1-L4 scanning", "Unlimited projects", "CLI + TUI", "Community support"],
            },
            {
              name: "Pro", price: "$39", unit: "/seat/mo", desc: "For teams shipping AI products",
              features: ["Everything in Free", "L5 LLM analysis", "PDF reports", "Priority support"],
              highlight: true,
            },
            {
              name: "Enterprise", price: "Custom", desc: "For regulated industries",
              features: ["Everything in Pro", "On-premise", "SSO/SAML", "Dedicated support"],
            },
          ].map(({ name, price, unit, desc, features, highlight }) => (
            <div key={name} style={{
              background: "#18181b",
              border: highlight ? "2px solid #22c55e" : "1px solid #27272a",
              borderRadius: 12, padding: 24, textAlign: "center",
            }}>
              <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{name}</h3>
              <div style={{ fontSize: "2.5rem", fontWeight: 700, margin: "12px 0" }}>
                {price}<span style={{ fontSize: "1rem", color: "#a1a1aa" }}>{unit || ""}</span>
              </div>
              <p style={{ color: "#a1a1aa", fontSize: "0.85rem" }}>{desc}</p>
              <ul style={{ listStyle: "none", padding: 0, marginTop: 16, textAlign: "left" }}>
                {features.map((f) => (
                  <li key={f} style={{ padding: "4px 0", fontSize: "0.85rem", color: "#a1a1aa" }}>
                    ✓ {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Badge */}
      <section style={{ textAlign: "center", padding: "60px 20px" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: 16 }}>Add the badge to your README</h2>
        <pre style={{
          background: "#18181b", border: "1px solid #27272a", borderRadius: 8,
          padding: "12px 20px", display: "inline-block", fontSize: "0.85rem", color: "#a1a1aa",
        }}>
          <code>[![Complior](https://img.shields.io/badge/AI_Act-Compliant-green)](https://complior.ai)</code>
        </pre>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid #27272a", padding: "40px 20px", textAlign: "center",
        color: "#52525b", fontSize: "0.85rem",
      }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 16 }}>
          <a href="https://github.com/a3ka/complior" style={{ color: "#a1a1aa" }}>GitHub</a>
          <a href="https://complior.ai/docs" style={{ color: "#a1a1aa" }}>Docs</a>
          <a href="https://discord.gg/complior" style={{ color: "#a1a1aa" }}>Discord</a>
          <a href="mailto:hello@complior.ai" style={{ color: "#a1a1aa" }}>Contact</a>
        </div>
        <p>Apache-2.0 License · Built with Rust + TypeScript</p>
      </footer>
    </main>
  );
}
