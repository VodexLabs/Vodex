"use client";

import * as React from "react";
import { ContactRequestsPanel } from "@/components/admin/contact-requests-panel";

export function ProjectContactsPanel({ projectId }: { projectId: string }) {
  return (
    <div className="p-4">
      <ContactRequestsPanel
        apiBase={`/api/projects/${projectId}/contacts`}
        title="App contacts"
        showEmailConfigBanner={false}
      />
    </div>
  );
}
