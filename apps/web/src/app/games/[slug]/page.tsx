import { GameDetailsPage } from "@/views/AppViews";

export default function Page({ params }: { params: { slug: string } }) {
  return <GameDetailsPage slug={params.slug} />;
}
