"use client";

import { useEffect, useState } from "react";
import { menuService } from "@/app/website/services/menu.service";
import type { Offer } from "@/app/website/types";

interface UseOffersResult {
  offers: Offer[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useOffers(): UseOffersResult {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setOffers(await menuService.getOffers());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);

    menuService.getOffers()
      .then((list) => {
        if (alive) setOffers(list);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { offers, loading, refresh: load };
}
