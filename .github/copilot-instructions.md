## Purpose

This file provides guidance for AI coding agents working in the Table-Manager frontend repository.

**Repository:** [Cayn183/table-manager](https://github.com/Cayn183/table-manager)

**Stack:**
- React + TypeScript
- Vite
- CSS Modules

## Project Structure

```
├── src/           # React source files
│   ├── App.tsx    # Main application component
│   ├── main.tsx   # Application entry point
│   ├── api/       # API client
│   ├── auth/      # Authentication context
│   ├── components/# React components
│   ├── styles/    # CSS styles
│   ├── types/     # TypeScript type definitions
│   └── utils/     # Utility functions
├── index.html     # HTML entry point
├── vite.config.ts # Vite configuration
├── Dockerfile     # Docker build configuration
└── docker-compose.yml
```

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run start
```

## Docker Build

```bash
docker build -t table-manager:local --build-arg BUILD_SHA=local --build-arg BUILD_VERSION=dev .
```

## Environment Variables

- `VITE_API_URL` - Backend API URL (e.g., http://localhost:4000)
- `VITE_BUILD_SHA` - Build commit SHA
- `VITE_BUILD_VERSION` - Application version

## Related Repositories

- [Cayn183/backend-table-manager](https://github.com/Cayn183/backend-table-manager) - Backend API service

## Custom Agents

Dieses Projekt nutzt eigene Copilot-Agents unter `.github/agents/`.
Prüfe vor jeder Aufgabe, ob ein passender Agent vorhanden ist, und delegiere entsprechend.

## Safe-editing rules

- Keep changes minimal and focused
- Run `npm run build` to verify TypeScript compilation
- Test UI changes in development before committing

---

If anything above is unclear or you want me to scaffold a specific language layout now, tell me which language and the desired entrypoint (for example: a CLI called `table-manager` or a web server on port 3000). I will wait for confirmation before creating code.
