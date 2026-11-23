import { MapPin } from "lucide-react";
import { MixLabel, formatM3 } from "@/components/dispatch/bits";
import type { Ticket } from "./field-data";

/** What a driver or a tester needs to know about one load, in the order they need it. */
export function TicketFacts({ ticket, headingLevel: Heading = "h2" }: { ticket: Ticket; headingLevel?: "h2" | "h3" }) {
  const { order, load } = ticket;
  return (
    <>
      <p className="text-xs text-muted-foreground">
        Ticket <span className="font-mono">#{load.ticket}</span> · load {load.index} of {order.loadsTotal} ·{" "}
        <span className="font-mono">{order.number}</span>
      </p>
      <Heading className="mt-1 text-lg leading-snug font-semibold">{order.customer}</Heading>
      <p className="mt-0.5 flex items-start gap-1.5 text-sm">
        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        {order.siteAddress}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">This load</dt>
          <dd className="font-medium">
            <span className="font-mono whitespace-nowrap tabular">{formatM3(load.volumeM3)}&nbsp;m³</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Mix</dt>
          <dd className="font-medium">
            <MixLabel label={order.mix.label} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Pour</dt>
          <dd className="font-medium">
            {order.pourType} · {order.placement}
          </dd>
        </div>
      </dl>
      {order.notes && <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-sm">{order.notes}</p>}
    </>
  );
}
