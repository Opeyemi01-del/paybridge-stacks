import React, { useState } from "react";
import { Sidebar }       from "./components/Sidebar.tsx";
import { Overview }      from "./pages/Overview.tsx";
import { Payments }      from "./pages/Payments.tsx";
import { WebhooksPage }  from "./pages/webhooksPage.tsx";
import { ApiKeys }       from "./pages/ApiKeys.tsx";
import { DocsPage }      from "./pages/DocsPage.tsx";

export default function App() {
  const [page, setPage] = useState("overview");

  const pages: Record<string, React.ReactNode> = {
    overview: <Overview />,
    payments: <Payments />,
    webhooks: <WebhooksPage />,
    apikeys:  <ApiKeys />,
    docs:     <DocsPage />,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar page={page} setPage={setPage} />
      <main style={{
        flex: 1,
        padding: "40px 48px",
        overflow: "auto",
        maxWidth: 1100,
      }}>
        {pages[page]}
      </main>
    </div>
  );
}