import { Container } from "@/components/layout/Container";
import { getLiveNetworkData } from "@/lib/db/liveNetwork";
import { LiveNetworkPanel } from "@/components/home/LiveNetworkPanel";

export async function LiveNetworkSection() {
  const data = await getLiveNetworkData();
  if (!data || data.pins.length === 0) return null;

  return (
    <section
      className="bg-white pt-0 dark:bg-zinc-950"
      aria-labelledby="live-network-heading"
    >
      <Container className="pb-10 pt-0 sm:pb-12">
        <h2 id="live-network-heading" className="sr-only">
          Live Network
        </h2>
        <LiveNetworkPanel data={data} />
      </Container>
    </section>
  );
}
