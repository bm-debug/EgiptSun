"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Helper function for month word declension
function getMonthWord(months: number): string {
  const lastDigit = months % 10;
  const lastTwoDigits = months % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return "месяцев";
  }

  if (lastDigit === 1) {
    return "месяц";
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return "месяца";
  }

  return "месяцев";
}

// Price presets
const PRICE_PRESETS = [
  { label: "10k", value: 10000 },
  { label: "30k", value: 30000 },
  { label: "50k", value: 50000 },
  { label: "100k", value: 100000 },
  { label: "200k", value: 200000 },
];

const MIN_PRICE = 3000;
const MAX_PRICE = 300000;

export default function InstallmentCalculator() {
  const [mounted, setMounted] = React.useState(false);
  const [productPrice, setProductPrice] = React.useState<string>("50000");
  const [term, setTerm] = React.useState<number[]>([6]);
  const [priceError, setPriceError] = React.useState<string | null>(null);
  const [isPriceFocused, setIsPriceFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Clamp price to valid range
  const clampPrice = (value: number): number => {
    return Math.max(MIN_PRICE, Math.min(MAX_PRICE, value));
  };

  // Format price input (remove non-digits, clamp)
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const cursorPosition = input.selectionStart || 0;
    
    // Remove all spaces and non-digits to get raw number
    const rawValue = input.value.replace(/\s/g, "").replace(/\D/g, "");
    
    // Calculate new cursor position after formatting
    // Count digits before cursor in original value
    const beforeCursor = input.value.substring(0, cursorPosition);
    const digitsBeforeCursor = beforeCursor.replace(/\s/g, "").replace(/\D/g, "").length;
    
    setProductPrice(rawValue);
    
    // Restore cursor position after formatting
    if (rawValue) {
      setTimeout(() => {
        if (inputRef.current && isPriceFocused) {
          const formatted = parseFloat(rawValue).toLocaleString("ru-RU");
          // Find position in formatted string that corresponds to digitsBeforeCursor
          let newPosition = 0;
          let digitCount = 0;
          for (let i = 0; i < formatted.length && digitCount < digitsBeforeCursor; i++) {
            if (/\d/.test(formatted[i])) {
              digitCount++;
            }
            newPosition = i + 1;
          }
          inputRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    }
    
    if (rawValue) {
      const numValue = parseFloat(rawValue);
      if (numValue < MIN_PRICE) {
        setPriceError(`Минимальная сумма: ${MIN_PRICE.toLocaleString("ru-RU")} ₽`);
      } else if (numValue > MAX_PRICE) {
        setPriceError(`Максимальная сумма: ${MAX_PRICE.toLocaleString("ru-RU")} ₽`);
      } else {
        setPriceError(null);
      }
    } else {
      setPriceError(null);
    }
  };

  // Clamp price on blur
  const handlePriceBlur = () => {
    setIsPriceFocused(false);
    if (productPrice) {
      const numValue = parseFloat(productPrice);
      if (!isNaN(numValue)) {
        const clamped = clampPrice(numValue);
        setProductPrice(clamped.toString());
        setPriceError(null);
      }
    }
  };

  // Handle focus
  const handlePriceFocus = () => {
    setIsPriceFocused(true);
  };

  // Get display value for price input - always show formatted with spaces
  const getPriceDisplayValue = () => {
    if (!productPrice) return "";
    const numValue = parseFloat(productPrice);
    if (isNaN(numValue)) return productPrice;
    // Always show formatted value with spaces (e.g., "123 000")
    return numValue.toLocaleString("ru-RU");
  };

  // Handle preset click
  const handlePresetClick = (value: number) => {
    setProductPrice(value.toString());
    setPriceError(null);
  };

  const price = parseFloat(productPrice) || 0;
  const months = term[0] || 6;
  const monthlyPayment = price > 0 && months > 0 ? Math.round(price / months) : 0;
  const isValidPrice = price >= MIN_PRICE && price <= MAX_PRICE;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Build URL with parameters
  const buildApplicationUrl = () => {
    const params = new URLSearchParams();
    if (isValidPrice && productPrice) {
      params.set("productPrice", productPrice);
    }
    if (months) {
      params.set("term", months.toString());
    }
    const queryString = params.toString();
    return `/consumers${queryString ? `?${queryString}` : ""}#application`;
  };

  if (!mounted) {
    return (
      <section className="py-16 md:py-32">
        <div className="mx-auto max-w-5xl px-6">
          <Card>
            <CardHeader>
              <CardTitle>Рассчитайте вашу рассрочку</CardTitle>
              <CardDescription>Узнайте ежемесячный платеж за 30 секунд</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="productPrice">Стоимость товара</Label>
                <div className="h-10 rounded-md border bg-muted/20 animate-pulse" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Срок</Label>
                  <span className="text-sm font-medium">6 месяцев</span>
                </div>
                <div className="h-2 rounded-full bg-muted/20 animate-pulse" />
              </div>
              <div className="rounded-lg border bg-muted/50 p-6">
                <p className="text-sm text-muted-foreground mb-2">Ежемесячный платеж:</p>
                <div className="h-10 w-32 bg-muted/20 rounded animate-pulse" />
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" size="lg">
                <Link href="/consumers">Подать заявку</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <Card>
          <CardHeader>
            <CardTitle>Рассчитайте вашу рассрочку</CardTitle>
            <CardDescription>Узнайте ежемесячный платеж за 30 секунд</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="productPrice">Стоимость товара</Label>
                <span className="text-xs text-muted-foreground">
                  от {MIN_PRICE.toLocaleString("ru-RU")} до {MAX_PRICE.toLocaleString("ru-RU")} ₽
                </span>
              </div>
              <Input
                ref={inputRef}
                id="productPrice"
                type="text"
                inputMode="numeric"
                placeholder="Например: 50000"
                value={getPriceDisplayValue()}
                onChange={handlePriceChange}
                onFocus={handlePriceFocus}
                onBlur={handlePriceBlur}
                className={priceError ? "border-destructive" : ""}
                aria-invalid={!!priceError}
                aria-describedby={priceError ? "price-error" : undefined}
              />
              {priceError && (
                <p id="price-error" className="text-xs text-destructive">
                  {priceError}
                </p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {PRICE_PRESETS.map((preset) => (
                  <Button
                    key={preset.value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetClick(preset.value)}
                    className="text-xs"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="term">Срок</Label>
                <span className="text-sm font-medium">
                  {months} {getMonthWord(months)}
                </span>
              </div>
              <Slider
                id="term"
                min={3}
                max={24}
                step={1}
                value={term}
                onValueChange={setTerm}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>3 {getMonthWord(3)}</span>
                <span>24 {getMonthWord(24)}</span>
              </div>
            </div>

            {monthlyPayment > 0 && isValidPrice && (
              <div className="rounded-lg border bg-muted/50 p-6 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Ежемесячный платеж:</p>
                  <p className="text-4xl font-bold">{formatCurrency(monthlyPayment)}</p>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Сумма к выплате:</p>
                  <p className="text-2xl font-semibold">{formatCurrency(price)}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Расчёт предварительный
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button asChild className="w-full" size="lg">
              <Link href={buildApplicationUrl()}>Продолжить / Подать заявку</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full" size="sm">
              <Link href="/consumers#conditions">Посмотреть условия</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  );
}

