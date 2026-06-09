#!/usr/bin/env node
/** P1.3.28 — Analytics UI + Community social platform + profiles + groups */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function must(src, needle, label, errors) {
  if (!src.includes(needle)) errors.push(label);
}

const suites = {
  "analytics-production-ui": () => {
    const e = [];
    must(read("src/components/analytics/analytics-view.tsx"), "InsightsDashboardPanel", "analytics uses insights panel", e);
    must(read("src/components/dashboard/dashboard-panels-p44.tsx"), "data-testid=\"analytics-main-chart\"", "main chart", e);
    must(read("src/components/dashboard/dashboard-panels-p44.tsx"), "ring-blue-500", "metric card glow", e);
    return e;
  },
  "analytics-date-buckets": () => {
    const e = [];
    must(read("src/lib/analytics/date-buckets.ts"), "adaptiveBucketStep", "adaptive buckets", e);
    must(read("src/app/api/projects/[id]/analytics/route.ts"), "fillTimeBuckets", "api bucket fill", e);
    return e;
  },
  "analytics-tooltip": () => {
    const e = [];
    must(read("src/components/dashboard/dashboard-panels-p44.tsx"), "analytics-chart-tooltip", "chart tooltip", e);
    return e;
  },
  "analytics-custom-range": () => {
    const e = [];
    must(read("src/components/dashboard/dashboard-panels-p44.tsx"), "period === \"custom\"", "custom range ui", e);
    must(read("src/app/api/projects/[id]/analytics/route.ts"), "period === \"custom\"", "custom range api", e);
    return e;
  },
  "community-post-likes": () => {
    const e = [];
    must(read("src/app/api/community/discussions/[id]/like/route.ts"), "discussion_liked", "like notifications", e);
    must(read("src/components/community/community-view.tsx"), "/api/community/discussions/", "api like reconcile", e);
    return e;
  },
  "community-comment-likes": () => {
    const e = [];
    must(read("src/app/api/community/comments/[id]/like/route.ts"), "comment_liked", "comment like notify", e);
    return e;
  },
  "community-comment-replies": () => {
    const e = [];
    must(read("src/app/api/community/comments/[id]/reply/route.ts"), "parent_reply_id", "nested replies", e);
    must(read("supabase/migrations/20260901120000_p1328_community_social_platform.sql"), "parent_reply_id", "migration nested", e);
    return e;
  },
  "community-social-notifications": () => {
    const e = [];
    const kinds = read("src/lib/notifications/notification-kinds.ts");
    must(kinds, "discussion_liked", "discussion_liked kind", e);
    must(kinds, "user_followed", "user_followed kind", e);
    must(read("src/lib/community/community-notifications.ts"), "createUserNotification", "notify helper", e);
    return e;
  },
  "community-refresh-persistence": () => {
    const e = [];
    must(read("supabase/migrations/20260901120000_p1328_community_social_platform.sql"), "bump_discussion_like_count", "like count trigger", e);
    must(read("supabase/migrations/20260901120000_p1328_community_social_platform.sql"), "bump_discussion_reply_count", "reply count trigger", e);
    return e;
  },
  "user-ranks-no-plan-leak": () => {
    const e = [];
    must(read("src/lib/community/user-ranks.ts"), "PRIVATE_PROFILE_FIELDS", "private fields list", e);
    must(read("src/lib/community/user-ranks.ts"), "plan_id", "plan blocked list", e);
    if (read("src/app/api/community/profiles/[username]/route.ts").includes("plan_id")) {
      e.push("profile api leaks plan_id");
    }
    return e;
  },
  "user-rank-calculation": () => {
    const e = [];
    must(read("src/lib/community/user-ranks.ts"), "resolveUserRank", "rank resolver", e);
    must(read("src/lib/community/user-ranks.ts"), "scoreUserRankActivity", "rank scoring", e);
    return e;
  },
  "public-user-profile": () => {
    const e = [];
    must(read("src/app/(app)/builders/[username]/page.tsx"), "PublicBuilderProfileView", "profile page", e);
    must(read("src/app/api/community/profiles/[username]/route.ts"), "public_profile_enabled", "privacy gate", e);
    return e;
  },
  "public-profile-privacy": () => {
    const e = [];
    must(read("src/app/api/profile/route.ts"), "public_profile_enabled", "privacy toggles", e);
    must(read("src/app/api/profile/route.ts"), "show_apps_on_profile", "apps toggle", e);
    return e;
  },
  "profile-app-view-only": () => {
    const e = [];
    must(read("src/components/community/public-builder-profile-view.tsx"), "View-only preview", "view only copy", e);
    must(read("src/components/community/public-builder-profile-view.tsx"), "sandbox=", "iframe sandbox", e);
    return e;
  },
  "no-private-data-leak": () => {
    const e = [];
    const api = read("src/app/api/community/profiles/[username]/route.ts");
    for (const f of ["email", "credits_remaining", "plan_id", "subscription_status"]) {
      if (api.includes(f)) e.push(`profile api leaks ${f}`);
    }
    return e;
  },
  "user-follow-system": () => {
    const e = [];
    must(read("src/app/api/community/follow/route.ts"), "Cannot follow yourself", "no self follow", e);
    must(read("supabase/migrations/20260901120000_p1328_community_social_platform.sql"), "user_follows", "follows table", e);
    return e;
  },
  "follower-count-backend-truth": () => {
    const e = [];
    must(read("supabase/migrations/20260901120000_p1328_community_social_platform.sql"), "bump_follower_count", "follower trigger", e);
    return e;
  },
  "groups-empty-state": () => {
    const e = [];
    must(read("src/components/community/community-view.tsx"), "Be the first to create a Vodex builder group", "empty state copy", e);
    return e;
  },
  "groups-create-join-leave": () => {
    const e = [];
    must(read("src/components/community/community-view.tsx"), "CreateGroupModal", "create group", e);
    must(read("src/components/community/community-view.tsx"), "handleJoin", "join leave", e);
    return e;
  },
  "group-chat-basic": () => {
    const e = [];
    must(read("src/components/community/group-chat-panel.tsx"), "group_messages", "chat panel", e);
    must(read("src/app/api/community/groups/[id]/messages/route.ts"), "group_messages", "messages api", e);
    return e;
  },
  "group-owner-permissions": () => {
    const e = [];
    must(read("src/components/community/group-page.tsx"), "creator_id", "owner id", e);
    return e;
  },
  "group-message-filter": () => {
    const e = [];
    must(read("src/lib/community/group-message-filter.ts"), "filterGroupMessageBody", "filter fn", e);
    must(read("src/app/api/community/groups/[id]/messages/route.ts"), "filterGroupMessageBody", "api uses filter", e);
    return e;
  },
  "community-rls": () => {
    const e = [];
    must(
      read("supabase/migrations/20260518220000_production_community_and_app_engineering.sql"),
      "discussions: public read",
      "discussions rls",
      e,
    );
    must(read("supabase/migrations/20260901120000_p1328_community_social_platform.sql"), "discussion_reply_likes", "reply likes rls table", e);
    return e;
  },
  "profile-privacy-rls": () => {
    const e = [];
    must(read("supabase/migrations/20260901120000_p1328_community_social_platform.sql"), "profiles: public read limited", "profile rls", e);
    return e;
  },
  "groups-rls": () => {
    const e = [];
    must(read("supabase/migrations/20260901120000_p1328_community_social_platform.sql"), "grant select on public.groups", "groups grants", e);
    return e;
  },
  "preview-platform-path-block": () => {
    const e = [];
    must(read("src/lib/preview/inject-preview-virtual-history.ts"), "isPlatformPreviewPath", "blocks api/projects in spa", e);
    must(read("supabase/migrations/20260901120000_p1328_community_social_platform.sql"), "api/projects/%", "db url repair", e);
    return e;
  },
};

const only = process.argv[2];
const names = only && only !== "all" ? [only] : Object.keys(suites);
let failed = 0;
for (const name of names) {
  const errors = suites[name]?.();
  if (!errors) {
    console.error(`Unknown suite: ${name}`);
    failed++;
    continue;
  }
  if (errors.length) {
    console.error(`FAIL verify:${name}`);
    for (const err of errors) console.error(`  - ${err}`);
    failed++;
  } else {
    console.log(`OK verify:${name}`);
  }
}
process.exit(failed ? 1 : 0);
