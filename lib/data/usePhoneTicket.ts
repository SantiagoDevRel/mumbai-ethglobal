"use client";

import { useEffect, useState } from "react";
import { TicketResponse } from "../../shared/writer-api";
import { ticketPollDelay } from "./phone-ticket";
import { writerRequest, WRITER_ROUTES } from "./writer-client";
import { waitVisible } from "./visible-poll";

interface PhoneTicket {
  id: string | null;
  ticket: TicketResponse | null;
  reconnecting: boolean;
}
const EMPTY: PhoneTicket = { id: null, ticket: null, reconnecting: false };

/** Asks about the ticket only until its block is in (a few seconds), then never again. */
export function usePhoneTicket(id: string | null, device: string): PhoneTicket {
  const [snapshot, setSnapshot] = useState<PhoneTicket>(EMPTY);
  useEffect(() => {
    if (!id || !device) return;
    const controller = new AbortController();
    let failures = 0;
    const poll = async () => {
      try {
        const ticket = TicketResponse.parse(await writerRequest(WRITER_ROUTES.ticket(id), { device, signal: controller.signal }));
        if (controller.signal.aborted) return;
        if (ticket.ticket !== id) throw new Error("Mismatched ticket");
        failures = 0;
        setSnapshot({ id, ticket, reconnecting: false });
        if (ticket.status === "written" || ticket.status === "failed") return;
      } catch {
        if (controller.signal.aborted) return;
        failures++;
        setSnapshot((old) => ({ ...old, id, reconnecting: true }));
      }
      waitVisible(ticketPollDelay(failures), controller.signal).then(poll, () => undefined);
    };
    void poll();
    return () => controller.abort();
  }, [id, device]);
  return id && snapshot.id === id ? snapshot : EMPTY;
}
