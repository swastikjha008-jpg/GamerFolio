import { PublicProfilePage } from "@/views/AppViews";

export default function Page({ params }: { params: { username: string } }) {
  return <PublicProfilePage username={params.username} />;
}
