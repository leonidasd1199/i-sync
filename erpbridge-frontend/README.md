# ERPBridge — Frontend

React + TypeScript SPA for the ERPBridge ordering platform.

## Setup

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`. Requires the backend to be running.

## Structure

```
src/
  context/     # Auth, Products, Cart, Orders global state (Context API)
  pages/       # Route-level components
  components/  # Reusable UI components
  services/    # API client functions
  hooks/       # Custom hooks
  layout/      # Shell layout (sidebar, header, mobile menu)
  routes/      # Route guards (PrivateRoute)
```

## Key libraries

- React Router 7 for routing
- Tailwind CSS + Headless UI for styling
- Framer Motion for transitions
- Recharts for dashboard charts
- react-window for virtualized product lists

See the [root README](../README.md) for full project context.
