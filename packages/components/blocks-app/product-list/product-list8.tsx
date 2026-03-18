"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Plus, ShoppingBag, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ControllerRenderProps, useForm } from "react-hook-form";
import z from "zod";

import { cn } from "@/lib/utils";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";

const STOCK_STATUS = {
  IN_STOCK: "IN_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
} as const;

type StockStatusCode = keyof typeof STOCK_STATUS;

type FormType = z.infer<typeof formSchema>;
type FieldName = keyof FormType;

type Option = {
  id: string;
  label: string;
  value: string;
  stockStatusCode: StockStatusCode;
  color?: string;
};

interface Hinges {
  label: string;
  id: string;
  name: FieldName;
  options?: Option[];
  min?: number;
  max?: number;
}

type HingesMap = Record<FieldName, Hinges>;

interface ProductPrice {
  regular: number;
  sale?: number;
  currency: string;
  discount?: `-${number}%`;
}

function ProductPriceDisplay({ price, currency, variant, onSale }: { price: number; currency: string; variant: "sale" | "regular"; onSale?: boolean }) {
  const formatted = new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price);
  if (variant === "sale") return <span className="text-primary font-medium">{formatted}</span>;
  return <span className={cn(onSale && "text-muted-foreground line-through text-sm")}>{formatted}</span>;
}

function Price({ onSale, children }: { onSale: boolean; children: React.ReactNode }) {
  return <div className="flex flex-wrap items-baseline gap-x-1.5">{children}</div>;
}

interface ProductFormProps {
  hinges: HingesMap;
  onOpenChange: () => void;
}

interface QuantityProps {
  field: ControllerRenderProps<FormType>;
  max?: number;
  min?: number;
}

type Image = {
  srcset?: string;
  src: string;
  sizes?: string;
  alt: string;
};

interface Product {
  link: string;
  images: [Image, Image];
  name: string;
  price: ProductPrice;
  rate: number;
  hinges?: HingesMap;
}

type ProductCardProps = Product;

interface RadioGroupProps {
  options?: Array<Option>;
  id: string;
  field: ControllerRenderProps<FormType>;
}

type ProductList = Array<Product>;

const PRODUCTS_LIST: ProductList = [
  {
    name: "Vertical striped midi dress",
    price: {
      regular: 99.0,
      sale: 79.0,
      currency: "USD",
      discount: "-20%",
    },
    rate: 5,
    link: "#",
    images: [
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555009-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555009-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555009-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555009-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555003-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555003-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555003-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555003-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
    ],
    hinges: {
      size: {
        label: "Size",
        id: "size",
        name: "size",
        options: [
          {
            id: "xs-1",
            value: "xs",
            label: "xs",
            stockStatusCode: "OUT_OF_STOCK",
          },
          {
            id: "s-1",
            value: "s",
            label: "s",
            stockStatusCode: "OUT_OF_STOCK",
          },
          {
            id: "m-1",
            value: "m",
            label: "m",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "l-1",
            value: "l",
            label: "l",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "xl-1",
            value: "xl",
            label: "xl",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "xxl-1",
            value: "xxl",
            label: "xxl",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "3xl-1",
            value: "3xl",
            label: "3xl",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "4xl-1",
            value: "4xl",
            label: "4xl",
            stockStatusCode: "IN_STOCK",
          },
        ],
      },
      color: {
        label: "Color",
        id: "color",
        name: "color",
        options: [
          {
            id: "black-1",
            label: "Black",
            value: "black",
            color: "#000000",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "blue-1",
            label: "Blue",
            value: "blue",
            color: "#607FC7",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "red-1",
            label: "Red",
            value: "red",
            color: "#97012e",
            stockStatusCode: "IN_STOCK",
          },
        ],
      },
      quantity: {
        label: "Quantity",
        id: "quantity-1",
        name: "quantity",
        min: 1,
        max: 90,
      },
    },
  },
  {
    name: "Strappy midi dress",
    price: {
      regular: 99.0,
      currency: "USD",
    },
    rate: 4.5,
    link: "#",
    images: [
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555022-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555022-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555022-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555022-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555033-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555033-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555033-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-15555033-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
    ],
    hinges: {
      size: {
        label: "Size",
        id: "size",
        name: "size",
        options: [
          {
            id: "xs-2",
            value: "xs",
            label: "xs",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "s-2",
            value: "s",
            label: "s",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "m-2",
            value: "m",
            label: "m",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "l-2",
            value: "l",
            label: "l",
            stockStatusCode: "OUT_OF_STOCK",
          },
        ],
      },
      color: {
        label: "Color",
        id: "color",
        name: "color",
        options: [
          {
            id: "black-2",
            label: "Black",
            value: "black",
            color: "#000000",
            stockStatusCode: "OUT_OF_STOCK",
          },
          {
            id: "white-2",
            label: "White",
            value: "white",
            color: "#FFFFFF",
            stockStatusCode: "IN_STOCK",
          },
        ],
      },
      quantity: {
        label: "Quantity",
        id: "quantity-2",
        name: "quantity",
        min: 1,
        max: 90,
      },
    },
  },
  {
    name: "Belted Midi Shirtdress",
    price: {
      regular: 149.0,
      currency: "USD",
    },
    rate: 4.5,
    link: "#",
    images: [
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19745200-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19745200-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19745200-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19745200-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19745178-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19745178-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19745178-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19745178-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
    ],
    hinges: {
      size: {
        label: "Size",
        id: "size",
        name: "size",
        options: [
          {
            id: "xs-3",
            value: "xs",
            label: "xs",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "s-3",
            value: "s",
            label: "s",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "m-3",
            value: "m",
            label: "m",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "l-3",
            value: "l",
            label: "l",
            stockStatusCode: "OUT_OF_STOCK",
          },
        ],
      },
      color: {
        label: "Color",
        id: "color",
        name: "color",
        options: [
          {
            id: "black-3",
            label: "Black",
            value: "black",
            color: "#000000",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "blue-3",
            label: "Blue",
            value: "blue",
            color: "#607FC7",
            stockStatusCode: "IN_STOCK",
          },
        ],
      },
      quantity: {
        label: "Quantity",
        id: "quantity-3",
        name: "quantity",
        min: 1,
        max: 90,
      },
    },
  },
  {
    name: "Long Sleeve Top",
    price: {
      regular: 49.0,
      currency: "USD",
    },
    rate: 4.5,
    link: "#",
    images: [
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881407-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881407-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881407-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881407-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881409-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881409-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881409-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881409-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
    ],
    hinges: {
      size: {
        label: "Size",
        id: "size",
        name: "size",
        options: [
          {
            id: "xs-4",
            value: "xs",
            label: "xs",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "s-4",
            value: "s",
            label: "s",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "m-4",
            value: "m",
            label: "m",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "l-4",
            value: "l",
            label: "l",
            stockStatusCode: "OUT_OF_STOCK",
          },
        ],
      },
      color: {
        label: "Color",
        id: "color",
        name: "color",
        options: [
          {
            id: "pink-4",
            label: "Pink",
            value: "pink",
            color: "#F1E1E1",
            stockStatusCode: "IN_STOCK",
          },
        ],
      },
      quantity: {
        label: "Quantity",
        id: "quantity-4",
        name: "quantity",
        min: 1,
        max: 90,
      },
    },
  },
  {
    name: "Long Sleeve Top",
    price: {
      regular: 49.0,
      currency: "USD",
    },
    rate: 4.5,
    link: "#",
    images: [
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881457-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881457-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881457-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881457-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881454-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881454-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881454-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-19881454-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
    ],
    hinges: {
      size: {
        label: "Size",
        id: "size",
        name: "size",
        options: [
          {
            id: "xs-5",
            value: "xs",
            label: "xs",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "s-5",
            value: "s",
            label: "s",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "m-5",
            value: "m",
            label: "m",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "l-5",
            value: "l",
            label: "l",
            stockStatusCode: "OUT_OF_STOCK",
          },
        ],
      },
      color: {
        label: "Color",
        id: "color",
        name: "color",
        options: [
          {
            id: "black-5",
            label: "Black",
            value: "black",
            color: "#000000",
            stockStatusCode: "OUT_OF_STOCK",
          },
          {
            id: "white-5",
            label: "White",
            value: "white",
            color: "#FFFFFF",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "pink-5",
            label: "Pink",
            value: "pink",
            color: "#F1E1E1",
            stockStatusCode: "IN_STOCK",
          },
        ],
      },
      quantity: {
        label: "Quantity",
        id: "quantity-5",
        name: "quantity",
        min: 1,
        max: 90,
      },
    },
  },
  {
    name: "Belted Midi Shirtdress",
    price: {
      regular: 99.0,
      currency: "USD",
    },
    rate: 4.5,
    link: "#",
    images: [
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851438-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851438-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851438-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851438-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851442-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851442-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851442-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851442-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
    ],
    hinges: {
      size: {
        label: "Size",
        id: "size",
        name: "size",
        options: [
          {
            id: "xs-6",
            value: "xs",
            label: "xs",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "s-6",
            value: "s",
            label: "s",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "m-6",
            value: "m",
            label: "m",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "l-6",
            value: "l",
            label: "l",
            stockStatusCode: "OUT_OF_STOCK",
          },
        ],
      },
      color: {
        label: "Color",
        id: "color",
        name: "color",
        options: [
          {
            id: "beige-6",
            label: "Beige",
            value: "beige",
            color: "#EDE8EC",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "white-6",
            label: "White",
            value: "white",
            color: "#FFFFFF",
            stockStatusCode: "IN_STOCK",
          },
        ],
      },
      quantity: {
        label: "Quantity",
        id: "quantity-6",
        name: "quantity",
        min: 1,
        max: 90,
      },
    },
  },
  {
    name: "Trench Coat",
    price: {
      regular: 199.0,
      sale: 99.0,
      discount: "-50%",
      currency: "USD",
    },
    rate: 4.5,
    link: "#",
    images: [
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851622-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851622-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851622-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851622-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851458-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851458-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851458-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-429124762-20851458-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
    ],
    hinges: {
      size: {
        label: "Size",
        id: "size",
        name: "size",
        options: [
          {
            id: "xs-7",
            value: "xs",
            label: "xs",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "s-7",
            value: "s",
            label: "s",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "m-7",
            value: "m",
            label: "m",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "l-7",
            value: "l",
            label: "l",
            stockStatusCode: "OUT_OF_STOCK",
          },
        ],
      },
      color: {
        label: "Color",
        id: "color",
        name: "color",
        options: [
          {
            id: "black-7",
            label: "Black",
            value: "black",
            color: "#000000",
            stockStatusCode: "IN_STOCK",
          },
          {
            id: "beige-7",
            label: "Beige",
            value: "beige",
            color: "#EDE8EC",
            stockStatusCode: "IN_STOCK",
          },
        ],
      },
      quantity: {
        label: "Quantity",
        id: "quantity-7",
        name: "quantity",
        min: 1,
        max: 90,
      },
    },
  },
  {
    name: "Faux Leather Mini Bag",
    price: {
      regular: 99.0,
      currency: "USD",
    },
    rate: 4.5,
    link: "#",
    images: [
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-dhanno-22432995-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-dhanno-22432995-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-dhanno-22432995-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-dhanno-22432995-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
      {
        src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-dhanno-22432980-2.jpg",
        srcset:
          "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-dhanno-22432980-3.jpg 1920w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-dhanno-22432980-2.jpg 1280w, https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/pexels-dhanno-22432980-1.jpg 640w",
        alt: "",
        sizes: "(min-width: 1920px) 1920px, (min-width: 1280px) 1280px, 100vw",
      },
    ],
  },
];

interface ProductList8Props {
  className?: string;
}

const ProductList8 = ({ className }: ProductList8Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="grid grid-cols-1 gap-px sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {PRODUCTS_LIST.map((item, index) => (
          <ProductCard key={`product-list-8-card-${index}`} {...item} />
        ))}
      </div>
    </section>
  );
};

const ProductCard = ({
  link,
  images,
  name,
  price,
  rate,
  hinges,
}: ProductCardProps) => {
  const [open, setOpen] = useState(false);
  const { regular, sale, currency } = price;

  const onOpenChange = () => {
    if (hinges) {
      setOpen(!open);
    }
  };

  return (
    <Card className="group relative block rounded-none border-none py-5 shadow-none ring ring-border">
      <a href={link} className="absolute inset-0 z-50 size-full"></a>
      <CardContent>
        <div className="relative overflow-hidden">
          <AspectRatio
            ratio={0.833342901}
            className="overflow-hidden rounded-[1.25rem]"
          >
            {images.map((img, index) => (
              <div
                className="absolute inset-0 size-full transition-opacity duration-350 first:z-20 group-hover:first:opacity-0 last:z-10 first:[&>img]:scale-110 first:[&>img]:delay-50 group-hover:first:[&>img]:scale-100 last:[&>img]:scale-110 group-hover:last:[&>img]:scale-100"
                key={`product-list-8-card-img-${index}`}
              >
                <img
                  src={img.src}
                  srcSet={img.srcset}
                  alt={img.alt}
                  sizes={img.sizes}
                  className="block size-full object-cover object-center transition-transform duration-350"
                />
              </div>
            ))}
          </AspectRatio>
          <Badge
            variant="outline"
            className="absolute start-4 top-4 z-30 rounded-full bg-background font-bold opacity-0 transition-opacity duration-350 group-hover:opacity-100"
          >
            <Star className="fill-inherit" />
            {rate}
          </Badge>
          {price.discount && (
            <Badge
              variant="outline"
              className="absolute end-4 top-4 z-30 rounded-full bg-background font-bold text-red-600 transition-opacity duration-350"
            >
              {price.discount}
            </Badge>
          )}
          <Button
            size="icon"
            onClick={onOpenChange}
            className="absolute end-4 bottom-4 z-60 rounded-full lg:translate-y-[calc(100%+1rem)] lg:group-hover:translate-y-0"
          >
            <ShoppingBag />
          </Button>
        </div>
        <div className="space-y-0.5 pt-3.5">
          <CardTitle className="leading-relaxed">{name}</CardTitle>
          <Price onSale={sale != null}>
            {sale != null && <ProductPriceDisplay price={sale} currency={currency} variant="sale" />}
            <ProductPriceDisplay price={regular} currency={currency} variant="regular" onSale={sale != null} />
          </Price>
        </div>
      </CardContent>
      {hinges && (
        <Collapsible open={open} onOpenChange={onOpenChange}>
          <CollapsibleContent className="absolute inset-0 z-70 size-full bg-background">
            <ProductForm onOpenChange={onOpenChange} hinges={hinges} />
          </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  );
};

const formSchema = z.object({
  size: z.string(),
  color: z.string(),
  quantity: z.number(),
});

const ProductForm = ({ onOpenChange, hinges }: ProductFormProps) => {
  const form = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      color: "",
      size: "",
      quantity: 1,
    },
  });

  function onSubmit(values: FormType) {
    console.log(values);
  }

  const sizeHinges = hinges?.size;
  const colorHinges = hinges?.color;
  const quantityHinges = hinges?.quantity;

  const currentColorId = form.watch("color");
  const currentColor = useMemo(
    () =>
      colorHinges?.options?.find((item) => item.value === currentColorId)
        ?.label ?? "",
    [currentColorId, colorHinges],
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="h-full">
        <div className="relative h-full">
          <ScrollArea className="h-full pb-30 lg:pb-17">
            <div className="flex size-full flex-col gap-6">
              <div className="relative space-y-5 p-4">
                <Button
                  size="icon"
                  variant="ghost"
                  type="button"
                  onClick={onOpenChange}
                  className="absolute end-2 top-2 rounded-full"
                >
                  <X />
                </Button>
                {sizeHinges && (
                  <FormField
                    control={form.control}
                    name={sizeHinges.name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-base leading-normal font-bold"
                          asChild
                        >
                          <h2>{sizeHinges.label}</h2>
                        </FormLabel>
                        <FormControl>
                          <div className="relative -mr-4 overflow-hidden after:pointer-events-none after:absolute after:end-0 after:top-0 after:block after:h-full after:w-10.5 after:bg-gradient-to-r after:from-transparent after:to-background after:content-['']">
                            <SizeRadioGroup
                              field={field}
                              options={sizeHinges.options}
                              id={sizeHinges.id}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
                {colorHinges && (
                  <FormField
                    control={form.control}
                    name={colorHinges.name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel
                          className="text-base leading-normal font-bold"
                          asChild
                        >
                          <h2>{colorHinges.label}</h2>
                        </FormLabel>
                        <FormControl>
                          <ColorRadioGroup
                            field={field}
                            options={colorHinges.options}
                            id={colorHinges.id}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          {currentColor
                            ? currentColor
                            : `${colorHinges.options?.length} colors available`}
                        </p>
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>
          </ScrollArea>
          <div className="absolute inset-x-0 bottom-0">
            <div className="flex flex-col items-center gap-4 bg-background p-4 lg:flex-row">
              {quantityHinges && (
                <FormField
                  control={form.control}
                  name={quantityHinges.name}
                  render={({ field }) => (
                    <FormItem className="self-stretch">
                      <FormControl>
                        <Quantity
                          field={field}
                          min={quantityHinges?.min}
                          max={quantityHinges?.max}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}
              <div className="flex-1 self-stretch">
                <Button
                  disabled={!form.getValues("color") && !form.getValues("size")}
                  className="w-full rounded-full"
                >
                  Add to cart
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
};

const SizeRadioGroup = ({ options, id, field }: RadioGroupProps) => {
  if (!options) return;

  return (
    <RadioGroup
      {...field}
      value={`${field.value}`}
      id={id}
      onValueChange={(value) => {
        if (value != field.value && value) {
          field.onChange(value);
        }
      }}
      className="flex w-full items-center gap-2 overflow-x-auto p-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((item, index) => (
        <FormItem
          className="shrink-0 last:pr-14.5"
          key={`product-list-8-size-${index}`}
        >
          <FormLabel
            htmlFor={item.id}
            className="h-9 cursor-pointer overflow-hidden rounded-full border px-4.5 py-3 text-center leading-none font-normal uppercase ring-primary duration-400 not-has-disabled:hover:ring-1 has-checked:ring has-checked:hover:ring has-disabled:opacity-25"
          >
            <RadioGroupItem
              id={item.id}
              className="sr-only"
              value={item.value}
              aria-label={`Select ${item.label}`}
              disabled={item.stockStatusCode === STOCK_STATUS.OUT_OF_STOCK}
            />
            {item.label}
          </FormLabel>
        </FormItem>
      ))}
    </RadioGroup>
  );
};

const ColorRadioGroup = ({ options, id, field }: RadioGroupProps) => {
  if (!options) return;

  return (
    <RadioGroup
      {...field}
      value={`${field.value}`}
      id={id}
      onValueChange={(value) => {
        if (value != field.value && value) {
          field.onChange(value);
        }
      }}
      className="flex w-full flex-wrap items-center gap-2 overflow-x-auto p-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((item, index) => (
        <FormItem key={`product-list-8-color-${index}`}>
          <FormLabel
            htmlFor={item.id}
            className="relative flex size-9 cursor-pointer overflow-hidden rounded-full border ring-primary duration-400 not-has-disabled:hover:ring has-checked:ring has-disabled:opacity-25"
          >
            <RadioGroupItem
              id={item.id}
              className="sr-only"
              value={item.value}
              aria-label={`Select ${item.label}`}
              disabled={item.stockStatusCode === STOCK_STATUS.OUT_OF_STOCK}
            />
            <div
              style={{
                backgroundColor: item.color,
              }}
              className="m-auto size-7.5 rounded-full"
            ></div>
            {item.stockStatusCode === STOCK_STATUS.OUT_OF_STOCK && (
              <span className="absolute top-0 bottom-0 left-1/2 z-10 block h-full w-0 rotate-45 border-l"></span>
            )}
          </FormLabel>
        </FormItem>
      ))}
    </RadioGroup>
  );
};

const Quantity = ({ field, max, min }: QuantityProps) => {
  return (
    <div
      className="flex h-9 w-full min-w-34 items-center overflow-hidden rounded-full border shadow-xs"
      aria-label="quantity"
    >
      <Button
        onClick={() =>
          field.onChange(Math.max(min || 1, Number(field.value || 1) - 1))
        }
        variant="ghost"
        type="button"
        size="icon"
        className="shrink-0 rounded-none"
      >
        <Minus />
      </Button>
      <Input
        {...field}
        value={field.value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          const parsed = parseInt(raw, 10);

          // Accept empty string for typing, but validate if not a number
          if (raw === "") {
            field.onChange("");
          } else if (!isNaN(parsed)) {
            field.onChange(parsed);
          }
        }}
        type="number"
        min={Math.max(min ?? 1, 1)}
        max={max ?? 99}
        className="h-full w-full min-w-10 flex-1 [appearance:textfield] rounded-none border-0 px-1 text-center shadow-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Button
        onClick={() =>
          field.onChange(Math.min(max || 99, Number(field.value || 1) + 1))
        }
        variant="ghost"
        type="button"
        size="icon"
        className="shrink-0 rounded-none"
      >
        <Plus />
      </Button>
    </div>
  );
};

export { ProductList8 };
