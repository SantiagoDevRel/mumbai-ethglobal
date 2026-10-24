"use client";

import { useEffect, useState } from "react";
import { TicketResponse } from "../../shared/writer-api";
import { advanceTicketClock, ticketBlock, ticketPollDelay, type TicketClock } from "./phone-ticket";
import { writerRequest, WRITER_ROUTES } from "./writer-client";

interface PhoneTicket {
  id: string | null;
  ticket: TicketResponse | null;
  clock: TicketClock | null;
  reconnecting: boolean;
  extended: boolean;
}
const EMPTY: PhoneTicket = { id: null, ticket: null, clock: null, reconnecting: false, extended: false };

/** One serial writer-only poller survives the queued -> written transition. */
export function usePhoneTicket(id: string | null, device: string): PhoneTicket {
  const [snapshot, setSnapshot] = useState<PhoneTicket>(EMPTY);
  useEffect(() => {
    if (!id || !device) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let current: PhoneTicket = { ...EMPTY, id };
    let failures = 0;
    let written = false;
    const poll = async () => {
      try {
        const ticket = TicketResponse.parse(await writerRequest(WRITER_ROUTES.ticket(id), { device, signal: controller.signal }));
        if (controller.signal.aborted) return;
        if (ticket.ticket !== id) throw new Error("Mismatched ticket");
        const clock = advanceTicketClock(ticket, current.clock, Date.now());
        const expiry = ticketBlock(ticket.expiresAtBlock), previous = ticketBlock(current.ticket?.expiresAtBlock);
        const block = ticketBlock(ticket.currentBlock);
        current = current.clock && block !== null && block < current.clock.block ? { ...current, reconnecting: false }
          : { id, ticket, clock, reconnecting: false, extended: current.extended || (expiry !== null && previous !== null && expiry > previous) };
        written ||= ticket.status === "written";
        failures = 0;
        setSnapshot(current);
        if (ticket.status === "failed") return;
      } catch {
        if (controller.signal.aborted) return;
        failures++;
        current = { ...current, reconnecting: true };
        setSnapshot(current);
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, ticketPollDelay(written, failures));
    };
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [id, device]);
  return id && snapshot.id === id ? snapshot : EMPTY;
}
