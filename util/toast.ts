import { Notice } from "obsidian";

export function toastSuccess(msg: string, timeout = 2500) {
  new Notice(`🟢 ${msg}`, timeout);
}

export function toastWarning(msg: string, timeout = 2500) {
  new Notice(`🟡 ${msg}`, timeout);
}

export function toastError(msg: string, timeout = 3500) {
  new Notice(`🔴 ${msg}`, timeout);
}
