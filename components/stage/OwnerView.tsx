"use client";

import { stage } from "../../lib/stage/store";
import { Wallet } from "lucide-react";
import { shortKey } from "../../shared/encoding";
import { WRITER_ADDRESS } from "../../shared/arkiv/profiles";

export function OwnerView({ transferred, count }: { transferred: boolean; count: number }) {
  return <section className="owner-view">{!transferred && <><div className="owner-badge"><Wallet aria-hidden="true" /><div>santiago<small>{shortKey(WRITER_ADDRESS)}</small></div></div><div className="owner-panel panel"><button disabled={!count} onClick={() => stage.dispatch({ type: "transfer" })}>Transfer ownership <kbd>T</kbd></button><p className="owner-demo-label">Demo view · app-side</p></div></>}<p className="owner-small-print"><b>Demo view</b> In your app: changeOwnership for each entity, or one executeBatch. The creator still says santiago: history doesn’t change.</p></section>;
}
