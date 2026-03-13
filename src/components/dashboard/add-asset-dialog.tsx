"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createPortfolioItem } from "@/app/actions/portfolio-items";
import type { AccountType, Currency } from "@/generated/prisma";

interface AddPortfolioItemDialogProps {
    reportId: number;
    onSuccess?: () => void;
}

export function AddAssetDialog({ reportId, onSuccess }: AddPortfolioItemDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [ticker, setTicker] = useState("");
    const [accountType, setAccountType] = useState<AccountType>("US_DIRECT");
    const [originalCurrency, setOriginalCurrency] = useState<Currency>("USD");
    const [originalAmount, setOriginalAmount] = useState("");
    const [krwAmount, setKrwAmount] = useState("");

    function resetForm() {
        setTicker("");
        setAccountType("US_DIRECT");
        setOriginalCurrency("USD");
        setOriginalAmount("");
        setKrwAmount("");
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!ticker || !originalAmount || !krwAmount) return;

        startTransition(async () => {
            await createPortfolioItem({
                reportId,
                ticker: ticker.toUpperCase(),
                accountType,
                originalCurrency,
                originalAmount: parseFloat(originalAmount),
                krwAmount: parseFloat(krwAmount),
            });
            resetForm();
            setOpen(false);
            onSuccess?.();
        });
    }

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-white transition hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
                <Plus className="h-3.5 w-3.5" />
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-base font-semibold">종목 추가</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="mt-2 space-y-4">
                    {/* Ticker */}
                    <div className="space-y-1.5">
                        <Label htmlFor="ticker" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                            종목 코드 (Ticker) *
                        </Label>
                        <Input
                            id="ticker"
                            placeholder="AAPL, 005930, NVDA..."
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value.toUpperCase())}
                            className="font-mono uppercase"
                            required
                        />
                    </div>

                    {/* 계좌 유형 */}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">계좌 유형</Label>
                        <Select value={accountType} onValueChange={(v) => v && setAccountType(v as AccountType)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="US_DIRECT">미국 직투 (US_DIRECT)</SelectItem>
                                <SelectItem value="ISA">한국 ISA</SelectItem>
                                <SelectItem value="JP_DIRECT">일본 직투 (JP_DIRECT)</SelectItem>
                                <SelectItem value="CASH">현금성 (CASH)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        {/* 원래 통화 */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">통화</Label>
                            <Select value={originalCurrency} onValueChange={(v) => v && setOriginalCurrency(v as Currency)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD (달러)</SelectItem>
                                    <SelectItem value="KRW">KRW (원화)</SelectItem>
                                    <SelectItem value="JPY">JPY (엔화)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* 원래 통화 금액 */}
                        <div className="space-y-1.5">
                            <Label htmlFor="originalAmount" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                                원화폐 평가금 *
                            </Label>
                            <Input
                                id="originalAmount"
                                type="number"
                                min="0"
                                step="any"
                                placeholder="10000"
                                value={originalAmount}
                                onChange={(e) => setOriginalAmount(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* 원화 환산 금액 */}
                    <div className="space-y-1.5">
                        <Label htmlFor="krwAmount" className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                            원화 환산 평가금 (₩) *
                        </Label>
                        <Input
                            id="krwAmount"
                            type="number"
                            min="0"
                            step="any"
                            placeholder="13500000"
                            value={krwAmount}
                            onChange={(e) => setKrwAmount(e.target.value)}
                            required
                        />
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="ghost" onClick={() => { setOpen(false); resetForm(); }}>
                            취소
                        </Button>
                        <Button type="submit" disabled={isPending || !ticker || !originalAmount || !krwAmount}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            추가하기
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
