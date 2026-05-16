import type { Metadata } from "next";
import { MarketplaceView } from "@/components/marketplace/marketplace-view";

export const metadata: Metadata = { title: "Marketplace" };
export default function MarketplacePage() { return <MarketplaceView />; }
