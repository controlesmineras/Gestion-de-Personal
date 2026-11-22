'use client';

import {useSyncExternalStore} from 'react';
import {CircleCheck} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle} from '@/components/ui/dialog';

const receiptKey = (owner: string) => 'gestion-personal-self-meal-receipt:'+owner;
const receiptChanged = 'personal:meal-receipt';

export function recordMealReceipt(owner: string, reportId: string) {
  localStorage.setItem(receiptKey(owner), reportId);
  window.dispatchEvent(new Event(receiptChanged));
}

function subscribe(listener: () => void) {
  window.addEventListener(receiptChanged, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(receiptChanged, listener);
    window.removeEventListener('storage', listener);
  };
}

export function MealReceiptDialog({owner}: {owner: string}) {
  const key = receiptKey(owner);
  const receipt = useSyncExternalStore(subscribe, () => localStorage.getItem(key), () => null);

  function acknowledge() {
    if (localStorage.getItem(key) === receipt) localStorage.removeItem(key);
    window.dispatchEvent(new Event(receiptChanged));
  }

  return <Dialog open={!!receipt}>
    <DialogContent className="meal-receipt-dialog" showCloseButton={false} aria-describedby={undefined}
      onPointerDownOutside={event => event.preventDefault()} onEscapeKeyDown={event => event.preventDefault()}>
      <CircleCheck className="meal-receipt-check" aria-hidden="true" size={56}/>
      <DialogTitle>Recibí tu reporte de alimentos y ya está listo para que lo consulten.</DialogTitle>
      <button type="button" className="primary" onClick={acknowledge}>ENTENDIDO</button>
    </DialogContent>
  </Dialog>;
}
