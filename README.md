# ATAS-Pro: AI & Community

> **High-Performance, AI-Native Distributed System for University-to-Industry Bridging.**

## 📖 Core Mission & Vision

- **Bridging the Gap:** To fix the broken and inefficient connection between university education and industry requirements in Malaysia.

- **Career Competitiveness:** Activating a knowledge-sharing ecosystem to move beyond "compliance-based" activities and genuinely enhance student career readiness.

- **Dual-Engine Strategy:**
  - **The Tool:** A high-utility booking system to capture initial user intent (Expert Discovery).
  - **The Community:** An interactive space centered around event discussions to ensure long-term user retention.

## 🚀 Key Technical Stack (High-Performance Architecture)

- **Vector Search:** Replaced keyword matching with **pgvector** and LLM embeddings to enable semantic discovery (e.g., searching "Help me with high-concurrency system design" finds relevant industry experts).

- **Performance:** Optimized search latency to sub-100ms using efficient indexing strategies.

- **NeonDB (PostgreSQL) + pgvector:** For transactional data and AI-driven semantic search (Vector Embeddings) to match experts accurately.

- **Neo4j (Graph Database):** Specifically for Phase 2 to manage alumni connections, 2nd-degree networks, and personalized recommendation engines.

- **Redis & Celery:**
  - **Redis:** Implementing Cache-Aside patterns and distributed rate-limiting to protect AI APIs.
  - **Celery:** Decoupling time-consuming tasks like email notifications, AI proposal generation, and data synchronization.

- **Microservices (Phase 2 candidate):** Real-time interactive Q&A service utilizing WebSockets for live event engagement.

## Strategic Business Ingenuity

- **The "Digital Asset" Hook:** Converting transient event outputs (PPTs, Q&A summaries) into permanent, registered-user-only "Knowledge Kits" to drive sign-ups.

- **Reputation Economy:** Using Neo4j to build a professional portfolio for student organizers, transforming a one-time event into a long-term "digital resume".

- **Seamless Onboarding:** Fast-tracked 3-minute onboarding for three distinct roles (Student, Expert, Sponsor) to minimize entry friction.

- **Collaboration Mechanism:** An "Open for Collab" feature that allows different university clubs to co-host events, creating exponential user growth through inter-campus networking.

## Critical Considerations & Precautions

- **Scope Discipline:** Avoid over-complicating the social features early on. Focus on the "Quick Connect" value before scaling the community.

- **User Flow (The "Seamless" Bridge):** * Use tools like Driver.js to guide users from the "Event Feedback" stage directly into "Community Discussions."

- **Ensure every "Tool" interaction (like asking a question in Q&A) creates an automatic entry point into the "Community" (discussion threads).**

- **Code Alignment:** Maintain strict alignment across the Model -> Schema -> Service -> Router layers to prevent technical debt during the transition to Phase 2.

- **Value Density:** The Discussion area must prioritize "Academic/Professional Utility" (e.g., #Collab, #FYP_Help) over general social chatter to maintain high quality and professional trust.

## 🛠️ Strategic Tech Stack

| **Layer**        | **Technology**       | **Justification**                                                      |
| ---------------- | -------------------- | ---------------------------------------------------------------------- |
| **Core Backend** | Python 3.11, FastAPI | High-performance Async I/O, strict typing (Pydantic).                  |
| **Databases**    | PostgreSQL 15        | System of Record (ACID compliance) for transactional data.             |
| **Vector DB**    | pgvector             | Native vector storage for AI embeddings without external dependencies. |
| **Graph DB**     | Neo4j                | Optimized for traversing deep social/mentorship relationships.         |
| **Caching/MQ**   | Redis 7              | In-memory speed for caching and Celery message brokering.              |
| **Workers**      | Celery               | Robust distributed task queue for background processing.               |
| **Real-Time**    | WebSocket      | Instant notifications and mentorship chat sessions.                    |

## 📂 Project Structure (Clean Architecture)

This project strictly follows **Separation of Concerns** and **DTO Patterns**:

```
backend/
├── app/
│   ├── api/            # Router Layer (Traffic Cop, handles HTTP status)
│   ├── core/           # Infrastructure Config (Redis, DB, Security)
│   ├── services/       # Business Logic Layer (The "Brain", returns DTOs)
│   ├── models/         # Database Models (SQLAlchemy / Neo4j Nodes)
│   ├── schemas/        # Data Transfer Objects (Pydantic v2)
│   ├── tasks/          # Asynchronous Tasks (Celery)
│   └── main.py         # Global Exception Handlers & App Entry
├── migrations/         # Alembic Database Revisions
├── tests/              # Pytest Suite (Unit & Integration)
└── docker-compose.yml  # Infrastructure Orchestration
```

## 🏁 Getting Started

### 1. Environment Setup

Create a `.env` file reflecting the distributed infrastructure:

Bash

```
DATABASE_URL=postgresql+psycopg2://user:pass@db:5432/atas_pro
REDIS_URL=redis://redis:6379/0
NEO4J_URI=bolt://neo4j:7687
OPENAI_API_KEY=your_key_here
```

### 2. Launch via Docker

Spin up the entire stack (App, DB, Redis, Worker, Neo4j):

Bash

```
docker-compose up --build
```

- **API Documentation:** `http://localhost:8000/docs`

- **Redis Monitor:** `docker exec -it atas-redis redis-cli monitor`

## 🔮 Roadmap (Architecture Evolution)

- **Phase 1: Performance Foundation (Completed)**
  
  - Dockerization, Redis Caching (Cache-Aside), and Celery integration.

- **Phase 2: Graph & AI (Current Focus)**
  
  - Neo4j implementation for Alumni Recommendations.
  
  - LLM-based Resume/Profile Analysis.

- **Phase 3: Microservices Transition (Target: Bybit/Fintech Standards)**
  
  - Extract `Notification Service` into **Golang (Gin)** for extreme concurrency.
  
  - gRPC implementation for inter-service communication.

- **Phase 4: Observability**
  
  - Prometheus & Grafana dashboard integration for latency monitoring.

## 🤝 Engineering Standards

This repository adheres to top-tier engineering practices:

1. **Strict Typing:** No `Any`. All functions use Python 3.10+ Type Hints.

2. **DTO Pattern:** Services accept and return Pydantic Schemas, never raw DB objects.

3. **Defensive Programming:** Global Exception Handling ensures API stability.

4. **Testing:** High coverage Unit & E2E tests using `pytest`.

---

*Built for the next generation of professionals.*
