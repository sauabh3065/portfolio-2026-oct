"use client";
import { useState } from "react";
import {
  Code2,
  Database,
  Layers3,
  Server,
  Download,
  Mail,
  Menu,
  X,
  Copy,
  Check,
  Plus,
  Minus,
  Terminal,
  Braces,
  Cloud,
  ShieldCheck,
} from "lucide-react";
import DragonBattle from "./room";
const projects = [
  {
    number: "01",
    name: "Raftaarr",
    type: "B2B MACHINERY MARKETPLACE",
    description: "Connecting businesses with their next big investment.",
    detail:
      "Built a used-machinery marketplace with role-based access, product listings, and bidding. Designed the PostgreSQL schema for multi-tenant listings, bids, and transaction history with data integrity constraints.",
    tags: ["React", "Node.js", "PostgreSQL"],
    color: "mint",
    icon: Layers3,
    nodes: ["Businesses", "Listings & bids", "Node.js API", "PostgreSQL"],
    label: "Multi-tenant architecture",
  },
  {
    number: "02",
    name: "RookSaan",
    type: "PERSONALIZED COMMERCE",
    description: "Personal moments. A seamless path to checkout.",
    detail:
      "Developed a custom greeting card platform with real-time design previews. Built order and template APIs, integrated Stripe payments and SendGrid order confirmations, and helped boost checkout conversions by 40%.",
    tags: ["Angular", "Node.js", "MongoDB", "Stripe"],
    color: "violet",
    icon: Braces,
    nodes: ["Personalize", "Live preview", "Stripe checkout", "Order email"],
    label: "40% higher checkout conversion",
  },
  {
    number: "03",
    name: "Retail, connected.",
    type: "REGULATED E-COMMERCE",
    description: "The right product. In the right store. In real time.",
    detail:
      "Built product catalog, loyalty, and store-availability services for regulated retail. Used an Angular reroute strategy to reduce redundant API calls and a flexible MongoDB model for product variants and location-based inventory.",
    tags: ["Angular", "Node.js", "MongoDB"],
    color: "blue",
    icon: Database,
    nodes: ["Product catalog", "Store availability", "Loyalty", "MongoDB"],
    label: "Location-aware inventory",
  },
];
const experience = [
  {
    company: "Appventurez",
    role: "Senior Software Developer",
    dates: "SEP 2022 — PRESENT",
    text: "Owning backend architecture, from database design and service boundaries to production monitoring.",
    bullets: [
      "Reduced API response time and server costs by 60% with Redis caching.",
      "Integrated Valor PayTech for secure card payments and subscription billing.",
      "Mentored engineers through architecture reviews, code reviews, and shared quality standards.",
    ],
    stack: "Node.js · Redis · AWS · DataDog",
  },
  {
    company: "SevenStar Websolutions",
    role: "Software Developer",
    dates: "NOV 2021 — AUG 2022",
    text: "Helped move a monolithic platform toward event-driven microservices.",
    bullets: [
      "Improved scalability by 40% using API Gateway and RabbitMQ.",
      "Made APIs 55% faster through MongoDB query tuning and Redis caching.",
      "Built real-time WebSocket notifications and Dockerized deployment pipelines.",
    ],
    stack: "RabbitMQ · MongoDB · Docker · Stripe",
  },
  {
    company: "Fluper",
    role: "Software Developer",
    dates: "NOV 2020 — OCT 2021",
    text: "Built the foundations: reliable APIs, secure authentication, and tested integrations.",
    bullets: [
      "Developed multi-tenant REST APIs with JWT and OAuth authentication.",
      "Integrated Google Maps and payment gateways.",
      "Wrote Jest unit and integration tests and worked with QA to resolve production issues.",
    ],
    stack: "Node.js · JWT / OAuth · Jest",
  },
];
const skillGroups = [
  {
    icon: Code2,
    title: "Languages & frameworks",
    values: [
      "Node.js",
      "JavaScript",
      "TypeScript",
      "Express",
      "React",
      "Angular",
    ],
  },
  {
    icon: Database,
    title: "Data & performance",
    values: [
      "PostgreSQL",
      "MongoDB",
      "MySQL",
      "Redis",
      "Sequelize",
      "Prisma",
      "Mongoose",
    ],
  },
  {
    icon: Layers3,
    title: "Distributed systems",
    values: [
      "Microservices",
      "RabbitMQ",
      "Kafka",
      "WebSockets",
      "Socket.io",
      "Worker Threads",
    ],
  },
  {
    icon: Cloud,
    title: "Cloud & delivery",
    values: [
      "AWS Lambda",
      "SQS",
      "Cognito",
      "Docker",
      "CI/CD",
      "CloudWatch",
      "DataDog",
      "Jest",
    ],
  },
];
export default function Home() {
  const [menu, setMenu] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copyEmail() {
    try {
      await navigator.clipboard.writeText("rawatsaurabh3065@gmail.com");
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError(true);
    }
  }
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="nav-wrap">
        <nav className="nav container" aria-label="Main navigation">
          <a className="brand" href="#home" aria-label="Saurabh Rawat home">
            <span className="monogram">
              S R<span></span>
            </span>
            <span>
              Saurabh Rawat<span className="brand-sub">SENIOR SOFTWARE DEVELOPER</span>
            </span>
          </a>
          <div className={`nav-links ${menu ? "open" : ""}`}>
            {["Work", "About", "Experience", "Skills"].map((name) => (
              <a
                key={name}
                href={`#${name.toLowerCase()}`}
                onClick={() => setMenu(false)}
              >
                {name}
              </a>
            ))}
          </div>
          <a className="nav-contact" href="#contact">
            Let’s talk <span className="small-spark">✳</span>
          </a>
          <button
            className="menu-toggle icon-button"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Close menu" : "Open menu"}
            aria-expanded={menu}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </nav>
      </header>
      <main id="main">
        <section className="hero container" id="home">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="line" />
              SENIOR BACKEND ENGINEER · INDIA
            </div>
            <h1>
              Behind every
              <br />
              great product,
              <br />a <em>solid backend.</em>
            </h1>
            <p className="hero-intro">
              Hi, I’m <strong>Saurabh.</strong> I turn complex problems into
              fast, reliable systems that scale.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#work">
                Explore my work <Layers3 size={18} />
              </a>
              <a
                className="text-link"
                href="/Saurabh_Rawat_Resume.pdf"
                download
              >
                Download resume <Download size={17} />
              </a>
            </div>
            <div className="hero-note">
              <Terminal size={15} />
              <span>Node.js at heart. Impact in production.</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="scene-top">
              <span className="mono">A CLASH OF ELEMENTS</span>
              <span className="scene-number">01 / 01</span>
            </div>
            <DragonBattle />
            <div className="scene-bottom">
              <span>EMBER / FROST · AN ETERNAL RIVALRY</span>
              <span className="drag-label">DRAG TO EXPLORE</span>
            </div>
          </div>
        </section>
        <div className="metrics container">
          {[
            ["5+", "Years building for the web"],
            ["60%", "Lower API latency & server costs"],
            ["40%", "Improvement in platform scalability"],
            ["End to end", "Architecture to production"],
          ].map(([value, label]) => (
            <div key={value}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <section className="section container" id="work">
          <div className="section-heading">
            <div>
              <div className="eyebrow">01 / SELECTED WORK</div>
              <h2>
                Built to do
                <br />
                <span>the heavy lifting.</span>
              </h2>
            </div>
            <p>
              A few systems I’ve helped bring to life.
              <br />
              Real challenges. Thoughtful engineering.
            </p>
          </div>
          <div className="projects">
            {projects.map((p, i) => (
              <article className={`project ${p.color}`} key={p.name}>
                <div className="project-visual">
                  <div className="project-visual-top">
                    <p.icon size={27} />
                    <span className="mono">SYSTEM / {p.number}</span>
                  </div>
                  <div className="system-flow">
                    {p.nodes.map((n, j) => (
                      <div key={n} className="system-node">
                        <span className="node-num">0{j + 1}</span>
                        {n}
                        {j < 3 && <span className="connector" />}
                      </div>
                    ))}
                  </div>
                  <div className="project-visual-bottom">
                    <span className="mini-square" />
                    {p.label}
                  </div>
                </div>
                <div className="project-info">
                  <div className="eyebrow">{p.type}</div>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <div className="tags">
                    {p.tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                  <button
                    className="project-toggle"
                    aria-expanded={expanded === i}
                    aria-controls={`project-${i}`}
                    onClick={() => setExpanded(expanded === i ? null : i)}
                  >
                    {expanded === i ? "Less detail" : "Project details"}
                    {expanded === i ? <Minus size={17} /> : <Plus size={17} />}
                  </button>
                  <div
                    id={`project-${i}`}
                    hidden={expanded !== i}
                    className="project-detail"
                  >
                    {p.detail}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="about-band" id="about">
          <div className="container about-layout">
            <div>
              <div className="eyebrow">02 / A LITTLE ABOUT ME</div>
              <h2>
                I care about what
                <br />
                happens{" "}
                <em>
                  under
                  <br />
                  the hood.
                </em>
              </h2>
            </div>
            <div className="about-copy">
              <p className="large-copy">
                Good engineering makes the complex feel simple.
              </p>
              <p>
                I’m a backend-focused software developer with 5+ years of
                experience building REST APIs, event-driven microservices, and
                the systems behind e-commerce and B2B platforms.
              </p>
              <p>
                I enjoy the work between an idea and a dependable product:
                modeling the data, finding the bottlenecks, securing the
                payments, and making sure everything holds up in production.
              </p>
              <div className="about-principles">
                <span>
                  <ShieldCheck size={19} /> Reliability first
                </span>
                <span>
                  <Code2 size={19} /> Clean by design
                </span>
                <span>
                  <Server size={19} /> Built to scale
                </span>
              </div>
              <div className="education">
                <span className="mono">THE FOUNDATION</span>
                <strong>B.Tech · Computer Science & Engineering</strong>
                <span>ABESIT, AKTU · Class of 2020</span>
              </div>
            </div>
          </div>
        </section>
        <section className="section container" id="experience">
          <div className="section-heading">
            <div>
              <div className="eyebrow">03 / THE JOURNEY</div>
              <h2>
                Experience that
                <br />
                <span>ships.</span>
              </h2>
            </div>
            <p>
              Growing from building APIs
              <br />
              to owning the architecture.
            </p>
          </div>
          <div className="timeline">
            {experience.map((e, i) => (
              <article key={e.company} className="experience-row">
                <div className="experience-date">
                  <span className="timeline-point" />
                  <span className="mono">{e.dates}</span>
                  {i === 0 && <span className="current">CURRENT ROLE</span>}
                </div>
                <div className="experience-content">
                  <div className="role-header">
                    <div>
                      <h3>{e.role}</h3>
                      <p className="company">{e.company}</p>
                    </div>
                    <span className="role-index">0{i + 1}</span>
                  </div>
                  <p>{e.text}</p>
                  <ul>
                    {e.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                  <span className="experience-stack mono">{e.stack}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="section skills-section container" id="skills">
          <div className="section-heading">
            <div>
              <div className="eyebrow">04 / THE TOOLKIT</div>
              <h2>
                The right tools.
                <br />
                <span>The right foundations.</span>
              </h2>
            </div>
            <p>
              From the first request
              <br />
              to the last mile of delivery.
            </p>
          </div>
          <div className="skill-grid">
            {skillGroups.map((g) => (
              <article className="skill-card" key={g.title}>
                <g.icon size={28} />
                <h3>{g.title}</h3>
                <div className="tags">
                  {g.values.map((v) => (
                    <span key={v}>{v}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="contact-section container" id="contact">
          <div className="contact-inner">
            <div className="eyebrow">05 / WHAT’S NEXT?</div>
            <h2>
              Let’s build
              <br />
              something <em>solid.</em>
            </h2>
            <p>
              Have a backend challenge, a product idea, or a role in mind?
              <br />
              I’d love to hear about it.
            </p>
            <div className="contact-actions">
              <a
                className="button primary"
                href="mailto:rawatsaurabh3065@gmail.com"
              >
                Say hello <Mail size={19} />
              </a>
              <a
                className="button secondary"
                href="https://www.linkedin.com/in/saurabhrawat"
                target="_blank"
                rel="noreferrer"
              >
                LinkedIn{" "}
                <span aria-hidden="true" className="linkedin-mark">
                  in
                </span>
              </a>
            </div>
            <div className="email-row">
              <a href="mailto:rawatsaurabh3065@gmail.com">
                rawatsaurabh3065@gmail.com
              </a>
              <button
                className="icon-button"
                onClick={copyEmail}
                aria-label="Copy email address"
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}
              </button>
            </div>
            <div className="copy-status" role="status">
              {copied
                ? "Email copied."
                : copyError
                  ? "Please select and copy the email address above."
                  : ""}
            </div>
          </div>
          <span className="contact-mark" aria-hidden="true">
            ✳
          </span>
        </section>
      </main>
      <footer className="container footer">
        <a className="footer-brand" href="#home">
          Saurabh Rawat<span>.</span>
        </a>
        <span>Built with React. Engineered with care.</span>
        <a href="/Saurabh_Rawat_Resume.pdf" download>
          Resume <Download size={14} />
        </a>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </>
  );
}
