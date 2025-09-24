# NeuroCredit Hackathon

A project for the NeuroCredit Hackathon, integrating smart contracts, backend API, and React frontend.

## Project Structure

- **contracts/**: Smart contracts for blockchain integration.
- **backend/**: Node.js API server.
- **frontend/**: React application.
- **database/**: Database schemas and configurations.
- **docs/**: Project documentation.
- **scripts/**: Deployment and utility scripts.

## Getting Started

1. Clone the repository.
2. Copy `.env.example` to `.env` and fill in your environment variables.
3. Run `npm install` to install root dependencies.
4. Use `docker-compose up` for local development stack.
5. Or run `npm run install-all` to install dependencies for backend and frontend.
6. Start services with `npm run dev`.

## Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose
- PostgreSQL (if not using Docker)

## Contributing

Follow the standard Git workflow. Ensure all tests pass before submitting PRs.

## License

MIT
