import { useEffect } from "react";

let lockCount = 0;
let savedOverflow = "";

/** 모달·드로어 등 열릴 때 body 스크롤 잠금 (중첩 시 참조 카운트) */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    lockCount += 1;
    if (lockCount === 1) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        document.body.style.overflow = savedOverflow;
      }
    };
  }, [locked]);
}
