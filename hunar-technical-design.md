# Hunar (हुनर) — Technical Design Document

> **Kaam Bhi, Pehchaan Bhi** · काम भी, पहचान भी
> *Work, and recognition too.*

*Hackathon build: Beyond the Waiting Line · Inclusive Design · Employment · Digital Empowerment*

**Stack at a glance:** Next.js + Tailwind (PWA) · LangChain (JS) + Google Gemini for the AI agent · local-first state (Zustand) · optional MongoDB Atlas for cross-device persistence.

---

## 1. Product Summary

**Hunar** (हुनर, "skill") is a two-sided, mobile-first web app that helps hawkers (plumbers, electricians, carpenters, painters, sweepers, labourers) get found by the people who need them, without a résumé, a network, or advanced digital literacy.

**Tagline: Kaam Bhi, Pehchaan Bhi.** The worker gets *kaam* (work) and also a *pehchaan* (identity, reputation, recognition) that he can carry anywhere. The Hunar Card is that pehchaan: a QR-backed profile whose rating comes from real jobs, not paper.

- **Customer side:** photograph a problem, say what you need in a sentence, and an AI agent turns it into a structured, worker-readable ticket, asking short follow-up questions when budget, time or location are missing.
- **Worker side:** near-zero-typing onboarding, a feed of matched jobs, a **Hunar Card**, a Rights Hub for welfare schemes, and trust tools that make pay terms clear and flag suspicious listings.
- **Worker-centric:** the worker is the primary user and the customer side exists to serve him (see below).
- **Principle:** complement the naka (roadside hiring point), do not replace it. A worker standing at the naka can still be hired by a customer scanning his QR card; the app makes his work visible when he is not there.

**Constraints chosen:** frontend-heavy, minimal backend, mock data, Hindi + Marathi + English, a culturally rooted visual design that still feels modern.

### Worker-centric, not customer-centric

**Hunar is a worker-centric product.** The worker is the primary user; the customer is the supporting actor. The customer side exists to make the worker's life better: it produces clear, fair, trustworthy tickets. It is deliberately kept small and fast, and it is not where the design effort goes.

What this means in practice:

| Decision area | Worker-centric rule |
|---|---|
| **Design effort** | The majority of UI, illustration, voice and Hindi/Marathi work goes into the worker side. The customer flow is a short, clean path (photo, one sentence, a few chips). |
| **Who the AI serves** | The agent's output is written *for the worker*: simple Hindi/Marathi summary, clear pay and payment terms, trade icon. Follow-up questions exist to protect the worker from vague or unfair jobs. |
| **Pay and fairness** | The fair-price guard and the Check This Job scanner protect workers from lowball and suspicious listings. They never block the worker; they inform him. |
| **Reputation** | The worker owns his Hunar Card and the rating history that builds it. Workers also rate customers (late payers get flagged), so trust runs both ways. |
| **Rights and money** | Welfare schemes, the wage-dispute helper and the earnings ledger are for the worker. There is no customer equivalent. |
| **Defaults and trade-offs** | When a decision favours customer convenience over worker clarity, worker clarity wins. For example, payment terms are mandatory on every ticket, even though it adds one question for the customer. |
| **Accessibility bar** | The strict accessibility rules (section 3) apply to the worker side first. The customer side is expected to be usable, but is not the benchmark. |
| **Success metric** | Did the worker find a fair job, understand it without reading English, and build a record he can carry? Not "how many customers did we convert". |

If a feature only helps customers (for example, price comparison, promotions, or a service marketplace) it is out of scope. That is also what separates Hunar from a conventional job portal or home-services marketplace.

### Goals mapped to the problem statement

| Brief requirement | Hunar feature |
|---|---|
| Find work reliably | Matched job feed, Available Today toggle, clear pay/time/distance on every card |
| Showcase skills without credentials | Hunar Card: jobs done, rating, before/after photos, voice testimonials, badges earned from jobs |
| Build trust | Payment terms on every ticket, fair-price guard, Check This Job scanner, two-way ratings |
| Access rights and support | Rights Hub: eligibility check, document checklists, wage-dispute helper |
| Not a conventional portal | Naka-centred concept, voice/icon-first UI, Indian visual language |

