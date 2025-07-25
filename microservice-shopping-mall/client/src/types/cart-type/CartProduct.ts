// types/CartProduct.ts
export interface CartProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrls: string[];
  category: {
    id: string;
    name: string;
    slug: string;
  };
  brand: string;
  sku: string;
  slug: string;
  inventory: {
    availableQuantity: number;
    status: 'in_stock' | 'out_of_stock';
  };
}
