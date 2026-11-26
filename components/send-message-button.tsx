"use client";

import { Send } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SendMessageButton() {
  const { pending } = useFormStatus();

  return <button className="button" type="submit" disabled={pending}>
    <Send size={16} aria-hidden="true" />
    <span aria-live="polite">{pending ? "Sending…" : "Send message"}</span>
  </button>;
}
